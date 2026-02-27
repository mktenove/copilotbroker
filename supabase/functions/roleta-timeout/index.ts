import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, maskPhone } from "../_shared/security.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find leads with expired reservations
    const now = new Date().toISOString();
    const { data: expiredLeads, error } = await supabase
      .from("leads")
      .select("id, roleta_id, corretor_atribuido_id, project_id, name, whatsapp")
      .lte("reserva_expira_em", now)
      .is("atendimento_iniciado_em", null)
      .neq("status", "inactive")
      .in("status_distribuicao", ["atribuicao_inicial", "reassinado_timeout"]);

    if (error) throw error;

    if (!expiredLeads || expiredLeads.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum lead expirado", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load global WhatsApp config once
    const { data: globalConfig } = await supabase
      .from("global_whatsapp_config")
      .select("instance_name, instance_token, status")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const envUrl = Deno.env.get("UAZAPI_INSTANCE_URL") || "";
    let baseUrl = "";
    try {
      baseUrl = new URL(envUrl).origin;
    } catch {
      baseUrl = envUrl.replace(/\/[^\/]+\/?$/, "");
    }

    // Helper: check if current time (Brasilia UTC-3) is within pause window
    function isInPauseWindow(pausaInicio: string | null, pausaFim: string | null): boolean {
      if (!pausaInicio || !pausaFim) return false;
      const now = new Date();
      // Convert to Brasilia time (UTC-3)
      const brasiliaOffset = -3 * 60;
      const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
      const brasiliaTime = new Date(utcMs + brasiliaOffset * 60000);
      const currentMinutes = brasiliaTime.getHours() * 60 + brasiliaTime.getMinutes();

      const [startH, startM] = pausaInicio.split(":").map(Number);
      const [endH, endM] = pausaFim.split(":").map(Number);
      const startMinutes = startH * 60 + (startM || 0);
      const endMinutes = endH * 60 + (endM || 0);

      if (startMinutes > endMinutes) {
        // Crosses midnight (e.g. 21:00 - 09:00)
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
      } else {
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
      }
    }

    console.log(`Processing ${expiredLeads.length} expired leads`);
    let processed = 0;
    let skippedPause = 0;

    for (const lead of expiredLeads) {
      if (!lead.roleta_id) continue;

      // Get roleta
      const { data: roleta } = await supabase
        .from("roletas")
        .select("*")
        .eq("id", lead.roleta_id)
        .eq("ativa", true)
        .single();

      if (!roleta) continue;

      // Check if we're in the pause window
      if (isInPauseWindow(roleta.timeout_pausa_inicio, roleta.timeout_pausa_fim)) {
        console.log(`Roleta ${roleta.nome}: timeout pausado (${roleta.timeout_pausa_inicio}-${roleta.timeout_pausa_fim})`);
        skippedPause++;
        continue;
      }

      // Get active members (excluding current assignee)
      const { data: membros } = await supabase
        .from("roletas_membros")
        .select("id, corretor_id, ordem")
        .eq("roleta_id", lead.roleta_id)
        .eq("ativo", true)
        .eq("status_checkin", true)
        .neq("corretor_id", lead.corretor_atribuido_id)
        .order("ordem", { ascending: true });

      const activeMembros = membros || [];
      let newBrokerId: string;
      let statusDistribuicao: string;
      let motivo: string;
      let novaOrdem: number;

      if (activeMembros.length === 0) {
        newBrokerId = roleta.lider_id;
        statusDistribuicao = "fallback_lider";
        motivo = "Timeout - nenhum outro corretor online - atribuído ao líder";
        novaOrdem = roleta.ultimo_membro_ordem_atribuida;
      } else {
        const lastOrder = roleta.ultimo_membro_ordem_atribuida;
        let nextMembro = activeMembros.find((m: any) => m.ordem > lastOrder);
        if (!nextMembro) nextMembro = activeMembros[0];

        newBrokerId = nextMembro.corretor_id;
        statusDistribuicao = "reassinado_timeout";
        motivo = `Timeout de ${roleta.tempo_reserva_minutos}min - reassinado para ordem ${nextMembro.ordem}`;
        novaOrdem = nextMembro.ordem;
      }

      const newExpira = new Date(Date.now() + roleta.tempo_reserva_minutos * 60 * 1000);

      // Update lead
      await supabase
        .from("leads")
        .update({
          broker_id: newBrokerId,
          corretor_atribuido_id: newBrokerId,
          atribuido_em: new Date().toISOString(),
          reserva_expira_em: statusDistribuicao === "fallback_lider" ? null : newExpira.toISOString(),
          status_distribuicao: statusDistribuicao,
          motivo_atribuicao: motivo,
        })
        .eq("id", lead.id);

      // Update roleta pointer
      await supabase
        .from("roletas")
        .update({ ultimo_membro_ordem_atribuida: novaOrdem })
        .eq("id", lead.roleta_id);

      // Log
      await supabase.from("roletas_log").insert({
        roleta_id: lead.roleta_id,
        lead_id: lead.id,
        acao: statusDistribuicao === "fallback_lider" ? "timeout_fallback_lider" : "timeout_reassinado",
        de_corretor_id: lead.corretor_atribuido_id,
        para_corretor_id: newBrokerId,
        motivo,
      });

      // Get broker names for timeline
      const { data: deBroker } = await supabase
        .from("brokers")
        .select("name")
        .eq("id", lead.corretor_atribuido_id)
        .single();
      const { data: paraBroker } = await supabase
        .from("brokers")
        .select("name")
        .eq("id", newBrokerId)
        .single();

      // Register in lead timeline
      await supabase.from("lead_interactions").insert({
        lead_id: lead.id,
        interaction_type: statusDistribuicao === "fallback_lider" ? "roleta_fallback" : "roleta_timeout",
        notes: `Timeout de ${roleta.tempo_reserva_minutos}min. Transferido de ${deBroker?.name || "corretor anterior"} para ${paraBroker?.name || "novo corretor"}.`,
      });

      // Notify new broker (in-app)
      const { data: brokerData } = await supabase
        .from("brokers")
        .select("user_id, whatsapp")
        .eq("id", newBrokerId)
        .single();

      if (brokerData?.user_id) {
        await supabase.from("notifications").insert({
          user_id: brokerData.user_id,
          type: "roleta_timeout",
          title: "Lead Reassinado (Timeout)",
          message: `Lead ${lead.name} foi reassinado a você por timeout.`,
          lead_id: lead.id,
        });
      }

      // Notify new broker via WhatsApp (timeout = always hide lead data)
      if (globalConfig?.instance_token && brokerData?.whatsapp && baseUrl) {
        try {
          const cleanPhone = brokerData.whatsapp.replace(/\D/g, "");

          // Get project name
          let projectName = "Empreendimento";
          if (lead.project_id) {
            const { data: proj } = await supabase
              .from("projects")
              .select("name")
              .eq("id", lead.project_id)
              .single();
            if (proj) projectName = proj.name;
          }

          const message = `🔄 *Lead reassinado por timeout*\n\n📋 *${projectName}*\n\n⚡ Acesse o CRM para ver os dados e iniciar o atendimento.\n⏱️ Tempo para atendimento: ${roleta.tempo_reserva_minutos} min`;

          const resp = await fetch(`${baseUrl}/send/text`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "token": globalConfig.instance_token,
            },
            body: JSON.stringify({
              number: cleanPhone,
              text: message,
            }),
          });

          console.log(`WhatsApp timeout notification to ${maskPhone(cleanPhone)}: ${resp.status}`);
        } catch (whatsappErr) {
          console.error("WhatsApp timeout notification failed (non-critical):", whatsappErr);
        }
      }

      processed++;
    }

    return new Response(JSON.stringify({ success: true, processed, skippedPause }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in roleta-timeout:", error);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

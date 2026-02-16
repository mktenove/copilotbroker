import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
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

    console.log(`Processing ${expiredLeads.length} expired leads`);
    let processed = 0;

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

          console.log(`WhatsApp timeout notification to ${cleanPhone}: ${resp.status}`);
        } catch (whatsappErr) {
          console.error("WhatsApp timeout notification failed (non-critical):", whatsappErr);
        }
      }

      processed++;
    }

    return new Response(JSON.stringify({ success: true, processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in roleta-timeout:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

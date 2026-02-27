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

    const { lead_id, project_id } = await req.json();

    if (!lead_id || !project_id) {
      return new Response(JSON.stringify({ error: "lead_id e project_id são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Find active roleta for this project
    const { data: reData, error: reError } = await supabase
      .from("roletas_empreendimentos")
      .select("roleta_id")
      .eq("empreendimento_id", project_id)
      .eq("ativo", true)
      .limit(1)
      .maybeSingle();

    if (reError || !reData) {
      console.log("No active roleta for project:", project_id);
      return new Response(JSON.stringify({ message: "Sem roleta ativa para este empreendimento" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const roletaId = reData.roleta_id;

    // 2. Get roleta
    const { data: roleta, error: roletaError } = await supabase
      .from("roletas")
      .select("*")
      .eq("id", roletaId)
      .eq("ativa", true)
      .single();

    if (roletaError || !roleta) {
      console.log("Roleta not found or inactive:", roletaId);
      return new Response(JSON.stringify({ message: "Roleta não encontrada ou inativa" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const timeoutAtivo = roleta.timeout_ativo ?? true;

    // 3. Get active members with checkin
    const { data: membros } = await supabase
      .from("roletas_membros")
      .select("id, corretor_id, ordem")
      .eq("roleta_id", roletaId)
      .eq("ativo", true)
      .eq("status_checkin", true)
      .order("ordem", { ascending: true });

    const activeMembros = membros || [];
    let assignedBrokerId: string;
    let statusDistribuicao: string;
    let motivo: string;
    let novaOrdem: number;

    if (activeMembros.length === 0) {
      assignedBrokerId = roleta.lider_id;
      statusDistribuicao = "fallback_lider";
      motivo = "Nenhum corretor online - atribuído ao líder";
      novaOrdem = roleta.ultimo_membro_ordem_atribuida;
      console.log("Fallback to leader:", assignedBrokerId);
    } else {
      const lastOrder = roleta.ultimo_membro_ordem_atribuida;
      let nextMembro = activeMembros.find(m => m.ordem > lastOrder);
      if (!nextMembro) {
        nextMembro = activeMembros[0];
      }

      assignedBrokerId = nextMembro.corretor_id;
      statusDistribuicao = "atribuicao_inicial";
      motivo = `Round-robin - ordem ${nextMembro.ordem}`;
      novaOrdem = nextMembro.ordem;
      console.log("Round-robin assigned to broker:", assignedBrokerId, "ordem:", novaOrdem);
    }

    const now = new Date();
    // Only set expiration if timeout is active and not fallback
    const shouldSetExpiration = timeoutAtivo && statusDistribuicao !== "fallback_lider";
    const reservaExpira = shouldSetExpiration
      ? new Date(now.getTime() + roleta.tempo_reserva_minutos * 60 * 1000)
      : null;

    // 4. Update lead
    const { error: updateLeadError } = await supabase
      .from("leads")
      .update({
        broker_id: assignedBrokerId,
        roleta_id: roletaId,
        corretor_atribuido_id: assignedBrokerId,
        atribuido_em: now.toISOString(),
        reserva_expira_em: reservaExpira ? reservaExpira.toISOString() : null,
        status_distribuicao: statusDistribuicao,
        motivo_atribuicao: motivo,
      })
      .eq("id", lead_id);

    if (updateLeadError) {
      console.error("Error updating lead:", updateLeadError);
      throw updateLeadError;
    }

    // 5. Update roleta pointer
    await supabase
      .from("roletas")
      .update({ ultimo_membro_ordem_atribuida: novaOrdem })
      .eq("id", roletaId);

    // 6. Log
    await supabase.from("roletas_log").insert({
      roleta_id: roletaId,
      lead_id: lead_id,
      acao: statusDistribuicao === "fallback_lider" ? "fallback_lider" : "atribuicao_inicial",
      para_corretor_id: assignedBrokerId,
      motivo: motivo,
    });

    // 6b. Register in lead timeline
    const { data: assignedBroker } = await supabase
      .from("brokers")
      .select("name")
      .eq("id", assignedBrokerId)
      .single();

    await supabase.from("lead_interactions").insert({
      lead_id: lead_id,
      interaction_type: statusDistribuicao === "fallback_lider" ? "roleta_fallback" : "roleta_atribuicao",
      notes: `Atribuído via roleta para ${assignedBroker?.name || "corretor"}. ${motivo}`,
    });

    // 7. Create notification for the assigned broker
    const { data: brokerData } = await supabase
      .from("brokers")
      .select("user_id, whatsapp")
      .eq("id", assignedBrokerId)
      .single();

    const { data: leadData } = await supabase
      .from("leads")
      .select("name, whatsapp")
      .eq("id", lead_id)
      .single();

    const { data: projectData } = await supabase
      .from("projects")
      .select("name")
      .eq("id", project_id)
      .single();

    if (brokerData?.user_id && leadData) {
      await supabase.from("notifications").insert({
        user_id: brokerData.user_id,
        type: "roleta_lead",
        title: "Novo Lead via Roleta",
        message: `Lead ${leadData.name} do ${projectData?.name || "empreendimento"} atribuído a você.`,
        lead_id: lead_id,
      });
    }

    // 8. WhatsApp notification via global instance
    try {
      const { data: globalConfig } = await supabase
        .from("global_whatsapp_config")
        .select("instance_name, instance_token, status")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (globalConfig?.instance_token && brokerData?.whatsapp && leadData) {
        const envUrl = Deno.env.get("UAZAPI_INSTANCE_URL") || "";
        let baseUrl: string;
        try {
          baseUrl = new URL(envUrl).origin;
        } catch {
          baseUrl = envUrl.replace(/\/[^\/]+\/?$/, "");
        }

        if (baseUrl) {
          const cleanBrokerPhone = brokerData.whatsapp.replace(/\D/g, "");

          // Conditional message based on timeout_ativo
          let message: string;
          if (timeoutAtivo) {
            // Timeout active: hide lead data to prevent data leakage on reassignment
            message = `🔔 *Novo lead via Roleta*\n\n📋 *${projectData?.name || "Empreendimento"}*\n\n⚡ Acesse o CRM para ver os dados e iniciar o atendimento.\n⏱️ Tempo para atendimento: ${roleta.tempo_reserva_minutos} min`;
          } else {
            // No timeout: full lead data (no risk of reassignment)
            message = `🔔 *Novo lead via Roleta*\n\n📋 *${projectData?.name || "Empreendimento"}*\n👤 ${leadData.name}\n📱 ${leadData.whatsapp}\n\n⚡ Acesse o CRM para iniciar o atendimento.`;
          }

          const apiUrl = `${baseUrl}/send/text`;
          console.log("Sending WhatsApp notification to:", maskPhone(cleanBrokerPhone), "timeout_ativo:", timeoutAtivo);

          const whatsappResp = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "token": globalConfig.instance_token,
            },
            body: JSON.stringify({
              number: cleanBrokerPhone,
              text: message,
            }),
          });

          const respText = await whatsappResp.text();
          console.log(`WhatsApp response (${whatsappResp.status}):`, respText.substring(0, 300));
        }
      } else {
        console.log("WhatsApp notification skipped: no config or no broker data");
      }
    } catch (whatsappError) {
      console.error("WhatsApp notification failed (non-critical):", whatsappError);
    }

    // 9. Trigger auto-cadencia-10d (non-blocking)
    try {
      await fetch(`${supabaseUrl}/functions/v1/auto-cadencia-10d`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ leadId: lead_id }),
      });
      console.log("Auto cadencia 10D triggered for lead:", lead_id);
    } catch (cadenciaError) {
      console.error("Auto cadencia trigger failed (non-critical):", cadenciaError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      assigned_to: assignedBrokerId, 
      status: statusDistribuicao 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in roleta-distribuir:", error);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

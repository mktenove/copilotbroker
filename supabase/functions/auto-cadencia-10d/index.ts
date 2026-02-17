import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_STEPS = [
  { messageContent: "Olá {nome}, tudo bem? Aqui é {corretor_nome}, da Enove Imobiliária! Recebi agora seu cadastro para saber mais sobre o {empreendimento}, já quis te chamar para te explicar como funciona! Foi você mesmo que se cadastrou?", delayMinutes: 0, sendIfReplied: true },
  { messageContent: "Pode falar agora?", delayMinutes: 60, sendIfReplied: false },
  { messageContent: "Tentei ligar para você, mas não consegui contato, qual melhor horário para falarmos?", delayMinutes: 180, sendIfReplied: false },
  { messageContent: "Oi {nome}! Caso não esteja no momento certo, entenderei perfeitamente! Só acho que uma oportunidade dessas merece ser ouvida, caso queira fazer um bate papo sem compromisso, estarei aqui pra te ajudar.", delayMinutes: 1440, sendIfReplied: false },
  { messageContent: "Percebi que você não está podendo falar comigo agora, em virtude disso, vou finalizar esse atendimento, mas fique a vontade de me chamar quando quiser!", delayMinutes: 2880, sendIfReplied: false },
  { messageContent: "Ei! Não esqueci de ti! Lembrei de te chamar pois entrou uma condição que eu não poderia deixar de te mostrar, tem 20 minutos para uma video chamada? Prometo te apresentar algo que você nunca viu na vida!", delayMinutes: 7200, sendIfReplied: false },
  { messageContent: "Oi {nome}! Voltei porque surgiu uma condição que muda totalmente o cenário desse projeto. Não estou enviando para todos, pois recebemos pouquíssimas unidades com uma condição realmente diferenciada, você tem 10 minutos hoje para entender?", delayMinutes: 14400, sendIfReplied: false },
];

function replaceVars(text: string, vars: { nome: string; corretor_nome: string; empreendimento: string }) {
  return text
    .replace(/{nome}/g, vars.nome)
    .replace(/{corretor_nome}/g, vars.corretor_nome)
    .replace(/{empreendimento}/g, vars.empreendimento);
}

function formatPhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length === 11 || digits.length === 10) return "55" + digits;
  return digits;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { leadId } = await req.json();
    if (!leadId) {
      return new Response(JSON.stringify({ error: "leadId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch lead
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, broker_id, project_id, status, whatsapp, name")
      .eq("id", leadId)
      .single();

    if (leadError || !lead || !lead.broker_id) {
      console.log("Lead not found or no broker:", leadId);
      return new Response(JSON.stringify({ status: "skipped", reason: "lead_not_found_or_no_broker" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Check if lead was manually added or imported - skip automation
    const { data: attribution } = await supabase
      .from("lead_attribution")
      .select("landing_page")
      .eq("lead_id", leadId)
      .maybeSingle();

    const landingPage = attribution?.landing_page || "";
    if (landingPage === "admin_manual" || landingPage === "import" || landingPage === "csv_import") {
      console.log("Skipping auto-cadencia - lead is manual/imported:", landingPage);
      return new Response(JSON.stringify({ status: "skipped", reason: "manual_or_import" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Check if 1ª Mensagem automation is active for this broker+project (mutual exclusivity)
    let hasFirstMsgRule = false;
    if (lead.project_id) {
      const { data: fmRule } = await supabase
        .from("broker_auto_message_rules")
        .select("id")
        .eq("broker_id", lead.broker_id)
        .eq("is_active", true)
        .or(`project_id.eq.${lead.project_id},project_id.is.null`)
        .limit(1);
      hasFirstMsgRule = !!(fmRule && fmRule.length > 0);
    } else {
      const { data: fmRule } = await supabase
        .from("broker_auto_message_rules")
        .select("id")
        .eq("broker_id", lead.broker_id)
        .eq("is_active", true)
        .is("project_id", null)
        .limit(1);
      hasFirstMsgRule = !!(fmRule && fmRule.length > 0);
    }

    if (hasFirstMsgRule) {
      console.log("Skipping auto-cadencia - 1ª Mensagem is active for this broker+project");
      return new Response(JSON.stringify({ status: "skipped", reason: "first_message_active" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Check for active rule (project-specific first, then global)
    let rule = null;
    if (lead.project_id) {
      const { data } = await supabase
        .from("broker_auto_cadencia_rules")
        .select("*")
        .eq("broker_id", lead.broker_id)
        .eq("project_id", lead.project_id)
        .eq("is_active", true)
        .maybeSingle();
      rule = data;
    }

    if (!rule) {
      const { data } = await supabase
        .from("broker_auto_cadencia_rules")
        .select("*")
        .eq("broker_id", lead.broker_id)
        .is("project_id", null)
        .eq("is_active", true)
        .maybeSingle();
      rule = data;
    }

    if (!rule) {
      console.log("No active cadencia rule for broker:", lead.broker_id);
      return new Response(JSON.stringify({ status: "skipped", reason: "no_active_rule" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Check if lead already has active cadence
    const { data: existing } = await supabase
      .from("whatsapp_campaigns")
      .select("id")
      .eq("lead_id", leadId)
      .eq("status", "running")
      .limit(1);

    if (existing && existing.length > 0) {
      console.log("Lead already has active cadence:", leadId);
      return new Response(JSON.stringify({ status: "skipped", reason: "already_active" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Check broker WhatsApp instance
    const { data: instance } = await supabase
      .from("broker_whatsapp_instances")
      .select("id, instance_token, status")
      .eq("broker_id", lead.broker_id)
      .single();

    if (!instance || instance.status !== "connected") {
      console.log("Broker WhatsApp not connected:", lead.broker_id);
      return new Response(JSON.stringify({ status: "skipped", reason: "whatsapp_not_connected" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Get broker and project names for variable replacement
    const { data: broker } = await supabase
      .from("brokers")
      .select("name")
      .eq("id", lead.broker_id)
      .single();

    let projectName = "empreendimento";
    if (lead.project_id) {
      const { data: project } = await supabase
        .from("projects")
        .select("name")
        .eq("id", lead.project_id)
        .single();
      if (project) projectName = project.name;
    }

    const vars = {
      nome: lead.name.split(" ")[0],
      corretor_nome: broker?.name?.split(" ")[0] || "Corretor",
      empreendimento: projectName,
    };

    // 6. Create campaign
    const { data: campaign, error: campErr } = await supabase
      .from("whatsapp_campaigns")
      .insert({
        broker_id: lead.broker_id,
        name: `Cadência 10D Auto - ${lead.name}`,
        status: "running",
        total_leads: DEFAULT_STEPS.length,
        lead_id: leadId,
        project_id: lead.project_id,
      })
      .select()
      .single();

    if (campErr) throw campErr;

    // 7. Insert steps
    const stepsToInsert = DEFAULT_STEPS.map((step, i) => ({
      campaign_id: campaign.id,
      step_order: i + 1,
      message_content: step.messageContent,
      delay_minutes: i === 0 ? 0 : step.delayMinutes,
      send_if_replied: i === 0 ? true : step.sendIfReplied,
    }));

    await supabase.from("campaign_steps").insert(stepsToInsert);

    // 8. Schedule messages in queue
    const phone = formatPhoneE164(lead.whatsapp);
    let scheduledTime = new Date(Date.now() + Math.floor(Math.random() * 30 + 15) * 1000);

    const queueItems = DEFAULT_STEPS.map((step, i) => {
      if (i > 0) {
        scheduledTime = new Date(
          scheduledTime.getTime() + step.delayMinutes * 60 * 1000 + Math.floor(Math.random() * 60) * 1000
        );
      }
      return {
        broker_id: lead.broker_id,
        campaign_id: campaign.id,
        lead_id: leadId,
        phone,
        message: replaceVars(step.messageContent, vars),
        status: "scheduled",
        scheduled_at: scheduledTime.toISOString(),
        step_number: i + 1,
      };
    });

    const { error: qErr } = await supabase.from("whatsapp_message_queue").insert(queueItems);
    if (qErr) throw qErr;

    // 9. Update lead status: move to Atendimento + prevent timeout
    const now = new Date().toISOString();
    await supabase.from("leads").update({
      status: "info_sent",
      atendimento_iniciado_em: now,
      status_distribuicao: "atendimento_iniciado",
      reserva_expira_em: null,
    }).eq("id", leadId);

    // 10. Register in timeline
    const stepsPreview = DEFAULT_STEPS.map((s, i) => {
      const delay = i === 0 ? "Imediato" : s.delayMinutes < 60 ? `${s.delayMinutes} min` : s.delayMinutes < 1440 ? `${s.delayMinutes / 60}h` : `${Math.floor(s.delayMinutes / 1440)} dia(s)`;
      return `Etapa ${i + 1} (${delay}): ${s.messageContent}`;
    }).join("\n");

    await supabase.from("lead_interactions").insert({
      lead_id: leadId,
      interaction_type: "atendimento_iniciado",
      old_status: lead.status,
      new_status: "info_sent",
      notes: `⚡ Cadência 10D ativada automaticamente (${DEFAULT_STEPS.length} etapas):\n\n${stepsPreview}`,
    });

    console.log("Auto cadencia 10D activated for lead:", leadId, "broker:", lead.broker_id);

    return new Response(JSON.stringify({ status: "activated", campaign_id: campaign.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in auto-cadencia-10d:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

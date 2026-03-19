import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, validateSupabaseKey } from "../_shared/security.ts";

const DEFAULT_STEPS = [
  { messageContent: "Olá {nome}, tudo bem? Aqui é {corretor_nome}, da Enove Imobiliária! Recebi agora seu cadastro para saber mais sobre o {empreendimento}, já quis te chamar para te explicar como funciona! Foi você mesmo que se cadastrou?", delayMinutes: 0, sendIfReplied: true },
  { messageContent: "Pode falar agora?", delayMinutes: 60, sendIfReplied: false },
  { messageContent: "Tentei ligar para você, mas não consegui contato, qual melhor horário para falarmos?", delayMinutes: 180, sendIfReplied: false },
  { messageContent: "Oi {nome}! Caso não esteja no momento certo, entenderei perfeitamente! Só acho que uma oportunidade dessas merece ser ouvida, caso queira fazer um bate papo sem compromisso, estarei aqui pra te ajudar.", delayMinutes: 1440, sendIfReplied: false },
  { messageContent: "Percebi que você não está podendo falar comigo agora, em virtude disso, vou finalizar esse atendimento, mas fique a vontade de me chamar quando quiser!", delayMinutes: 2880, sendIfReplied: false },
  { messageContent: "Ei! Não esqueci de ti! Lembrei de te chamar pois entrou uma condição que eu não poderia deixar de te mostrar, tem 20 minutos para uma video chamada? Prometo te apresentar algo que você nunca viu na vida!", delayMinutes: 7200, sendIfReplied: false },
  { messageContent: "Oi {nome}! Voltei porque surgiu uma condição que muda totalmente o cenário desse projeto. Não estou enviando para todos, pois recebemos pouquíssimas unidades com uma condição realmente diferenciada, você tem 10 minutos hoje para entender?", delayMinutes: 14400, sendIfReplied: false },
];

function replaceVars(text: string, vars: { nome: string; corretor_nome: string; empreendimento: string; cidade?: string; dormitorios?: string; interesse?: string }) {
  return text
    .replace(/{nome}/g, vars.nome)
    .replace(/{corretor_nome}/g, vars.corretor_nome)
    .replace(/{empreendimento}/g, vars.empreendimento)
    .replace(/{cidade}/g, vars.cidade || "")
    .replace(/{dormitorios}/g, vars.dormitorios || "")
    .replace(/{interesse}/g, vars.interesse || "");
}

function formatPhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return "+" + digits;
  if (digits.length === 11 || digits.length === 10) return "+55" + digits;
  return "+" + digits;
}

/**
 * Adjusts a scheduled date to fit within working hours (BRT = UTC-3).
 * If outside the window, moves to the next valid start time.
 */
function adjustToWorkingHours(
  scheduledDate: Date,
  workingHoursStart: string,
  workingHoursEnd: string
): { adjusted: Date; wasAdjusted: boolean } {
  const BRT_OFFSET = -3;
  const brtTime = new Date(scheduledDate.getTime() + BRT_OFFSET * 60 * 60 * 1000);

  const [startH, startM] = workingHoursStart.split(":").map(Number);
  const [endH, endM] = workingHoursEnd.split(":").map(Number);

  const currentMinutes = brtTime.getUTCHours() * 60 + brtTime.getUTCMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // Within window — no adjustment needed
  if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
    return { adjusted: scheduledDate, wasAdjusted: false };
  }

  // Build target BRT date at start of window
  const targetBRT = new Date(brtTime);
  targetBRT.setUTCHours(startH, startM, 0, 0);

  if (currentMinutes > endMinutes) {
    // Past end — move to start of NEXT day
    targetBRT.setUTCDate(targetBRT.getUTCDate() + 1);
  }
  // If before start — targetBRT is already correct (same day)

  // Convert back to UTC
  const adjustedUTC = new Date(targetBRT.getTime() - BRT_OFFSET * 60 * 60 * 1000);
  return { adjusted: adjustedUTC, wasAdjusted: true };
}

function formatBRT(date: Date): string {
  const brt = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  const h = String(brt.getUTCHours()).padStart(2, "0");
  const m = String(brt.getUTCMinutes()).padStart(2, "0");
  const d = String(brt.getUTCDate()).padStart(2, "0");
  const mo = String(brt.getUTCMonth() + 1).padStart(2, "0");
  return `${h}:${m} ${d}/${mo}`;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // No key validation needed: function uses service role for all DB ops.
  // JWT verification is disabled at the platform level (verify_jwt = false).

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
      .select("id, broker_id, project_id, status, whatsapp, name, interest_type, interest_city, interest_bedrooms")
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

    // 4. Check for cadencia rule (project-specific first, then global).
    //    - Rule exists + is_active = false → explicitly disabled → skip
    //    - Rule exists + is_active = true  → use configured steps
    //    - No rule at all                  → fire with DEFAULT_STEPS (implicit activation)
    let rule: any = null;
    let ruleExplicitlyDisabled = false;

    if (lead.project_id) {
      const { data } = await supabase
        .from("broker_auto_cadencia_rules")
        .select("*")
        .eq("broker_id", lead.broker_id)
        .eq("project_id", lead.project_id)
        .maybeSingle();
      if (data) {
        if (!data.is_active) ruleExplicitlyDisabled = true;
        else rule = data;
      }
    }

    if (!rule && !ruleExplicitlyDisabled) {
      const { data } = await supabase
        .from("broker_auto_cadencia_rules")
        .select("*")
        .eq("broker_id", lead.broker_id)
        .is("project_id", null)
        .maybeSingle();
      if (data) {
        if (!data.is_active) ruleExplicitlyDisabled = true;
        else rule = data;
      }
    }

    if (ruleExplicitlyDisabled) {
      console.log("Cadencia explicitly disabled for broker:", lead.broker_id);
      return new Response(JSON.stringify({ status: "skipped", reason: "explicitly_disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // rule === null here means no rule configured → proceed with DEFAULT_STEPS

    // 5. Check if lead already has active cadence
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

    // 6. Check broker WhatsApp instance (also get working hours)
    const { data: instance } = await supabase
      .from("broker_whatsapp_instances")
      .select("id, instance_token, status, working_hours_start, working_hours_end")
      .eq("broker_id", lead.broker_id)
      .single();

    if (!instance || instance.status !== "connected") {
      console.log("Broker WhatsApp not connected:", lead.broker_id);
      return new Response(JSON.stringify({ status: "skipped", reason: "whatsapp_not_connected" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const whStart = instance.working_hours_start || "09:00";
    const whEnd = instance.working_hours_end || "21:00";

    // 7. Fetch custom steps if a rule is configured, otherwise use DEFAULT_STEPS
    let stepsToUse = DEFAULT_STEPS;
    if (rule) {
      const { data: customSteps } = await supabase
        .from("auto_cadencia_steps")
        .select("*")
        .eq("rule_id", rule.id)
        .order("step_order", { ascending: true });

      if (customSteps && customSteps.length > 0) {
        stepsToUse = customSteps.map((s: any) => ({
          messageContent: s.message_content,
          delayMinutes: s.delay_minutes,
          sendIfReplied: s.send_if_replied,
        }));
      }
    }

    // 8. Get broker and project names for variable replacement
    const { data: broker } = await supabase
      .from("brokers")
      .select("name, tenant_id")
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

    const interestTypeLabel: Record<string, string> = { casa: "Casa", apartamento: "Apartamento", terreno: "Terreno", investimento: "Investimento", comercial: "Imóvel Comercial" };
    const vars = {
      nome: lead.name.split(" ")[0],
      corretor_nome: broker?.name?.split(" ")[0] || "Corretor",
      empreendimento: projectName,
      cidade: lead.interest_city || "",
      dormitorios: lead.interest_bedrooms ? String(lead.interest_bedrooms) : "",
      interesse: lead.interest_type ? (interestTypeLabel[lead.interest_type] || lead.interest_type) : "",
    };

    // 9. Create campaign
    const { data: campaign, error: campErr } = await supabase
      .from("whatsapp_campaigns")
      .insert({
        broker_id: lead.broker_id,
        tenant_id: broker?.tenant_id,
        name: `Cadência 10D Auto - ${lead.name}`,
        status: "running",
        total_leads: stepsToUse.length,
        lead_id: leadId,
        project_id: lead.project_id,
      })
      .select()
      .single();

    if (campErr) {
      // Handle unique constraint violation (concurrent creation)
      if (campErr.code === "23505") {
        console.log("Concurrent cadencia creation detected, skipping:", leadId);
        return new Response(JSON.stringify({ status: "skipped", reason: "concurrent_creation" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw campErr;
    }

    // 10. Insert steps
    const stepsToInsert = stepsToUse.map((step, i) => ({
      campaign_id: campaign.id,
      step_order: i + 1,
      message_content: step.messageContent,
      delay_minutes: i === 0 ? 0 : step.delayMinutes,
      send_if_replied: i === 0 ? true : step.sendIfReplied,
    }));

    await supabase.from("campaign_steps").insert(stepsToInsert);

    // 11. Schedule messages with working hours adjustment
    const phone = formatPhoneE164(lead.whatsapp);
    let scheduledTime = new Date(Date.now() + Math.floor(Math.random() * 30 + 15) * 1000);
    const adjustmentLogs: string[] = [];

    const queueItems = stepsToUse.map((step, i) => {
      if (i > 0) {
        scheduledTime = new Date(
          scheduledTime.getTime() + step.delayMinutes * 60 * 1000 + Math.floor(Math.random() * 60) * 1000
        );
      }

      // Apply working hours adjustment
      const originalTime = new Date(scheduledTime);
      const { adjusted, wasAdjusted } = adjustToWorkingHours(scheduledTime, whStart, whEnd);
      scheduledTime = adjusted; // Chain from adjusted time for next step

      if (wasAdjusted) {
        adjustmentLogs.push(
          `⏰ Etapa ${i + 1} reagendada: previsto ${formatBRT(originalTime)} → ajustado para ${formatBRT(adjusted)} (fora da janela permitida ${whStart}-${whEnd})`
        );
        console.log(`Adjusted step ${i + 1}: ${originalTime.toISOString()} → ${adjusted.toISOString()}`);
      }

      return {
        broker_id: lead.broker_id,
        tenant_id: broker?.tenant_id,
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

    // 12. Prevent timeout / reset distribution but keep lead in "new" (pré-atendimento).
    // The kanban card will move to "copiloto" only when the first message is actually sent.
    const now = new Date().toISOString();
    await supabase.from("leads").update({
      atendimento_iniciado_em: now,
      status_distribuicao: "atendimento_iniciado",
      reserva_expira_em: null,
    }).eq("id", leadId);

    // 13. Register in timeline
    const stepsPreview = stepsToUse.map((s, i) => {
      const delay = i === 0 ? "Imediato" : s.delayMinutes < 60 ? `${s.delayMinutes} min` : s.delayMinutes < 1440 ? `${s.delayMinutes / 60}h` : `${Math.floor(s.delayMinutes / 1440)} dia(s)`;
      return `Etapa ${i + 1} (${delay}): ${s.messageContent}`;
    }).join("\n");

    await supabase.from("lead_interactions").insert({
      lead_id: leadId,
      broker_id: lead.broker_id,
      tenant_id: broker?.tenant_id,
      interaction_type: "atendimento_iniciado",
      old_status: lead.status,
      new_status: "info_sent",
      notes: `⚡ Cadência 10D ativada automaticamente (${stepsToUse.length} etapas):\n\n${stepsPreview}`,
    });

    // 14. Log working hours adjustments if any
    if (adjustmentLogs.length > 0) {
      await supabase.from("lead_interactions").insert({
        lead_id: leadId,
        broker_id: lead.broker_id,
        tenant_id: broker?.tenant_id,
        interaction_type: "note_added",
        notes: adjustmentLogs.join("\n"),
      });
    }

    console.log("Auto cadencia 10D activated for lead:", leadId, "broker:", lead.broker_id, "adjustments:", adjustmentLogs.length);

    return new Response(JSON.stringify({ status: "activated", campaign_id: campaign.id, adjustments: adjustmentLogs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("Error in auto-cadencia-10d:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

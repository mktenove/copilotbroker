import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeadPayload {
  leadId: string;
}

interface Lead {
  id: string;
  name: string;
  whatsapp: string;
  broker_id: string | null;
  project_id: string | null;
  auto_first_message_sent: boolean;
}

interface AutoMessageRule {
  id: string;
  broker_id: string;
  project_id: string | null;
  is_active: boolean;
  message_content: string;
  delay_minutes: number;
}

interface WhatsAppInstance {
  id: string;
  broker_id: string;
  status: string;
  is_paused: boolean;
  working_hours_start: string;
  working_hours_end: string;
}

interface Broker {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

// Replace template variables
function replaceVariables(
  content: string,
  leadName: string,
  brokerName: string,
  projectName: string
): string {
  return content
    .replace(/{nome_lead}/g, leadName)
    .replace(/{nome_corretor}/g, brokerName)
    .replace(/{empreendimento}/g, projectName);
}

// Format phone to E.164
function formatPhoneE164(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("55")) return `+${cleaned}`;
  if (cleaned.length === 11 || cleaned.length === 10) return `+55${cleaned}`;
  return `+${cleaned}`;
}

// Check if current time is within working hours
function isWithinWorkingHours(startTime: string, endTime: string): boolean {
  const now = new Date();
  const brazilOffset = -3; // BRT is UTC-3
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const brazilTime = new Date(utc + 3600000 * brazilOffset);
  
  const currentHour = brazilTime.getHours();
  const currentMinute = brazilTime.getMinutes();
  const currentMinutes = currentHour * 60 + currentMinute;
  
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

// Get next working hours start time
function getNextWorkingHoursStart(startTime: string): Date {
  const now = new Date();
  const brazilOffset = -3;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const brazilTime = new Date(utc + 3600000 * brazilOffset);
  
  const [startHour, startMinute] = startTime.split(":").map(Number);
  
  // Set to today's working hours start
  const scheduledTime = new Date(brazilTime);
  scheduledTime.setHours(startHour, startMinute, 0, 0);
  
  // If already past today's start, schedule for tomorrow
  if (brazilTime >= scheduledTime) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }
  
  // Convert back to UTC for storage
  return new Date(scheduledTime.getTime() - 3600000 * brazilOffset);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { leadId }: LeadPayload = await req.json();

    if (!leadId) {
      return new Response(
        JSON.stringify({ error: "leadId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[auto-first-message] Processing lead: ${leadId}`);

    // 1. Fetch lead details
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, name, whatsapp, broker_id, project_id, auto_first_message_sent")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      console.error("[auto-first-message] Lead not found:", leadError);
      return new Response(
        JSON.stringify({ error: "Lead not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check if already sent
    if (lead.auto_first_message_sent) {
      console.log("[auto-first-message] Message already sent to this lead");
      return new Response(
        JSON.stringify({ status: "skipped", reason: "already_sent" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Check if lead has a broker
    if (!lead.broker_id) {
      console.log("[auto-first-message] Lead has no broker assigned");
      return new Response(
        JSON.stringify({ status: "skipped", reason: "no_broker" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Check lead attribution to verify it's from landing page
    const { data: attribution } = await supabase
      .from("lead_attribution")
      .select("landing_page")
      .eq("lead_id", leadId)
      .single();

    const landingPage = attribution?.landing_page || "";
    
    // Don't send if manually added or imported
    if (landingPage === "admin_manual" || landingPage === "import") {
      console.log(`[auto-first-message] Skipping - origin is ${landingPage}`);
      return new Response(
        JSON.stringify({ status: "skipped", reason: "manual_or_import" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Find active auto-message rule for this broker + project
    // First try project-specific rule, then fallback to "all projects" rule
    let rule: AutoMessageRule | null = null;

    if (lead.project_id) {
      const { data: projectRule } = await supabase
        .from("broker_auto_message_rules")
        .select("*")
        .eq("broker_id", lead.broker_id)
        .eq("project_id", lead.project_id)
        .eq("is_active", true)
        .single();
      
      rule = projectRule as AutoMessageRule | null;
    }

    if (!rule) {
      // Try "all projects" rule
      const { data: globalRule } = await supabase
        .from("broker_auto_message_rules")
        .select("*")
        .eq("broker_id", lead.broker_id)
        .is("project_id", null)
        .eq("is_active", true)
        .single();
      
      rule = globalRule as AutoMessageRule | null;
    }

    if (!rule) {
      console.log("[auto-first-message] No active rule found for this broker/project");
      return new Response(
        JSON.stringify({ status: "skipped", reason: "no_active_rule" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Check WhatsApp instance status
    const { data: instance } = await supabase
      .from("broker_whatsapp_instances")
      .select("*")
      .eq("broker_id", lead.broker_id)
      .single();

    if (!instance || instance.status !== "connected" || instance.is_paused) {
      console.log("[auto-first-message] WhatsApp instance not connected or paused");
      return new Response(
        JSON.stringify({ status: "skipped", reason: "whatsapp_not_connected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Get broker and project names for message personalization
    const { data: broker } = await supabase
      .from("brokers")
      .select("name")
      .eq("id", lead.broker_id)
      .single();

    let projectName = "o empreendimento";
    if (lead.project_id) {
      const { data: project } = await supabase
        .from("projects")
        .select("name")
        .eq("id", lead.project_id)
        .single();
      
      if (project) {
        projectName = project.name;
      }
    }

    // 8. Build personalized message
    const brokerFirstName = broker?.name?.split(" ")[0] || "Corretor";
    const leadFirstName = lead.name.split(" ")[0];
    
    const personalizedMessage = replaceVariables(
      rule.message_content,
      leadFirstName,
      brokerFirstName,
      projectName
    );

    // 9. Calculate scheduled time
    const workingHoursStart = instance.working_hours_start || "09:00:00";
    const workingHoursEnd = instance.working_hours_end || "21:00:00";
    
    let scheduledAt: Date;
    
    if (isWithinWorkingHours(workingHoursStart, workingHoursEnd)) {
      // Within working hours - schedule with delay
      scheduledAt = new Date(Date.now() + rule.delay_minutes * 60 * 1000);
    } else {
      // Outside working hours - schedule for next working hours start
      scheduledAt = getNextWorkingHoursStart(workingHoursStart);
      // Add the delay on top
      scheduledAt = new Date(scheduledAt.getTime() + rule.delay_minutes * 60 * 1000);
    }

    // 10. Insert into message queue
    const { error: queueError } = await supabase
      .from("whatsapp_message_queue")
      .insert({
        broker_id: lead.broker_id,
        lead_id: lead.id,
        phone: formatPhoneE164(lead.whatsapp),
        message: personalizedMessage,
        status: "queued",
        scheduled_at: scheduledAt.toISOString(),
      });

    if (queueError) {
      console.error("[auto-first-message] Error inserting to queue:", queueError);
      throw queueError;
    }

    // 11. Mark lead as auto_first_message_sent
    await supabase
      .from("leads")
      .update({
        auto_first_message_sent: true,
        auto_first_message_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    // 12. Log interaction
    await supabase.from("lead_interactions").insert({
      lead_id: leadId,
      broker_id: lead.broker_id,
      interaction_type: "notification",
      channel: "whatsapp",
      notes: `1ª mensagem automática agendada para ${scheduledAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}\n\n${personalizedMessage}`,
    });

    console.log(`[auto-first-message] Message queued for lead ${leadId} at ${scheduledAt.toISOString()}`);

    return new Response(
      JSON.stringify({ 
        status: "queued",
        scheduled_at: scheduledAt.toISOString(),
        delay_minutes: rule.delay_minutes,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[auto-first-message] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

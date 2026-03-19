import { Hono } from "https://deno.land/x/hono@v3.12.11/mod.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const app = new Hono().basePath("/whatsapp-webhook");

const ALLOWED_ORIGINS = ["https://onovocondominio.com.br", "https://onovocondominio.lovable.app", "https://id-preview--8855e0c5-1ec6-49e7-83f4-12e453004e21.lovable.app"];
function getDynamicCors(origin: string) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return { "Access-Control-Allow-Origin": allowed, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version" };
}
const corsHeaders = getDynamicCors(ALLOWED_ORIGINS[0]);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// ========================= TYPES =========================

interface UAZAPIv2Payload {
  EventType?: string;
  instanceName?: string;
  message?: {
    chatid?: string;
    fromMe?: boolean;
    text?: string;
    isGroup?: boolean;
    id?: string;
    timestamp?: number;
    pushName?: string;
    status?: string;
    sender_pn?: string;
  };
  event?: string;
  instance?: string;
  messages?: unknown[];
  data?: Record<string, unknown>;
  connection?: { state?: string };
}

// ========================= OPT-OUT DETECTION =========================

const OPTOUT_PHRASES = [
  "pare de enviar", "parar de enviar", "pare de mandar",
  "não quero receber", "nao quero receber",
  "não quero mais", "nao quero mais",
  "sair da lista", "me tire da lista", "me remova",
  "remover da lista", "cancelar mensagens", "cancelar envio",
  "não mande mais", "nao mande mais",
  "bloquear mensagens", "isso é spam", "isso e spam",
  "stop", "unsubscribe",
  "chega de mensagem", "chega de msg",
  "não me mande", "nao me mande",
  "pare com isso", "para com isso",
];

const OPTOUT_EXACT_WORDS = ["spam", "unsubscribe", "stop"];

function detectOptout(message: string): string | null {
  const lower = message.toLowerCase().trim();
  for (const phrase of OPTOUT_PHRASES) {
    if (lower.includes(phrase)) return phrase;
  }
  for (const word of OPTOUT_EXACT_WORDS) {
    if (lower === word) return word;
  }
  return null;
}

// ========================= PHONE UTILITIES =========================

function formatPhoneE164(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");

  if (cleaned.startsWith("55")) {
    if (cleaned.length === 12) {
      const ddd = cleaned.substring(2, 4);
      const number = cleaned.substring(4);
      return `+55${ddd}9${number}`;
    }
    return `+${cleaned}`;
  }

  if (cleaned.length === 10) {
    const ddd = cleaned.substring(0, 2);
    const number = cleaned.substring(2);
    return `+55${ddd}9${number}`;
  }
  if (cleaned.length === 11) return `+55${cleaned}`;

  return `+${cleaned}`;
}

function extractPhoneFromChatId(chatid: string): string {
  return formatPhoneE164(chatid.split("@")[0]);
}

function getPhoneVariants(phone: string): [string, string] {
  const phoneWithoutPlus = phone.startsWith("+") ? phone.substring(1) : phone;
  const phoneWithPlus = phone.startsWith("+") ? phone : "+" + phone;
  return [phoneWithPlus, phoneWithoutPlus];
}

// ========================= ERROR LOGGING =========================

async function logError(
  supabase: SupabaseClient,
  context: string,
  error: unknown,
  metadata?: Record<string, unknown>
) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`❌ [${context}]`, message, metadata || "");
  
  // Best-effort: log to whatsapp_daily_stats error_count if broker is known
  if (metadata?.broker_id) {
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data: stats } = await supabase
        .from("whatsapp_daily_stats")
        .select("id, error_count")
        .eq("broker_id", metadata.broker_id as string)
        .eq("date", today)
        .maybeSingle();
      
      if (stats) {
        await supabase
          .from("whatsapp_daily_stats")
          .update({ error_count: ((stats as { error_count: number }).error_count || 0) + 1 })
          .eq("id", (stats as { id: string }).id);
      }
    } catch {
      // Swallow - don't let error logging cause more errors
    }
  }
}

// ========================= FOLLOW-UP CANCELLATION =========================

async function cancelFollowUpsOnReply(
  supabase: SupabaseClient,
  phone: string,
  campaignIds: string[]
): Promise<void> {
  if (campaignIds.length === 0) return;
  const phoneVariants = getPhoneVariants(phone);

  for (const campaignId of campaignIds) {
    try {
      const { data: scheduledMsgs } = await supabase
        .from("whatsapp_message_queue")
        .select("id, step_number")
        .in("phone", phoneVariants)
        .eq("campaign_id", campaignId)
        .in("status", ["scheduled", "queued"])
        .gt("step_number", 1);

      if (!scheduledMsgs || scheduledMsgs.length === 0) continue;

      const stepNumbers = scheduledMsgs.map((m: { step_number: number }) => m.step_number);
      const { data: steps } = await supabase
        .from("campaign_steps")
        .select("step_order, send_if_replied")
        .eq("campaign_id", campaignId)
        .in("step_order", stepNumbers);

      if (!steps) continue;

      const cancelSteps = new Set(
        (steps as Array<{ step_order: number; send_if_replied: boolean }>)
          .filter(s => s.send_if_replied === false)
          .map(s => s.step_order)
      );

      const idsToCancel = (scheduledMsgs as Array<{ id: string; step_number: number }>)
        .filter(m => cancelSteps.has(m.step_number))
        .map(m => m.id);

      if (idsToCancel.length > 0) {
        await supabase
          .from("whatsapp_message_queue")
          .update({
            status: "cancelled",
            error_message: "Lead respondeu - follow-up cancelado",
            updated_at: new Date().toISOString()
          })
          .in("id", idsToCancel);

        console.log(`🚫 Cancelled ${idsToCancel.length} follow-ups for ${phone} (campaign ${campaignId})`);
      }
    } catch (err) {
      await logError(supabase, "cancelFollowUps", err, { phone, campaignId });
    }
  }
}

// ========================= REPLY PROCESSING =========================

async function processReply(
  supabase: SupabaseClient,
  phone: string,
  recentMessages: Array<{ campaign_id: string | null; broker_id: string }>
): Promise<void> {
  const firstMsg = recentMessages[0];
  const campaignIds = [...new Set(
    recentMessages
      .map(m => m.campaign_id)
      .filter((id): id is string => id !== null)
  )];

  // Cancel follow-ups where send_if_replied = false
  await cancelFollowUpsOnReply(supabase, phone, campaignIds);

  // Check if campaigns should be marked as completed
  for (const campaignId of campaignIds) {
    try {
      const { count } = await supabase
        .from("whatsapp_message_queue")
        .select("*", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .in("status", ["scheduled", "queued"]);

      if (count === 0) {
        await supabase
          .from("whatsapp_campaigns")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", campaignId)
          .eq("status", "running");
        console.log(`✅ Campaign ${campaignId} completed (no remaining messages after reply)`);
      }
    } catch (err) {
      await logError(supabase, "completeCampaign", err, { campaignId });
    }
  }

  // Register reply per-phone per-campaign
  for (const campaignId of campaignIds) {
    try {
      await supabase
        .from("whatsapp_lead_replies")
        .upsert(
          { phone, campaign_id: campaignId, replied_at: new Date().toISOString() },
          { onConflict: "phone,campaign_id" }
        );
    } catch (err) {
      await logError(supabase, "registerReply", err, { phone, campaignId });
    }
  }
  console.log(`📝 Registered reply for ${phone} in ${campaignIds.length} campaign(s)`);

  // Update campaign reply counts
  for (const campaignId of campaignIds) {
    try {
      const { data: campaign } = await supabase
        .from("whatsapp_campaigns")
        .select("reply_count")
        .eq("id", campaignId)
        .single();

      if (campaign) {
        await supabase
          .from("whatsapp_campaigns")
          .update({ reply_count: ((campaign as { reply_count: number }).reply_count || 0) + 1 })
          .eq("id", campaignId);
      }
    } catch (err) {
      await logError(supabase, "updateReplyCount", err, { campaignId });
    }
  }

  // Update daily stats reply_count
  try {
    const today = new Date().toISOString().split("T")[0];
    const { data: stats } = await supabase
      .from("whatsapp_daily_stats")
      .select("*")
      .eq("broker_id", firstMsg.broker_id)
      .eq("date", today)
      .maybeSingle();

    if (stats) {
      await supabase
        .from("whatsapp_daily_stats")
        .update({ reply_count: ((stats as { reply_count: number }).reply_count || 0) + 1 })
        .eq("id", (stats as { id: string }).id);
    }
  } catch (err) {
    await logError(supabase, "updateDailyReplyStats", err, { broker_id: firstMsg.broker_id });
  }

  // Move lead to "info_sent" (Atendimento) when they reply to campaign
  if (campaignIds.length > 0) {
    try {
      const { data: campaign } = await supabase
        .from("whatsapp_campaigns")
        .select("lead_id")
        .eq("id", campaignIds[0])
        .maybeSingle();

      const leadId = (campaign as { lead_id: string | null } | null)?.lead_id;
      if (leadId) {
        const { data: lead } = await supabase
          .from("leads")
          .select("status, tenant_id")
          .eq("id", leadId)
          .maybeSingle();

        const leadStatus = (lead as { status: string; tenant_id: string | null } | null)?.status;
        const tenantId = (lead as { status: string; tenant_id: string | null } | null)?.tenant_id;

        // Move to atendimento if lead is in copiloto OR still in new (msg sent but status not updated yet)
        if (leadStatus === "copiloto" || leadStatus === "new") {
          await supabase
            .from("leads")
            .update({ status: "info_sent", updated_at: new Date().toISOString() })
            .eq("id", leadId);

          await supabase.from("lead_interactions").insert({
            lead_id: leadId,
            broker_id: firstMsg.broker_id,
            tenant_id: tenantId,
            interaction_type: "status_change",
            old_status: leadStatus,
            new_status: "info_sent",
            notes: "Lead respondeu à cadência automática — movido para Atendimento",
          });

          console.log(`✅ Lead ${leadId} moved ${leadStatus} → info_sent after reply`);

          // Cancel ALL pending follow-up messages for this lead (by lead_id)
          // This is the most robust approach — doesn't depend on campaign_steps
          const { data: cancelled } = await supabase
            .from("whatsapp_message_queue")
            .update({
              status: "cancelled",
              error_message: "Lead respondeu e foi para Atendimento — follow-up cancelado",
              updated_at: new Date().toISOString(),
            })
            .eq("lead_id", leadId)
            .in("status", ["scheduled", "queued", "paused_by_system"])
            .select("id");

          if (cancelled && cancelled.length > 0) {
            console.log(`🚫 Cancelled ${cancelled.length} follow-up messages for lead ${leadId} (moved to atendimento)`);
          }

          // Mark all active campaigns for this lead as completed
          await supabase
            .from("whatsapp_campaigns")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("lead_id", leadId)
            .eq("status", "running");
        }
      }
    } catch (err) {
      await logError(supabase, "moveLeadToAtendimento", err, {});
    }
  }
}

// ========================= OPT-OUT PROCESSING =========================

async function processOptout(
  supabase: SupabaseClient,
  phone: string,
  keyword: string,
  instanceName?: string
): Promise<void> {
  console.log(`🛑 Opt-out detected from ${phone}: "${keyword}"`);
  const phoneVariants = getPhoneVariants(phone);

  try {
    await supabase
      .from("whatsapp_optouts")
      .upsert({
        phone,
        reason: `Auto-detected keyword: "${keyword}"`,
        detected_keyword: keyword,
        created_at: new Date().toISOString()
      }, { onConflict: "phone" });

    await supabase
      .from("whatsapp_message_queue")
      .update({
        status: "cancelled",
        error_message: `Opt-out: ${keyword}`,
        updated_at: new Date().toISOString()
      })
      .in("phone", phoneVariants)
      .in("status", ["queued", "scheduled"]);
  } catch (err) {
    await logError(supabase, "processOptout", err, { phone, keyword });
    return;
  }

  // Update daily stats optout_count
  if (instanceName) {
    try {
      const { data: inst } = await supabase
        .from("broker_whatsapp_instances")
        .select("broker_id")
        .eq("instance_name", instanceName)
        .maybeSingle();

      if (inst) {
        const today = new Date().toISOString().split("T")[0];
        const brokerId = (inst as { broker_id: string }).broker_id;
        const { data: stats } = await supabase
          .from("whatsapp_daily_stats")
          .select("*")
          .eq("broker_id", brokerId)
          .eq("date", today)
          .maybeSingle();

        if (stats) {
          await supabase
            .from("whatsapp_daily_stats")
            .update({ optout_count: ((stats as { optout_count: number }).optout_count || 0) + 1 })
            .eq("id", (stats as { id: string }).id);
        }
      }
    } catch (err) {
      await logError(supabase, "updateOptoutStats", err, { instanceName });
    }
  }
}

// ========================= CONVERSATION ARCHIVING =========================

async function archiveMessageToConversation(
  supabase: SupabaseClient,
  phone: string,
  messageText: string,
  direction: "inbound" | "outbound",
  instanceName?: string,
  senderName?: string,
  sentBy: string = "human",
  uazapiMessageId?: string
): Promise<void> {
  if (!instanceName) return;

  try {
    // Find broker by instance
    const { data: inst } = await supabase
      .from("broker_whatsapp_instances")
      .select("broker_id")
      .eq("instance_name", instanceName)
      .maybeSingle();

    if (!inst) return;
    const brokerId = (inst as { broker_id: string }).broker_id;
    const phoneNormalized = phone.replace(/\D/g, "");

    // Upsert conversation
    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .upsert({
        broker_id: brokerId,
        phone: phone,
        phone_normalized: phoneNormalized,
      }, { onConflict: "broker_id,phone_normalized", ignoreDuplicates: false })
      .select("id")
      .single();

    if (convError || !conv) {
      console.log("Could not upsert conversation:", convError?.message);
      return;
    }

    // Insert message
    await supabase.from("conversation_messages").insert({
      conversation_id: (conv as { id: string }).id,
      direction,
      content: messageText || "[Mídia]",
      message_type: messageText ? "text" : "media",
      sender_name: senderName,
      sent_by: sentBy,
      status: "delivered",
      uazapi_message_id: uazapiMessageId,
    });

    console.log(`📨 Archived ${direction} message to conversation ${(conv as { id: string }).id}`);
  } catch (err) {
    console.error("Error archiving message:", err);
  }
}

// ========================= UAZAPI SEND =========================

const UAZAPI_INSTANCE_URL = Deno.env.get("UAZAPI_INSTANCE_URL") || "";
const UAZAPI_TOKEN = Deno.env.get("UAZAPI_TOKEN") || "";

function formatPhoneForUAZAPI(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.startsWith("55") ? cleaned : `55${cleaned}`;
}

async function sendViaUAZAPI(
  instanceToken: string | null,
  phone: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const cleanPhone = formatPhoneForUAZAPI(phone);
  const token = instanceToken || UAZAPI_TOKEN;

  let baseUrl = UAZAPI_INSTANCE_URL.replace(/\/$/, "");
  try { baseUrl = new URL(baseUrl).origin; } catch { /* keep */ }

  const endpoints = ["/send/text", "/chat/send/text"];
  const authHeaders = [
    { token },
    { admintoken: token },
    { apikey: token },
    { "x-api-key": token },
    { Authorization: `Bearer ${token}` },
  ];

  for (const endpoint of endpoints) {
    for (const authHeader of authHeaders) {
      try {
        const res = await fetch(`${baseUrl}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify({ number: cleanPhone, text }),
        });
        if (res.status === 401 || res.status === 404) { await res.text(); continue; }
        const responseText = await res.text();
        if (!res.ok) return { success: false, error: `HTTP ${res.status}: ${responseText}` };
        let result: Record<string, unknown> = {};
        try { result = JSON.parse(responseText); } catch { /* ok */ }
        if (result.error) return { success: false, error: String(result.error) };
        const messageId = String(result.id || result.messageid || (result.key as Record<string, unknown>)?.id || "");
        return { success: true, messageId };
      } catch (err) {
        console.warn(`⚠️ Auto-send fail ${endpoint}:`, (err as Error).message);
        continue;
      }
    }
  }
  return { success: false, error: "Todos os endpoints falharam" };
}

// ========================= TYPING INDICATOR =========================

async function sendTypingPresence(
  instanceToken: string | null,
  phone: string
): Promise<void> {
  const cleanPhone = formatPhoneForUAZAPI(phone);
  const token = instanceToken || UAZAPI_TOKEN;
  let baseUrl = UAZAPI_INSTANCE_URL.replace(/\/$/, "");
  try { baseUrl = new URL(baseUrl).origin; } catch { /* keep */ }

  // Try common UAZAPI presence endpoints
  const endpoints = ["/chat/presence", "/presence"];
  for (const endpoint of endpoints) {
    try {
      await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token: token || "" },
        body: JSON.stringify({ number: cleanPhone, presence: "composing" }),
      });
      return; // sent successfully or at least attempted
    } catch { continue; }
  }
}

function calculateTypingDelay(text: string): number {
  // Average human types ~40 words/min on mobile ≈ ~200 chars/min ≈ 3.3 chars/sec
  // We simulate a fast typer: ~6 chars/sec, with min 3s and max 25s
  const chars = text.length;
  const baseDelay = Math.ceil(chars / 6) * 1000;
  return Math.max(3000, Math.min(baseDelay, 25000));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ========================= AUTO RESPONSE (AI PILOT) =========================

async function handleAutoResponse(
  supabase: SupabaseClient,
  brokerId: string,
  phone: string,
  phoneNormalized: string,
  conversationId: string,
  senderName?: string
): Promise<void> {
  // ⛔ TEMPORARIAMENTE DESATIVADO — Piloto Automático desligado
  console.log("⛔ Auto-response DISABLED (temporary kill switch)");
  return;

  try {
    // 1. Check conversation ai_mode
    const { data: conv } = await supabase
      .from("conversations")
      .select("ai_mode, lead_id, last_message_at")
      .eq("id", conversationId)
      .single();

    if (!conv || conv.ai_mode !== "ai_active") return;

    // 2. Rate limit: skip if AI sent a message < 30s ago (prevent loops)
    const { data: lastAiMsg } = await supabase
      .from("conversation_messages")
      .select("created_at")
      .eq("conversation_id", conversationId)
      .eq("direction", "outbound")
      .eq("sent_by", "ai")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastAiMsg) {
      const lastAiTime = new Date(lastAiMsg.created_at).getTime();
      if (Date.now() - lastAiTime < 30000) {
        console.log("⏳ Auto-response rate limited (< 30s since last AI message)");
        return;
      }
    }

    // 3. Check broker instance is connected
    const { data: instance } = await supabase
      .from("broker_whatsapp_instances")
      .select("instance_name, instance_token, status, working_hours_start, working_hours_end")
      .eq("broker_id", brokerId)
      .maybeSingle();

    if (!instance || instance.status !== "connected") {
      console.log("⚠️ Auto-response skipped: instance not connected");
      return;
    }

    // 4. Check working hours (UTC-3)
    if (instance.working_hours_start && instance.working_hours_end) {
      const nowBR = new Date(Date.now() - 3 * 60 * 60 * 1000);
      const hhmm = `${String(nowBR.getUTCHours()).padStart(2, "0")}:${String(nowBR.getUTCMinutes()).padStart(2, "0")}`;
      if (hhmm < instance.working_hours_start || hhmm > instance.working_hours_end) {
        console.log(`⏰ Auto-response skipped: outside working hours (${hhmm})`);
        return;
      }
    }

    // 5. Check opt-out
    const phoneVars = getPhoneVariants(phone);
    const { data: optout } = await supabase
      .from("whatsapp_optouts")
      .select("phone")
      .in("phone", phoneVars)
      .maybeSingle();

    if (optout) {
      console.log("🛑 Auto-response skipped: phone is opted out");
      return;
    }

    // 6. Get copilot config
    const { data: copilotConfig } = await supabase
      .from("copilot_configs")
      .select("*")
      .eq("broker_id", brokerId)
      .eq("is_active", true)
      .maybeSingle();

    if (!copilotConfig) {
      console.log("⚠️ Auto-response skipped: no active copilot config");
      return;
    }

    // 7. Get broker name
    const { data: broker } = await supabase
      .from("brokers")
      .select("name")
      .eq("id", brokerId)
      .maybeSingle();
    const brokerName = broker?.name || "o corretor";
    
    // Detect gender from first name (common Portuguese female name endings)
    const firstName = brokerName.split(" ")[0].toLowerCase();
    const femaleEndings = ["a", "e", "ane", "ene", "ine", "one", "une", "ely", "eli", "ali", "ele", "ile"];
    const maleExceptions = ["luca", "josue", "andre", "dante", "jorge", "felipe", "guilherme", "henrique", "vicente", "leopolde"];
    const femaleNames = ["kely", "kelly", "monique", "alice", "ines", "raquel", "mabel", "carmen", "suelen", "miriam", "lilian", "vivian", "marian", "karen", "helen"];
    
    const isFemale = femaleNames.includes(firstName) || 
      (!maleExceptions.includes(firstName) && femaleEndings.some(e => firstName.endsWith(e)));
    
    const brokerArticle = isFemale ? "a" : "o";
    const brokerArticleCap = isFemale ? "A" : "O";
    const brokerPrep = isFemale ? "da" : "do";
    const brokerPrepPro = isFemale ? "pra" : "pro";
    const brokerPronoun = isFemale ? "ela" : "ele";

    // 8. Get last 10 messages for context
    const { data: recentMsgs } = await supabase
      .from("conversation_messages")
      .select("direction, content, sent_by, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(10);

    // 9. Get lead context
    let leadContext: Record<string, string> = {};
    if (conv.lead_id) {
      const { data: lead } = await supabase
        .from("leads")
        .select("name, status, notes, project_id, lead_origin")
        .eq("id", conv.lead_id)
        .maybeSingle();

      if (lead) {
        let projectName = "";
        if (lead.project_id) {
          const { data: proj } = await supabase
            .from("projects").select("name").eq("id", lead.project_id).maybeSingle();
          projectName = proj?.name || "";
        }
        leadContext = {
          name: lead.name || senderName || "Não informado",
          status: lead.status || "Não informado",
          project: projectName || "Não informado",
          origin: lead.lead_origin || "Não informado",
          notes: lead.notes || "Nenhuma",
        };
      }
    }
    if (!leadContext.name) leadContext.name = senderName || "Lead";

    // 10. Build AI prompt
    const personalityMap: Record<string, string> = {
      formal: "Seja formal, profissional e direto ao ponto.",
      consultivo: "Seja consultivo, empático e estratégico. Guie o cliente com perguntas inteligentes.",
      agressivo: "Seja persuasivo e orientado ao fechamento. Use gatilhos mentais de urgência e escassez.",
      tecnico: "Seja técnico e informativo. Apresente dados e especificações com precisão.",
      premium: "Seja sofisticado e exclusivo. Transmita luxo e exclusividade em cada palavra.",
    };

    const personality = personalityMap[copilotConfig.personality] || personalityMap.consultivo;
    const emojiRule = copilotConfig.allow_emojis !== false ? "Use emojis com moderação para humanizar." : "Não use emojis.";

    const systemPrompt = `Você é o assistente ${brokerPrep} especialista ${brokerName}. Você ajuda ${brokerArticle} ${brokerName} respondendo leads via WhatsApp.
${personality}
${emojiRule}
Nível de persuasão: ${copilotConfig.persuasion_level || 50}/100.
Nível de objetividade: ${copilotConfig.objectivity_level || 50}/100.

REGRAS CRÍTICAS:
- Responda SEMPRE em português do Brasil
- Seja MUITO conciso: máximo 2-3 frases curtas por mensagem (estilo WhatsApp real)
- NUNCA diga que é uma IA, assistente virtual ou bot
- Fale em nome ${brokerPrep} especialista ${brokerName}, como se fosse ${brokerPronoun}
- Sempre se refira ${brokerArticle} ${brokerName} como "especialista" (ex: "${brokerArticleCap} especialista ${brokerName}")
- Use os artigos corretos: "${brokerArticle} ${brokerName}", "${brokerPrep} ${brokerName}", "${brokerPrepPro} ${brokerName}"
- Foque em avançar o lead no funil de vendas
- Se o lead demonstrar objeção, trate com empatia
- Responda de forma natural e humana, como uma conversa real de WhatsApp
- Use frases curtas e informais (como uma pessoa digitando no celular)
- NÃO envie parágrafos longos, listas ou textos formatados
${copilotConfig.use_mental_triggers ? "- Use gatilhos mentais sutis (escassez, urgência, prova social)" : ""}
${copilotConfig.incentive_visit ? "- Incentive visitas ao empreendimento quando fizer sentido" : ""}
${copilotConfig.incentive_call ? "- Sugira ligações quando o lead parecer interessado" : ""}

REGRA FUNDAMENTAL - NUNCA INVENTE INFORMAÇÕES:
- Você NÃO tem acesso a informações detalhadas do empreendimento (preços, metragem, plantas, valores de condomínio, etc.)
- Se o cliente perguntar algo que você NÃO sabe (preço, disponibilidade, detalhes técnicos, financiamento, etc.), NÃO invente
- Quando não souber a resposta, diga algo como: "Essa informação ${brokerArticle} especialista ${brokerName} pode te passar com mais detalhes! Quer agendar um bate-papo? Pode ser por ligação, videochamada ou presencial 😊"
- Sempre ofereça as 3 opções: ligação, videochamada ou presencial
- Você PODE conversar naturalmente, cumprimentar, demonstrar interesse e fazer perguntas ao lead

REGRA ABSOLUTA - NUNCA PROMETA ENVIAR ARQUIVOS:
- Você NÃO pode enviar PDFs, tabelas de preços, fotos, vídeos, documentos ou qualquer arquivo
- NUNCA diga "vou enviar", "vou mandar", "segue o PDF", "segue a tabela", "vou te passar o material"
- Se o cliente pedir um arquivo/PDF/tabela/material, responda: "Para te enviar esse material, vou pedir ${brokerPrepPro} especialista ${brokerName} te mandar diretamente! Quer agendar um bate-papo rápido com ${brokerPronoun}? Pode ser por ligação, videochamada ou presencial 😊"
- Você SÓ pode enviar texto via WhatsApp, nada mais

CONTEXTO DO LEAD:
- Nome: ${leadContext.name}
- Status no funil: ${leadContext.status || "Não informado"}
- Empreendimento: ${leadContext.project || "Não informado"}
- Origem: ${leadContext.origin || "Não informado"}
- Notas: ${leadContext.notes || "Nenhuma"}`;

    // Build messages array from conversation history
    const aiMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    if (recentMsgs && recentMsgs.length > 0) {
      const sorted = [...recentMsgs].reverse();
      for (const m of sorted) {
        aiMessages.push({
          role: m.direction === "inbound" ? "user" : "assistant",
          content: m.content || "[Mídia]",
        });
      }
    }

    // 11. Call AI Gateway (non-streaming)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("❌ Auto-response: LOVABLE_API_KEY not configured");
      return;
    }

    console.log(`🤖 Generating auto-response for conversation ${conversationId}...`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        stream: false,
        max_tokens: 200, // Keep responses short
      }),
    });

    if (!aiResponse.ok) {
      console.error(`❌ AI gateway error: ${aiResponse.status}`);
      return;
    }

    const aiData = await aiResponse.json();
    const responseText = aiData.choices?.[0]?.message?.content;

    if (!responseText || responseText.trim().length === 0) {
      console.error("❌ AI returned empty response");
      return;
    }

    // Post-generation safety: remove promises to send files
    let finalText = responseText.trim();
    const filePromisePatterns = [
      /vou (te )?(enviar|mandar|passar) (o |um |a )?(pdf|tabela|material|arquivo|documento|foto|vídeo|video|imagem|planta|book)/gi,
      /segue (o |a )?(pdf|tabela|material|arquivo|documento)/gi,
      /j[aá] te (envio|mando|passo) (o |a )?(pdf|tabela|material)/gi,
    ];
    for (const pattern of filePromisePatterns) {
      if (pattern.test(finalText)) {
        console.warn("⚠️ AI promised to send a file — replacing with fallback");
        finalText = `Para te enviar esse material, vou pedir ${brokerPrepPro} especialista ${brokerName} te mandar diretamente! Quer agendar um bate-papo rápido com ${brokerPronoun}? Pode ser por ligação, videochamada ou presencial 😊`;
        break;
      }
    }

    // 12. Simulate typing: send "composing" presence + wait proportional delay
    const typingDelay = calculateTypingDelay(finalText);
    console.log(`⌨️ Simulating typing for ${typingDelay / 1000}s (${finalText.length} chars)...`);
    
    try {
      await sendTypingPresence(instance.instance_token, phoneNormalized || phone);
    } catch { /* non-critical */ }
    
    await sleep(typingDelay);

    // 13. Send via UAZAPI
    const sendResult = await sendViaUAZAPI(
      instance.instance_token,
      phoneNormalized || phone,
      finalText
    );

    if (!sendResult.success) {
      console.error(`❌ Auto-response send failed: ${sendResult.error}`);
      return;
    }

    // 14. Save message in conversation
    await supabase.from("conversation_messages").insert({
      conversation_id: conversationId,
      direction: "outbound",
      content: finalText,
      sent_by: "ai",
      message_type: "text",
      status: "sent",
      uazapi_message_id: sendResult.messageId || null,
    });

    // 15. Register in lead_interactions
    if (conv.lead_id) {
      await supabase.from("lead_interactions").insert({
        lead_id: conv.lead_id,
        interaction_type: "whatsapp_enviada",
        broker_id: brokerId,
        notes: `[IA Auto] ${finalText.substring(0, 180)}`,
        channel: "whatsapp",
      }).catch(() => {});
    }

    // 16. Increment copilot count
    await supabase.rpc("increment_copilot_count", { _conversation_id: conversationId }).catch(() => {});

    console.log(`✅ Auto-response sent for conversation ${conversationId}: "${finalText.substring(0, 60)}..."`);

  } catch (err) {
    console.error("❌ handleAutoResponse error:", err);
  }
}

// ========================= EVENT HANDLERS =========================

async function handleIncomingMessage(
  supabase: SupabaseClient,
  payload: UAZAPIv2Payload
): Promise<Response> {
  const msg = payload.message;
  const instanceName = payload.instanceName || payload.instance;

  if (!msg) {
    console.log("No message object in payload, skipping");
    return new Response(JSON.stringify({ success: true, event: "messages", skipped: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Skip group messages
  if (msg.isGroup) {
    return new Response(JSON.stringify({ success: true, event: "messages", skipped: "group" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const chatid = msg.chatid;
  if (!chatid || chatid.includes("@g.us")) {
    return new Response(JSON.stringify({ success: true, event: "messages", skipped: "no_chatid_or_group" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Resolve phone number (LID fallback)
  let phone = extractPhoneFromChatId(chatid);
  if (chatid.includes("@lid") && msg.sender_pn) {
    phone = extractPhoneFromChatId(msg.sender_pn);
    console.log(`📱 LID fallback: chatid="${chatid}" → sender_pn="${msg.sender_pn}" → phone="${phone}"`);
  }

  const messageText = msg.text || "";
  const direction = msg.fromMe ? "outbound" : "inbound";
  console.log(`📞 ${direction} DM: chatid="${chatid}" | phone="${phone}" | text="${messageText.substring(0, 50)}"`);

  // ⛔ TEMPORARIAMENTE DESATIVADO — Arquivamento de mensagens no inbox desligado
  // await archiveMessageToConversation(
  //   supabase, phone, messageText, direction as "inbound" | "outbound",
  //   instanceName, msg.pushName, msg.fromMe ? "human" : "lead", msg.id
  // );
  console.log("⛔ Message archiving DISABLED (temporary kill switch)");

  // Skip further processing for outbound messages
  if (msg.fromMe) {
    return new Response(JSON.stringify({ success: true, event: "messages", archived: "outbound" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Find recent campaign messages for this phone
  const phoneVariants = getPhoneVariants(phone);
  const { data: recentMessages } = await supabase
    .from("whatsapp_message_queue")
    .select("campaign_id, broker_id")
    .in("phone", phoneVariants)
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(10);

  // Process reply (follow-up cancellation, stats) for both text and media
  if (recentMessages && recentMessages.length > 0) {
    await processReply(
      supabase,
      phone,
      recentMessages as Array<{ campaign_id: string | null; broker_id: string }>
    );
    console.log(`💬 Reply from ${phone} (${messageText ? "text" : "media"}) - follow-up cancellation processed`);
  }

  // If no text, we're done (media reply already processed above)
  if (!messageText) {
    console.log(`📎 Media reply from ${phone} processed (follow-ups cancelled if applicable)`);
    return new Response(JSON.stringify({ success: true, event: "messages", processed: "media_reply" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Text-based opt-out check (only if phone has campaign history)
  if (recentMessages && recentMessages.length > 0) {
    const detectedKeyword = detectOptout(messageText);
    if (detectedKeyword) {
      await processOptout(supabase, phone, detectedKeyword, instanceName);
    } else {
      console.log(`💬 Text reply from ${phone}: "${messageText.substring(0, 50)}..."`);
    }
  } else {
    console.log(`💬 Regular DM from ${phone} (no campaign history, skipping opt-out check)`);
  }

  // Trigger auto-response if ai_mode is active (fire-and-forget, don't block webhook)
  if (instanceName) {
    const { data: inst } = await supabase
      .from("broker_whatsapp_instances")
      .select("broker_id")
      .eq("instance_name", instanceName)
      .maybeSingle();

    if (inst) {
      const brokerId = (inst as { broker_id: string }).broker_id;
      const phoneNorm = phone.replace(/\D/g, "");
      
      // Find the conversation
      const { data: convForAuto } = await supabase
        .from("conversations")
        .select("id")
        .eq("broker_id", brokerId)
        .eq("phone_normalized", phoneNorm)
        .maybeSingle();

      if (convForAuto) {
        // Don't await — let it run in the background so webhook responds fast
        handleAutoResponse(supabase, brokerId, phone, phoneNorm, convForAuto.id, msg.pushName)
          .catch(err => console.error("Auto-response background error:", err));
      }
    }
  }

  return new Response(JSON.stringify({ success: true, event: "messages" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleConnectionUpdate(
  supabase: SupabaseClient,
  payload: UAZAPIv2Payload
): Promise<Response> {
  const instanceName = payload.instanceName || payload.instance;
  if (!instanceName) {
    return new Response(JSON.stringify({ success: true, event: "connection.update", skipped: "no_instance" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const state = payload.connection?.state ||
    (payload.data as Record<string, unknown>)?.status as string | undefined;

  if (state) {
    const newStatus = state === "open" ? "connected" :
                     state === "connecting" ? "connecting" :
                     state === "close" ? "disconnected" : null;

    if (newStatus) {
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      if (newStatus === "connected") {
        updateData.connected_at = new Date().toISOString();
        updateData.last_seen_at = new Date().toISOString();
      }
      if (newStatus === "disconnected") {
        updateData.connected_at = null;
      }

      const { error } = await supabase
        .from("broker_whatsapp_instances")
        .update(updateData)
        .eq("instance_name", instanceName);

      if (error) {
        await logError(supabase, "connectionUpdate", error, { instanceName });
      }

      console.log(`Instance ${instanceName} status: ${newStatus}`);
    }
  }

  return new Response(JSON.stringify({ success: true, event: "connection.update" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleMessageStatusUpdate(
  supabase: SupabaseClient,
  payload: UAZAPIv2Payload
): Promise<Response> {
  const msg = payload.message;
  if (!msg) {
    return new Response(JSON.stringify({ success: true, event: "message.update", skipped: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const messageId = msg.id;
  const status = msg.status;

  if (messageId && status) {
    const { error } = await supabase
      .from("whatsapp_message_queue")
      .update({ updated_at: new Date().toISOString() })
      .eq("uazapi_message_id", messageId);

    if (error) {
      await logError(supabase, "messageStatusUpdate", error, { messageId });
    }

    console.log(`Message ${messageId} status: ${status}`);
  }

  return new Response(JSON.stringify({ success: true, event: "message.update" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ========================= ROUTES =========================

app.options("/*", (c) => c.json({}, 200, corsHeaders));

// Shared handler for webhook POST requests
async function handleWebhookPost(c: any) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  try {
    const payload = await c.req.json() as UAZAPIv2Payload;
    console.log("Webhook received:", JSON.stringify(payload, null, 2));

    const eventType = payload.EventType || payload.event;

    // Route to appropriate handler
    if (eventType === "messages" || eventType === "messages.upsert") {
      return await handleIncomingMessage(supabase, payload);
    }

    if (eventType === "connection" || eventType === "connection.update") {
      return await handleConnectionUpdate(supabase, payload);
    }

    if (eventType === "messages_update" || eventType === "message.update") {
      return await handleMessageStatusUpdate(supabase, payload);
    }

    // Unknown event
    console.log(`Unknown event: ${eventType}`);
    return c.json({ success: true, message: "Event received", event: eventType }, 200, corsHeaders);

  } catch (err) {
    await logError(supabase, "webhookMain", err);
    const error = err as Error;
    return c.json({ success: false, error: error.message }, 200, corsHeaders);
  }
}

// Route with path token validation (preferred)
app.post("/:token", async (c) => {
  const webhookSecret = Deno.env.get("UAZAPI_WEBHOOK_SECRET");
  if (webhookSecret) {
    const provided = c.req.param("token");
    if (provided !== webhookSecret) {
      console.warn("🚫 Webhook rejected: invalid path token");
      return c.json({ error: "Forbidden" }, 403, corsHeaders);
    }
  }
  return handleWebhookPost(c);
});

// Legacy route (backward compatible — validates instance token from body)
app.post("/", async (c) => {
  const webhookSecret = Deno.env.get("UAZAPI_WEBHOOK_SECRET");
  
  // First check if path-level secret is provided via headers
  let headerToken = c.req.header("x-webhook-secret") || c.req.header("token");
  if (headerToken && webhookSecret && headerToken === webhookSecret) {
    return handleWebhookPost(c);
  }

  // Peek at body to get the UAZAPI instance token
  let bodyToken: string | undefined;
  try {
    const cloned = c.req.raw.clone();
    const body = await cloned.json();
    bodyToken = body?.token;
  } catch { /* ignore parse errors */ }

  // Validate: body token must match a known instance token in DB
  if (bodyToken) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: knownInstance } = await supabase
      .from("broker_whatsapp_instances")
      .select("id")
      .eq("instance_token", bodyToken)
      .maybeSingle();

    if (knownInstance) {
      return handleWebhookPost(c);
    }

    // Also check global config
    const { data: globalConfig } = await supabase
      .from("global_whatsapp_config")
      .select("id")
      .eq("instance_token", bodyToken)
      .maybeSingle();

    if (globalConfig) {
      return handleWebhookPost(c);
    }
  }

  // If webhook secret is set, reject unknown tokens
  if (webhookSecret) {
    console.warn("🚫 Webhook request rejected: unknown instance token");
    return c.json({ error: "Forbidden" }, 403, corsHeaders);
  }

  // No secret configured — allow (open mode)
  return handleWebhookPost(c);
});

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() }, 200, corsHeaders);
});

Deno.serve(app.fetch);

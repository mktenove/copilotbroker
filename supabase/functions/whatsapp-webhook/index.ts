import { Hono } from "https://deno.land/x/hono@v3.12.11/mod.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const app = new Hono().basePath("/whatsapp-webhook");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

  // Skip outgoing and group messages
  if (msg.fromMe) {
    return new Response(JSON.stringify({ success: true, event: "messages", skipped: "fromMe" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
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
  console.log(`📞 Incoming DM: chatid="${chatid}" | phone="${phone}" | text="${messageText.substring(0, 50)}"`);

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

app.post("/", async (c) => {
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
});

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() }, 200, corsHeaders);
});

Deno.serve(app.fetch);

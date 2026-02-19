import { Hono } from "https://deno.land/x/hono@v3.12.11/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const app = new Hono().basePath("/whatsapp-webhook");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Frases completas para reduzir falsos positivos
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

// Palavras que sozinhas já indicam opt-out (apenas as mais inequívocas)
const OPTOUT_EXACT_WORDS = [
  "spam", "unsubscribe", "stop",
];

const getSupabaseClient = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const detectOptout = (message: string): string | null => {
  const lower = message.toLowerCase().trim();
  
  // Primeiro: verificar frases completas
  for (const phrase of OPTOUT_PHRASES) {
    if (lower.includes(phrase)) return phrase;
  }
  
  // Segundo: verificar palavras exatas (mensagem inteira é só essa palavra)
  for (const word of OPTOUT_EXACT_WORDS) {
    if (lower === word) return word;
  }
  
  return null;
};

const formatPhoneE164 = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "");
  
  if (cleaned.startsWith("55")) {
    // 55 + DDD(2) + 8 digits = 12 digits → missing 9th digit
    if (cleaned.length === 12) {
      const ddd = cleaned.substring(2, 4);
      const number = cleaned.substring(4);
      return `+55${ddd}9${number}`;
    }
    return `+${cleaned}`;
  }
  
  // Local number: 10 digits (DDD + 8) → add 9th digit
  if (cleaned.length === 10) {
    const ddd = cleaned.substring(0, 2);
    const number = cleaned.substring(2);
    return `+55${ddd}9${number}`;
  }
  // 11 digits (DDD + 9 + 8) → already has 9th digit
  if (cleaned.length === 11) return `+55${cleaned}`;
  
  return `+${cleaned}`;
};

const extractPhoneFromChatId = (chatid: string): string => {
  const phone = chatid.split("@")[0];
  return formatPhoneE164(phone);
};

// Cancel scheduled follow-ups where send_if_replied = false
const cancelFollowUpsOnReply = async (
  supabase: ReturnType<typeof getSupabaseClient>,
  phone: string,
  campaignIds: string[]
) => {
  if (campaignIds.length === 0) return;
  // Support both formats for tolerance
  const phoneWithoutPlus = phone.startsWith("+") ? phone.substring(1) : phone;
  const phoneWithPlus = phone.startsWith("+") ? phone : "+" + phone;
  const phoneVariants = [phoneWithPlus, phoneWithoutPlus];

  for (const campaignId of campaignIds) {
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
  }
};

// --- UAZAPI v2 payload interface ---
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
  // Legacy fields (kept for backwards compat)
  event?: string;
  instance?: string;
  messages?: unknown[];
  data?: Record<string, unknown>;
  connection?: { state?: string };
}

// CORS preflight
app.options("/*", (c) => c.json({}, 200, corsHeaders));

// POST / - Main webhook endpoint
app.post("/", async (c) => {
  try {
    const supabase = getSupabaseClient();
    const payload = await c.req.json() as UAZAPIv2Payload;

    console.log("Webhook received:", JSON.stringify(payload, null, 2));

    // --- UAZAPI v2 field extraction ---
    const eventType = payload.EventType || payload.event;
    const instanceName = payload.instanceName || payload.instance;
    const msg = payload.message;

    // ==================== MESSAGES ====================
    if (eventType === "messages" || eventType === "messages.upsert") {
      if (!msg) {
        console.log("No message object in payload, skipping");
        return c.json({ success: true, event: "messages", skipped: true }, 200, corsHeaders);
      }

      // Skip outgoing and group messages
      if (msg.fromMe) {
        console.log("Skipping outgoing message (fromMe=true)");
        return c.json({ success: true, event: "messages", skipped: "fromMe" }, 200, corsHeaders);
      }
      if (msg.isGroup) {
        console.log("Skipping group message");
        return c.json({ success: true, event: "messages", skipped: "group" }, 200, corsHeaders);
      }

      const chatid = msg.chatid;
      if (!chatid) {
        console.log("No chatid in message, skipping");
        return c.json({ success: true, event: "messages", skipped: "no_chatid" }, 200, corsHeaders);
      }

      // Skip group JIDs just in case isGroup wasn't set
      if (chatid.includes("@g.us")) {
        console.log("Skipping group JID");
        return c.json({ success: true, event: "messages", skipped: "group_jid" }, 200, corsHeaders);
      }

      let phone = extractPhoneFromChatId(chatid);
      
      // Fallback: if chatid is in LID format, use sender_pn for real phone number
      if (chatid.includes("@lid") && msg.sender_pn) {
        const fallbackPhone = extractPhoneFromChatId(msg.sender_pn);
        console.log(`📱 LID fallback: chatid="${chatid}" → sender_pn="${msg.sender_pn}" → phone="${fallbackPhone}"`);
        phone = fallbackPhone;
      }
      
      const messageText = msg.text || "";
      console.log(`📞 Incoming DM: chatid="${chatid}" | phone="${phone}" | text="${messageText.substring(0, 50)}"`);

      // ===== STEP 1: ALWAYS process follow-up cancellation (text OR media) =====
      // Search with both formats (+5551... and 5551...) for tolerance
      const phoneWithoutPlus = phone.startsWith("+") ? phone.substring(1) : phone;
      const phoneWithPlus = phone.startsWith("+") ? phone : "+" + phone;

      const { data: recentMessages } = await supabase
        .from("whatsapp_message_queue")
        .select("campaign_id, broker_id")
        .in("phone", [phoneWithPlus, phoneWithoutPlus])
        .eq("status", "sent")
        .order("sent_at", { ascending: false })
        .limit(10);

      if (recentMessages && recentMessages.length > 0) {
        const firstMsg = recentMessages[0] as { campaign_id: string | null; broker_id: string };

        const campaignIds = [...new Set(
          (recentMessages as Array<{ campaign_id: string | null }>)
            .map(m => m.campaign_id)
            .filter((id): id is string => id !== null)
        )];

        // Cancel follow-ups where send_if_replied = false
        await cancelFollowUpsOnReply(supabase, phone, campaignIds);

        // Check if campaigns should be marked as completed (no remaining messages)
        for (const campaignId of campaignIds) {
          const { count } = await supabase
            .from("whatsapp_message_queue")
            .select("*", { count: "exact", head: true })
            .eq("campaign_id", campaignId)
            .in("status", ["scheduled", "queued"]);

          if (count === 0) {
            await supabase
              .from("whatsapp_campaigns")
              .update({ 
                status: "completed", 
                completed_at: new Date().toISOString() 
              })
              .eq("id", campaignId)
              .eq("status", "running");
            
            console.log(`✅ Campaign ${campaignId} completed (no remaining messages after reply)`);
          }
        }

        // Register reply permanently per-phone per-campaign
        for (const campaignId of campaignIds) {
          await supabase
            .from("whatsapp_lead_replies")
            .upsert(
              { phone, campaign_id: campaignId, replied_at: new Date().toISOString() },
              { onConflict: "phone,campaign_id" }
            );
        }
        console.log(`📝 Registered reply for ${phone} in ${campaignIds.length} campaign(s)`);

        // Update campaign reply counts
        for (const campaignId of campaignIds) {
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
        }

        // Update daily stats reply_count
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

        console.log(`💬 Reply from ${phone} (${messageText ? "text" : "media"}) - follow-up cancellation processed`);
      }

      // ===== STEP 2: If no text, we're done (media reply already processed above) =====
      if (!messageText) {
        console.log(`📎 Media reply from ${phone} processed (follow-ups cancelled if applicable)`);
        return c.json({ success: true, event: "messages", processed: "media_reply" }, 200, corsHeaders);
      }

      // ===== STEP 3: Text-based checks (opt-out) =====
      const detectedKeyword = detectOptout(messageText);

      if (detectedKeyword) {
        console.log(`🛑 Opt-out detected from ${phone}: "${detectedKeyword}"`);

        await supabase
          .from("whatsapp_optouts")
          .upsert({
            phone,
            reason: `Auto-detected keyword: "${detectedKeyword}"`,
            detected_keyword: detectedKeyword,
            created_at: new Date().toISOString()
          }, { onConflict: "phone" });

        await supabase
          .from("whatsapp_message_queue")
          .update({
            status: "cancelled",
            error_message: `Opt-out: ${detectedKeyword}`,
            updated_at: new Date().toISOString()
          })
          .in("phone", [phoneWithPlus, phoneWithoutPlus])
          .in("status", ["queued", "scheduled"]);

        // Update daily stats optout_count
        if (instanceName) {
          const { data: inst } = await supabase
            .from("broker_whatsapp_instances")
            .select("broker_id")
            .eq("instance_name", instanceName)
            .maybeSingle();

          if (inst) {
            const today = new Date().toISOString().split("T")[0];
            const { data: stats } = await supabase
              .from("whatsapp_daily_stats")
              .select("*")
              .eq("broker_id", (inst as { broker_id: string }).broker_id)
              .eq("date", today)
              .maybeSingle();

            if (stats) {
              await supabase
                .from("whatsapp_daily_stats")
                .update({ optout_count: ((stats as { optout_count: number }).optout_count || 0) + 1 })
                .eq("id", (stats as { id: string }).id);
            }
          }
        }
      } else {
        console.log(`💬 Text reply from ${phone}: "${messageText.substring(0, 50)}..."`);
      }

      return c.json({ success: true, event: "messages" }, 200, corsHeaders);
    }

    // ==================== CONNECTION ====================
    if ((eventType === "connection" || eventType === "connection.update") && instanceName) {
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

          await supabase
            .from("broker_whatsapp_instances")
            .update(updateData)
            .eq("instance_name", instanceName);

          console.log(`Instance ${instanceName} status: ${newStatus}`);
        }
      }

      return c.json({ success: true, event: "connection.update" }, 200, corsHeaders);
    }

    // ==================== MESSAGE STATUS UPDATE ====================
    if ((eventType === "messages_update" || eventType === "message.update") && msg) {
      const messageId = msg.id;
      const status = msg.status;

      if (messageId && status) {
        await supabase
          .from("whatsapp_message_queue")
          .update({ updated_at: new Date().toISOString() })
          .eq("uazapi_message_id", messageId);

        console.log(`Message ${messageId} status: ${status}`);
      }

      return c.json({ success: true, event: "message.update" }, 200, corsHeaders);
    }

    // Unknown event
    console.log(`Unknown event: ${eventType}`);
    return c.json({ success: true, message: "Event received", event: eventType }, 200, corsHeaders);

  } catch (err) {
    const error = err as Error;
    console.error("Webhook Error:", error);
    return c.json({ success: false, error: error.message }, 200, corsHeaders);
  }
});

// GET /health
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() }, 200, corsHeaders);
});

Deno.serve(app.fetch);

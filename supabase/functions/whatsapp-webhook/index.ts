import { Hono } from "https://deno.land/x/hono@v3.12.11/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const app = new Hono().basePath("/whatsapp-webhook");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuration
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Opt-out keywords (Portuguese + English)
const OPTOUT_KEYWORDS = [
  "pare", "parar", "sair", "remover", "cancelar",
  "spam", "bloquear", "não quero", "nao quero",
  "stop", "remove", "unsubscribe", "para", "chega"
];

// Get Supabase client with service role
const getSupabaseClient = () => {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
};

// Check if message contains opt-out keywords
const detectOptout = (message: string): string | null => {
  const lowerMessage = message.toLowerCase().trim();
  
  for (const keyword of OPTOUT_KEYWORDS) {
    if (lowerMessage.includes(keyword)) {
      return keyword;
    }
  }
  
  return null;
};

// Format phone to E.164
const formatPhoneE164 = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("55")) return `+${cleaned}`;
  if (cleaned.length === 11 || cleaned.length === 10) return `+55${cleaned}`;
  return `+${cleaned}`;
};

// Extract phone from WhatsApp JID (e.g., "5551999999999@s.whatsapp.net")
const extractPhoneFromJid = (jid: string): string => {
  const phone = jid.split("@")[0];
  return formatPhoneE164(phone);
};

// Interface for UAZAPI webhook events
interface UAZAPIWebhookEvent {
  event?: string;
  instance?: string;
  data?: {
    key?: {
      remoteJid?: string;
      fromMe?: boolean;
      id?: string;
    };
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text?: string;
      };
    };
    messageTimestamp?: string | number;
    status?: string;
    pushName?: string;
  };
  // Alternative format
  messages?: Array<{
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text?: string;
      };
    };
    messageTimestamp?: string | number;
    pushName?: string;
  }>;
  // Connection update format
  connection?: {
    state?: string;
  };
}

// Cancel scheduled follow-ups where send_if_replied = false
const cancelFollowUpsOnReply = async (
  supabase: ReturnType<typeof getSupabaseClient>,
  phone: string,
  campaignIds: string[]
) => {
  if (campaignIds.length === 0) return;

  for (const campaignId of campaignIds) {
    // Get scheduled messages for this phone+campaign with step_number > 1
    const { data: scheduledMsgs } = await supabase
      .from("whatsapp_message_queue")
      .select("id, step_number")
      .eq("phone", phone)
      .eq("campaign_id", campaignId)
      .in("status", ["scheduled", "queued"])
      .gt("step_number", 1);

    if (!scheduledMsgs || scheduledMsgs.length === 0) continue;

    // Get campaign steps to check send_if_replied flag
    const stepNumbers = scheduledMsgs.map((m: { step_number: number }) => m.step_number);
    const { data: steps } = await supabase
      .from("campaign_steps")
      .select("step_order, send_if_replied")
      .eq("campaign_id", campaignId)
      .in("step_order", stepNumbers);

    if (!steps) continue;

    // Build set of step_orders where send_if_replied = false
    const cancelSteps = new Set(
      (steps as Array<{ step_order: number; send_if_replied: boolean }>)
        .filter(s => s.send_if_replied === false)
        .map(s => s.step_order)
    );

    // Cancel matching messages
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

// CORS preflight
app.options("/*", (c) => {
  return c.json({}, 200, corsHeaders);
});

// POST / - Main webhook endpoint
app.post("/", async (c) => {
  try {
    const supabase = getSupabaseClient();
    const payload = await c.req.json() as UAZAPIWebhookEvent;
    
    console.log("Webhook received:", JSON.stringify(payload, null, 2));

    const eventType = payload.event;
    const instanceName = payload.instance;

    // Handle messages event (new message received) - UAZAPI uses "messages" not "messages.upsert"
    if (eventType === "messages" || eventType === "messages.upsert" || payload.messages) {
      const messages = payload.messages || (payload.data ? [payload.data] : []);
      
      for (const msg of messages) {
        // Only process incoming messages (not from us)
        if (msg.key?.fromMe) continue;
        
        const remoteJid = msg.key?.remoteJid;
        if (!remoteJid || remoteJid.includes("@g.us")) continue; // Skip group messages
        
        const phone = extractPhoneFromJid(remoteJid);
        const messageText = msg.message?.conversation || 
                           msg.message?.extendedTextMessage?.text || "";
        
        if (!messageText) continue;

        // Check for opt-out
        const detectedKeyword = detectOptout(messageText);
        
        if (detectedKeyword) {
          console.log(`Opt-out detected from ${phone}: "${detectedKeyword}"`);
          
          // Insert into optouts table
          const { error: optoutError } = await supabase
            .from("whatsapp_optouts")
            .upsert({
              phone,
              reason: `Auto-detected keyword: "${detectedKeyword}"`,
              detected_keyword: detectedKeyword,
              created_at: new Date().toISOString()
            }, { onConflict: "phone" });
          
          if (optoutError) {
            console.error("Error inserting optout:", optoutError);
          }
          
          // Cancel all pending messages for this phone
          const { error: cancelError } = await supabase
            .from("whatsapp_message_queue")
            .update({ 
              status: "cancelled",
              error_message: `Opt-out: ${detectedKeyword}`,
              updated_at: new Date().toISOString()
            })
            .eq("phone", phone)
            .in("status", ["queued", "scheduled"]);
          
          if (cancelError) {
            console.error("Error cancelling messages:", cancelError);
          }
          
          // Update daily stats - optout count
          if (instanceName) {
            const { data: instance } = await supabase
              .from("broker_whatsapp_instances")
              .select("broker_id")
              .eq("instance_name", instanceName)
              .maybeSingle();
            
            if (instance) {
              const today = new Date().toISOString().split("T")[0];
              const { data: existingStats } = await supabase
                .from("whatsapp_daily_stats")
                .select("*")
                .eq("broker_id", (instance as { broker_id: string }).broker_id)
                .eq("date", today)
                .maybeSingle();
              
              if (existingStats) {
                await supabase
                  .from("whatsapp_daily_stats")
                  .update({ 
                    optout_count: ((existingStats as { optout_count: number }).optout_count || 0) + 1 
                  })
                  .eq("id", (existingStats as { id: string }).id);
              }
            }
          }
        } else {
          // Regular reply - update reply count and cancel follow-ups
          console.log(`Reply received from ${phone}: "${messageText.substring(0, 50)}..."`);
          
          // Find recent messages sent to this phone and collect campaign_ids
          const { data: recentMessages } = await supabase
            .from("whatsapp_message_queue")
            .select("campaign_id, broker_id")
            .eq("phone", phone)
            .eq("status", "sent")
            .order("sent_at", { ascending: false })
            .limit(10);
          
          if (recentMessages && recentMessages.length > 0) {
            const firstMsg = recentMessages[0] as { campaign_id: string | null; broker_id: string };
            
            // Collect unique campaign_ids for follow-up cancellation
            const campaignIds = [...new Set(
              (recentMessages as Array<{ campaign_id: string | null }>)
                .map(m => m.campaign_id)
                .filter((id): id is string => id !== null)
            )];

            // Cancel scheduled follow-ups where send_if_replied = false
            await cancelFollowUpsOnReply(supabase, phone, campaignIds);
            
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
                  .update({ 
                    reply_count: ((campaign as { reply_count: number }).reply_count || 0) + 1 
                  })
                  .eq("id", campaignId);
              }
            }
            
            // Update daily stats - reply count
            const today = new Date().toISOString().split("T")[0];
            const { data: existingStats } = await supabase
              .from("whatsapp_daily_stats")
              .select("*")
              .eq("broker_id", firstMsg.broker_id)
              .eq("date", today)
              .maybeSingle();
            
            if (existingStats) {
              await supabase
                .from("whatsapp_daily_stats")
                .update({ 
                  reply_count: ((existingStats as { reply_count: number }).reply_count || 0) + 1 
                })
                .eq("id", (existingStats as { id: string }).id);
            }
          }
        }
      }
      
      return c.json({ success: true, event: "messages.upsert" }, 200, corsHeaders);
    }

    // Handle connection event - UAZAPI uses "connection" not "connection.update"
    if ((eventType === "connection" || eventType === "connection.update") && instanceName) {
      const state = payload.connection?.state || payload.data?.status;
      
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
          
          console.log(`Instance ${instanceName} status updated to: ${newStatus}`);
        }
      }
      
      return c.json({ success: true, event: "connection.update" }, 200, corsHeaders);
    }

    // Handle message status updates (delivered, read, etc.) - UAZAPI uses "messages_update"
    if ((eventType === "messages_update" || eventType === "message.update") && payload.data) {
      const messageId = payload.data.key?.id;
      const status = payload.data.status;
      
      if (messageId && status) {
        await supabase
          .from("whatsapp_message_queue")
          .update({ 
            updated_at: new Date().toISOString()
          })
          .eq("uazapi_message_id", messageId);
        
        console.log(`Message ${messageId} status: ${status}`);
      }
      
      return c.json({ success: true, event: "message.update" }, 200, corsHeaders);
    }

    // Unknown event - just acknowledge
    return c.json({ 
      success: true, 
      message: "Event received",
      event: eventType 
    }, 200, corsHeaders);

  } catch (err) {
    const error = err as Error;
    console.error("Webhook Error:", error);
    // Always return 200 to UAZAPI even on errors
    return c.json({ success: false, error: error.message }, 200, corsHeaders);
  }
});

// GET /health - Health check endpoint
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() }, 200, corsHeaders);
});

Deno.serve(app.fetch);

import { Hono } from "https://deno.land/x/hono@v3.12.11/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const app = new Hono();

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

    // Handle messages.upsert event (new message received)
    if (eventType === "messages.upsert" || payload.messages) {
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
          // Regular reply - update reply count
          console.log(`Reply received from ${phone}: "${messageText.substring(0, 50)}..."`);
          
          // Find recent message sent to this phone and update campaign reply count
          const { data: recentMessage } = await supabase
            .from("whatsapp_message_queue")
            .select("campaign_id, broker_id")
            .eq("phone", phone)
            .eq("status", "sent")
            .order("sent_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (recentMessage) {
            const msg = recentMessage as { campaign_id: string | null; broker_id: string };
            
            // Update campaign reply count
            if (msg.campaign_id) {
              const { data: campaign } = await supabase
                .from("whatsapp_campaigns")
                .select("reply_count")
                .eq("id", msg.campaign_id)
                .single();
              
              if (campaign) {
                await supabase
                  .from("whatsapp_campaigns")
                  .update({ 
                    reply_count: ((campaign as { reply_count: number }).reply_count || 0) + 1 
                  })
                  .eq("id", msg.campaign_id);
              }
            }
            
            // Update daily stats - reply count
            const today = new Date().toISOString().split("T")[0];
            const { data: existingStats } = await supabase
              .from("whatsapp_daily_stats")
              .select("*")
              .eq("broker_id", msg.broker_id)
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

    // Handle connection.update event
    if (eventType === "connection.update" && instanceName) {
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

    // Handle message status updates (delivered, read, etc.)
    if (eventType === "message.update" && payload.data) {
      const messageId = payload.data.key?.id;
      const status = payload.data.status;
      
      if (messageId && status) {
        // Update message status in queue if we have the UAZAPI message ID
        await supabase
          .from("whatsapp_message_queue")
          .update({ 
            updated_at: new Date().toISOString()
            // Could add delivery_status field if needed
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

import { Hono } from "https://deno.land/x/hono@v3.12.11/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const app = new Hono().basePath("/whatsapp-message-sender");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuration
const UAZAPI_BASE_URL = Deno.env.get("UAZAPI_INSTANCE_URL") || "";
const UAZAPI_TOKEN = Deno.env.get("UAZAPI_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Warmup Schedule (matches frontend)
const WARMUP_SCHEDULE: Record<number, { dailyLimit: number; hourlyLimit: number }> = {
  1: { dailyLimit: 30, hourlyLimit: 15 },
  2: { dailyLimit: 30, hourlyLimit: 15 },
  3: { dailyLimit: 30, hourlyLimit: 15 },
  4: { dailyLimit: 60, hourlyLimit: 25 },
  5: { dailyLimit: 60, hourlyLimit: 25 },
  6: { dailyLimit: 60, hourlyLimit: 25 },
  7: { dailyLimit: 60, hourlyLimit: 25 },
  8: { dailyLimit: 100, hourlyLimit: 35 },
  9: { dailyLimit: 100, hourlyLimit: 35 },
  10: { dailyLimit: 100, hourlyLimit: 35 },
  11: { dailyLimit: 150, hourlyLimit: 45 },
  12: { dailyLimit: 150, hourlyLimit: 45 },
  13: { dailyLimit: 150, hourlyLimit: 45 },
  14: { dailyLimit: 150, hourlyLimit: 45 },
};

const MAX_WARMUP_DAY = 14;
const NORMAL_DAILY_LIMIT = 250;
const NORMAL_HOURLY_LIMIT = 60;

// Get Supabase client with service role
const getSupabaseClient = () => {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
};

// Check if current time is within working hours (using BRT = UTC-3)
const isWithinWorkingHours = (startTime: string, endTime: string): boolean => {
  const now = new Date();
  // Convert UTC to BRT (UTC-3) — same logic used in auto-first-message
  const brtOffset = -3;
  const brtDate = new Date(now.getTime() + (brtOffset * 60 * 60 * 1000));
  
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);
  
  const currentMinutes = brtDate.getUTCHours() * 60 + brtDate.getUTCMinutes();
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  console.log(`⏰ BRT time: ${brtDate.getUTCHours()}:${String(brtDate.getUTCMinutes()).padStart(2, '0')} | Window: ${startTime}-${endTime}`);
  
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

// Format phone to clean number for UAZAPI
const formatPhoneForUAZAPI = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "");
  // Remove + if present
  return cleaned.startsWith("55") ? cleaned : `55${cleaned}`;
};

// Send message via UAZAPI
// Documentação oficial: POST /send/text com { number, text } e header "token"
const sendMessageViaUAZAPI = async (
  instanceName: string,
  instanceToken: string | null,
  phone: string,
  messageText: string
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const cleanPhone = formatPhoneForUAZAPI(phone);
  const token = instanceToken || UAZAPI_TOKEN;
  
  // UAZAPI v2: always use the base URL origin, instances are identified by token header
  let baseUrl = UAZAPI_BASE_URL.replace(/\/$/, "");
  try {
    const urlObj = new URL(baseUrl);
    baseUrl = urlObj.origin;
  } catch {
    // If URL parsing fails, use as-is
  }
  
  const apiUrl = `${baseUrl}/send/text`;
  console.log(`📤 Enviando para ${cleanPhone} via ${apiUrl}`);
  
  try {
    // Documentação UAZAPI: POST /send/text
    // Header: "token" (não Authorization Bearer)
    // Body: { number: "5511999999999", text: "mensagem" }
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": token,
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: messageText,
      }),
    });

    const responseText = await response.text();
    console.log(`📨 Resposta (${response.status}):`, responseText);

    if (!response.ok) {
      return { 
        success: false, 
        error: `HTTP ${response.status}: ${responseText}` 
      };
    }

    let result: Record<string, unknown> = {};
    try {
      result = JSON.parse(responseText);
    } catch {
      // Response might not be JSON
    }

    if (result.error) {
      return { success: false, error: String(result.error) };
    }

    console.log(`✅ Mensagem enviada com sucesso`);
    return { 
      success: true, 
      messageId: String(result.id || result.messageid || result.key?.id || "") 
    };
    
  } catch (err) {
    const error = err as Error;
    console.error(`❌ Erro ao enviar:`, error.message);
    return { success: false, error: error.message };
  }
};

// Interface for instance data
interface BrokerInstance {
  id: string;
  broker_id: string;
  instance_name: string;
  instance_token: string | null;
  status: string;
  is_paused: boolean;
  pause_reason: string | null;
  daily_sent_count: number;
  hourly_sent_count: number;
  daily_limit: number;
  hourly_limit: number;
  warmup_day: number;
  warmup_stage: string;
  working_hours_start: string;
  working_hours_end: string;
  connected_at: string | null;
}

interface QueueMessage {
  id: string;
  broker_id: string;
  campaign_id: string | null;
  lead_id: string | null;
  phone: string;
  message: string;
  status: string;
  scheduled_at: string;
  attempts: number;
  max_attempts: number;
}

// CORS preflight
app.options("/*", (c) => {
  return c.json({}, 200, corsHeaders);
});

// POST /process - Process queue (called by cron every minute)
app.post("/process", async (c) => {
  try {
    const supabase = getSupabaseClient();
    const results: Array<{ brokerId: string; sent: boolean; messageId?: string; error?: string }> = [];

    // Get all connected and non-paused instances
    const { data: instances, error: instancesError } = await supabase
      .from("broker_whatsapp_instances")
      .select("*")
      .eq("status", "connected")
      .eq("is_paused", false);

    if (instancesError) {
      console.error("Error fetching instances:", instancesError);
      return c.json({ error: "Failed to fetch instances" }, 500, corsHeaders);
    }

    if (!instances || instances.length === 0) {
      return c.json({ 
        success: true, 
        message: "No active instances to process",
        processed: 0 
      }, 200, corsHeaders);
    }

    // Process each instance
    for (const rawInstance of instances) {
      const instance = rawInstance as BrokerInstance;

      // Check working hours
      if (!isWithinWorkingHours(instance.working_hours_start, instance.working_hours_end)) {
        console.log(`Instance ${instance.instance_name} outside working hours, skipping`);
        continue;
      }

      // Check limits
      if (instance.hourly_sent_count >= instance.hourly_limit) {
        console.log(`Instance ${instance.instance_name} reached hourly limit, skipping`);
        continue;
      }
      if (instance.daily_sent_count >= instance.daily_limit) {
        console.log(`Instance ${instance.instance_name} reached daily limit, skipping`);
        continue;
      }

      // Get next scheduled message for this broker
      const { data: messages, error: msgError } = await supabase
        .from("whatsapp_message_queue")
        .select("*")
        .eq("broker_id", instance.broker_id)
        .in("status", ["scheduled", "queued"])
        .lte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(1);

      if (msgError || !messages || messages.length === 0) {
        continue;
      }

      const queueMsg = messages[0] as QueueMessage;

      // Check opt-out
      const { data: optout } = await supabase
        .from("whatsapp_optouts")
        .select("id")
        .eq("phone", queueMsg.phone)
        .maybeSingle();

      if (optout) {
        // Cancel message - phone opted out
        await supabase
          .from("whatsapp_message_queue")
          .update({ 
            status: "cancelled", 
            error_message: "Phone opted out",
            updated_at: new Date().toISOString()
          })
          .eq("id", queueMsg.id);
        
        results.push({ brokerId: instance.broker_id, sent: false, error: "opted_out" });
        continue;
      }

      // REPLY CHECK: For step 2+ messages, check if lead replied and send_if_replied = false
      const stepNumber = (queueMsg as Record<string, unknown>).step_number as number | null;
      if (stepNumber && stepNumber > 1 && queueMsg.campaign_id) {
        const { data: campaignStep } = await supabase
          .from("campaign_steps")
          .select("send_if_replied")
          .eq("campaign_id", queueMsg.campaign_id)
          .eq("step_order", stepNumber)
          .maybeSingle();

        if (campaignStep && (campaignStep as { send_if_replied: boolean }).send_if_replied === false) {
          // Check 1: Look for messages already cancelled by webhook due to reply
          const { data: cancelledByReply } = await supabase
            .from("whatsapp_message_queue")
            .select("id")
            .eq("phone", queueMsg.phone)
            .eq("campaign_id", queueMsg.campaign_id)
            .eq("status", "cancelled")
            .ilike("error_message", "%Lead respondeu%")
            .limit(1)
            .maybeSingle();

          if (cancelledByReply) {
            await supabase
              .from("whatsapp_message_queue")
              .update({
                status: "cancelled",
                error_message: "Lead respondeu - follow-up cancelado (verificação preventiva)",
                updated_at: new Date().toISOString()
              })
              .eq("id", queueMsg.id);

            console.log(`🚫 Preventive cancel (webhook): message ${queueMsg.id} for ${queueMsg.phone}`);
            results.push({ brokerId: instance.broker_id, sent: false, error: "reply_detected" });
            continue;
          }

          // Check 2: Per-phone per-campaign reply tracking (whatsapp_lead_replies table)
          if (queueMsg.campaign_id) {
            const { data: leadReplied } = await supabase
              .from("whatsapp_lead_replies")
              .select("phone")
              .eq("phone", queueMsg.phone)
              .eq("campaign_id", queueMsg.campaign_id)
              .maybeSingle();

            if (leadReplied) {
              await supabase
                .from("whatsapp_message_queue")
                .update({
                  status: "cancelled",
                  error_message: "Lead respondeu - follow-up cancelado (per-phone tracking)",
                  updated_at: new Date().toISOString()
                })
                .eq("id", queueMsg.id);

              console.log(`🚫 Preventive cancel (lead_replies): message ${queueMsg.id} for ${queueMsg.phone}`);
              results.push({ brokerId: instance.broker_id, sent: false, error: "reply_detected" });
              continue;
            }
          }
        }
      }

      // DEDUPLICATION: Check if already sent to this lead in last 24h
      // Skip dedup for campaign sequences (step_number present) - allow multiple steps
      if (queueMsg.lead_id && !(queueMsg as Record<string, unknown>).step_number) {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: recentMessage } = await supabase
          .from("whatsapp_message_queue")
          .select("id")
          .eq("lead_id", queueMsg.lead_id)
          .eq("status", "sent")
          .gte("sent_at", oneDayAgo)
          .neq("id", queueMsg.id)
          .is("step_number", null) // Only dedup non-sequence messages
          .maybeSingle();

        if (recentMessage) {
          // Cancel - already sent today
          await supabase
            .from("whatsapp_message_queue")
            .update({ 
              status: "cancelled", 
              error_message: "Deduplicação: já enviado nas últimas 24h",
              updated_at: new Date().toISOString()
            })
            .eq("id", queueMsg.id);
          
          console.log(`Dedup: Skipping message ${queueMsg.id} - already sent to lead ${queueMsg.lead_id} today`);
          results.push({ brokerId: instance.broker_id, sent: false, error: "deduplicated" });
          continue;
        }
      }

      // Mark as sending
      await supabase
        .from("whatsapp_message_queue")
        .update({ status: "sending", updated_at: new Date().toISOString() })
        .eq("id", queueMsg.id);

      // Send via UAZAPI
      const sendResult = await sendMessageViaUAZAPI(
        instance.instance_name,
        instance.instance_token,
        queueMsg.phone,
        queueMsg.message
      );

      if (sendResult.success) {
        // Update queue - success
        await supabase
          .from("whatsapp_message_queue")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            uazapi_message_id: sendResult.messageId,
            updated_at: new Date().toISOString()
          })
          .eq("id", queueMsg.id);

        // Increment counters
        await supabase
          .from("broker_whatsapp_instances")
          .update({
            daily_sent_count: instance.daily_sent_count + 1,
            hourly_sent_count: instance.hourly_sent_count + 1,
            last_seen_at: new Date().toISOString()
          })
          .eq("id", instance.id);

        // Register interaction if lead_id exists
        if (queueMsg.lead_id) {
          const isAutoFirstMessage = !queueMsg.campaign_id;
          const notePrefix = isAutoFirstMessage 
            ? "✅ 1ª mensagem automática enviada com sucesso" 
            : "✅ Mensagem enviada via WhatsApp";
          
          await supabase
            .from("lead_interactions")
            .insert({
              lead_id: queueMsg.lead_id,
              broker_id: instance.broker_id,
              interaction_type: "contact_attempt",
              channel: "whatsapp",
              notes: `${notePrefix}\n\n${queueMsg.message}`
            });
        }

        // Update daily stats
        const today = new Date().toISOString().split("T")[0];
        const { data: existingStats } = await supabase
          .from("whatsapp_daily_stats")
          .select("*")
          .eq("broker_id", instance.broker_id)
          .eq("date", today)
          .maybeSingle();

        if (existingStats) {
          await supabase
            .from("whatsapp_daily_stats")
            .update({ sent_count: (existingStats as { sent_count: number }).sent_count + 1 })
            .eq("id", (existingStats as { id: string }).id);
        } else {
          await supabase
            .from("whatsapp_daily_stats")
            .insert({
              broker_id: instance.broker_id,
              date: today,
              sent_count: 1
            });
        }

        // Update campaign stats if campaign_id exists
        if (queueMsg.campaign_id) {
          const { data: campaignData } = await supabase
            .from("whatsapp_campaigns")
            .select("sent_count")
            .eq("id", queueMsg.campaign_id)
            .single();
          
          if (campaignData) {
            await supabase
              .from("whatsapp_campaigns")
              .update({ sent_count: ((campaignData as { sent_count: number }).sent_count || 0) + 1 })
              .eq("id", queueMsg.campaign_id);
          }
        }

        results.push({ brokerId: instance.broker_id, sent: true, messageId: sendResult.messageId });

      } else {
        // Update queue - failed
        const newAttempts = queueMsg.attempts + 1;
        const isFinalAttempt = newAttempts >= queueMsg.max_attempts;

        await supabase
          .from("whatsapp_message_queue")
          .update({
            status: isFinalAttempt ? "failed" : "scheduled",
            attempts: newAttempts,
            error_message: sendResult.error,
            updated_at: new Date().toISOString(),
            // If not final attempt, reschedule for 5 minutes later
            scheduled_at: isFinalAttempt 
              ? queueMsg.scheduled_at 
              : new Date(Date.now() + 5 * 60 * 1000).toISOString()
          })
          .eq("id", queueMsg.id);

        // Update daily stats - failed
        const today = new Date().toISOString().split("T")[0];
        if (isFinalAttempt) {
          const { data: existingStats } = await supabase
            .from("whatsapp_daily_stats")
            .select("*")
            .eq("broker_id", instance.broker_id)
            .eq("date", today)
            .maybeSingle();

          if (existingStats) {
            await supabase
              .from("whatsapp_daily_stats")
              .update({ 
                failed_count: ((existingStats as { failed_count: number }).failed_count || 0) + 1,
                error_count: ((existingStats as { error_count: number }).error_count || 0) + 1
              })
              .eq("id", (existingStats as { id: string }).id);
          }

          // Update campaign stats if campaign_id exists
          if (queueMsg.campaign_id) {
            supabase
              .from("whatsapp_campaigns")
              .select("failed_count")
              .eq("id", queueMsg.campaign_id)
              .single()
              .then(({ data }) => {
                if (data) {
                  supabase
                    .from("whatsapp_campaigns")
                    .update({ failed_count: ((data as { failed_count: number }).failed_count || 0) + 1 })
                    .eq("id", queueMsg.campaign_id);
                }
              });
          }

          // Register failure interaction in lead history
          if (queueMsg.lead_id) {
            const isAutoFirstMessage = !queueMsg.campaign_id;
            const notePrefix = isAutoFirstMessage 
              ? "❌ Falha no envio da 1ª mensagem automática" 
              : "❌ Falha no envio via WhatsApp";
            
            try {
              await supabase
                .from("lead_interactions")
                .insert({
                  lead_id: queueMsg.lead_id,
                  broker_id: instance.broker_id,
                  interaction_type: "contact_attempt",
                  channel: "whatsapp",
                  notes: `${notePrefix}: ${sendResult.error || "Erro desconhecido"}. Tentativas: ${newAttempts}/${queueMsg.max_attempts}`
                });
            } catch (interactionErr) {
              console.error("Failed to log error interaction:", interactionErr);
            }
          }
        }

        results.push({ brokerId: instance.broker_id, sent: false, error: sendResult.error });
      }
    }

    return c.json({
      success: true,
      processed: results.length,
      results
    }, 200, corsHeaders);

  } catch (err) {
    const error = err as Error;
    console.error("Process Error:", error);
    return c.json({ error: error.message }, 500, corsHeaders);
  }
});

// POST /send-single - Send a single message (for testing)
app.post("/send-single", async (c) => {
  try {
    const supabase = getSupabaseClient();
    const body = await c.req.json();
    const { queueId } = body;

    if (!queueId) {
      return c.json({ error: "queueId is required" }, 400, corsHeaders);
    }

    // Get message from queue
    const { data: queueMsg, error: msgError } = await supabase
      .from("whatsapp_message_queue")
      .select("*")
      .eq("id", queueId)
      .single();

    if (msgError || !queueMsg) {
      return c.json({ error: "Message not found" }, 404, corsHeaders);
    }

    const message = queueMsg as QueueMessage;

    // Get broker instance
    const { data: instanceData, error: instanceError } = await supabase
      .from("broker_whatsapp_instances")
      .select("*")
      .eq("broker_id", message.broker_id)
      .single();

    if (instanceError || !instanceData) {
      return c.json({ error: "Instance not found" }, 404, corsHeaders);
    }

    const instance = instanceData as BrokerInstance;

    if (instance.status !== "connected") {
      return c.json({ error: "Instance not connected" }, 400, corsHeaders);
    }

    // Mark as sending
    await supabase
      .from("whatsapp_message_queue")
      .update({ status: "sending" })
      .eq("id", queueId);

    // Send via UAZAPI
    const sendResult = await sendMessageViaUAZAPI(
      instance.instance_name,
      instance.instance_token,
      message.phone,
      message.message
    );

    if (sendResult.success) {
      await supabase
        .from("whatsapp_message_queue")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          uazapi_message_id: sendResult.messageId,
          updated_at: new Date().toISOString()
        })
        .eq("id", queueId);

      return c.json({
        success: true,
        messageId: sendResult.messageId
      }, 200, corsHeaders);
    } else {
      await supabase
        .from("whatsapp_message_queue")
        .update({
          status: "failed",
          error_message: sendResult.error,
          attempts: message.attempts + 1,
          updated_at: new Date().toISOString()
        })
        .eq("id", queueId);

      return c.json({
        success: false,
        error: sendResult.error
      }, 500, corsHeaders);
    }

  } catch (err) {
    const error = err as Error;
    console.error("Send-Single Error:", error);
    return c.json({ error: error.message }, 500, corsHeaders);
  }
});

// POST /reset-daily - Reset daily counters (called at midnight)
app.post("/reset-daily", async (c) => {
  try {
    const supabase = getSupabaseClient();

    // Get all instances
    const { data: instances, error: instancesError } = await supabase
      .from("broker_whatsapp_instances")
      .select("*");

    if (instancesError) {
      console.error("Error fetching instances:", instancesError);
      return c.json({ error: "Failed to fetch instances" }, 500, corsHeaders);
    }

    if (!instances || instances.length === 0) {
      return c.json({ 
        success: true, 
        message: "No instances to reset"
      }, 200, corsHeaders);
    }

    let updatedCount = 0;

    for (const rawInstance of instances) {
      const instance = rawInstance as BrokerInstance;
      const updates: Record<string, unknown> = {
        daily_sent_count: 0,
        hourly_sent_count: 0,
        updated_at: new Date().toISOString()
      };

      // Advance warmup day if applicable
      if (instance.warmup_stage !== "normal" && instance.warmup_day < MAX_WARMUP_DAY) {
        const newDay = instance.warmup_day + 1;
        const schedule = WARMUP_SCHEDULE[newDay];
        
        if (schedule) {
          updates.warmup_day = newDay;
          updates.hourly_limit = schedule.hourlyLimit;
          updates.daily_limit = schedule.dailyLimit;
        }

        if (newDay >= MAX_WARMUP_DAY) {
          updates.warmup_stage = "normal";
          updates.hourly_limit = NORMAL_HOURLY_LIMIT;
          updates.daily_limit = NORMAL_DAILY_LIMIT;
        }
      }

      const { error: updateError } = await supabase
        .from("broker_whatsapp_instances")
        .update(updates)
        .eq("id", instance.id);

      if (!updateError) {
        updatedCount++;
      }
    }

    // Also unpause any system-paused messages that were paused
    await supabase
      .from("whatsapp_message_queue")
      .update({ status: "scheduled" })
      .eq("status", "paused_by_system");

    return c.json({
      success: true,
      message: `Reset ${updatedCount} instances`,
      updated: updatedCount
    }, 200, corsHeaders);

  } catch (err) {
    const error = err as Error;
    console.error("Reset-Daily Error:", error);
    return c.json({ error: error.message }, 500, corsHeaders);
  }
});

// POST /reset-hourly - Reset hourly counters (called every hour)
app.post("/reset-hourly", async (c) => {
  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from("broker_whatsapp_instances")
      .update({ 
        hourly_sent_count: 0,
        updated_at: new Date().toISOString()
      })
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Update all

    if (error) {
      return c.json({ error: "Failed to reset hourly counters" }, 500, corsHeaders);
    }

    return c.json({
      success: true,
      message: "Hourly counters reset"
    }, 200, corsHeaders);

  } catch (err) {
    const error = err as Error;
    console.error("Reset-Hourly Error:", error);
    return c.json({ error: error.message }, 500, corsHeaders);
  }
});

Deno.serve(app.fetch);

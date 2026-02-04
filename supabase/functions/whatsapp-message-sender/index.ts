import { Hono } from "https://deno.land/x/hono@v3.12.11/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const app = new Hono();

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

// Check if current time is within working hours
const isWithinWorkingHours = (startTime: string, endTime: string): boolean => {
  const now = new Date();
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);
  
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

// Format phone to clean number for UAZAPI
const formatPhoneForUAZAPI = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "");
  // Remove + if present
  return cleaned.startsWith("55") ? cleaned : `55${cleaned}`;
};

// Send message via UAZAPI
const sendMessageViaUAZAPI = async (
  instanceName: string,
  instanceToken: string | null,
  phone: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    const response = await fetch(`${UAZAPI_BASE_URL}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": instanceToken || UAZAPI_TOKEN,
      },
      body: JSON.stringify({
        number: formatPhoneForUAZAPI(phone),
        text: message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("UAZAPI Send Error:", errorText);
      return { success: false, error: errorText };
    }

    const result = await response.json();
    return { 
      success: true, 
      messageId: result.key?.id || result.messageId || null 
    };
  } catch (err) {
    const error = err as Error;
    console.error("UAZAPI Error:", error.message);
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
          await supabase
            .from("lead_interactions")
            .insert({
              lead_id: queueMsg.lead_id,
              broker_id: instance.broker_id,
              interaction_type: "contact_attempt",
              channel: "whatsapp",
              notes: `Mensagem enviada via WhatsApp: ${queueMsg.message.substring(0, 100)}...`
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

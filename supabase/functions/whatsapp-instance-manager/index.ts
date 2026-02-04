import { Hono } from "https://deno.land/x/hono@v3.12.11/mod.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const app = new Hono().basePath("/whatsapp-instance-manager");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// UAZAPI Configuration
// Normalize trailing slash to avoid accidental double slashes in requests
const UAZAPI_BASE_URL = (Deno.env.get("UAZAPI_INSTANCE_URL") || "").replace(/\/+$/g, "");
// NOTE: Some UAZAPI deployments require a "master/admin" token to manage instances.
// We support a dedicated admin token while keeping UAZAPI_TOKEN for backward compatibility.
const UAZAPI_TOKEN = Deno.env.get("UAZAPI_TOKEN") || "";
const UAZAPI_ADMIN_TOKEN = Deno.env.get("UAZAPI_ADMIN_TOKEN") || "";
const UAZAPI_DEFAULT_TOKEN = UAZAPI_ADMIN_TOKEN || UAZAPI_TOKEN;

type UazapiAuthStyle = "token" | "apikey" | "bearer" | "x-api-key";

const buildUazapiHeaders = (
  token: string,
  includeJson = false,
  style: UazapiAuthStyle = "token",
): Record<string, string> => {
  // Important: some UAZAPI deployments will only check ONE header.
  // If we send multiple auth headers at once, the server may prioritize the wrong one and return 401.
  const headers: Record<string, string> = {};

  if (style === "token") headers.token = token;
  if (style === "apikey") headers.apikey = token;
  if (style === "x-api-key") headers["x-api-key"] = token;
  if (style === "bearer") headers.Authorization = `Bearer ${token}`;

  if (includeJson) headers["Content-Type"] = "application/json";
  return headers;
};

const uazapiFetchWithAuthFallback = async (
  url: string,
  opts: Omit<RequestInit, "headers"> & { includeJson?: boolean },
  token: string,
): Promise<Response> => {
  const styles: UazapiAuthStyle[] = ["token", "apikey", "x-api-key", "bearer"];

  let lastResponse: Response | null = null;
  for (const style of styles) {
    const res = await fetch(url, {
      ...opts,
      headers: buildUazapiHeaders(token, Boolean(opts.includeJson), style),
    });

    if (res.status !== 401) return res;

    // Consume body to avoid resource leaks.
    try {
      await res.text();
    } catch {
      // ignore
    }
    lastResponse = res;
  }

  // All auth styles returned 401.
  return lastResponse as Response;
};

// Supabase Configuration
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Helper to create authenticated Supabase client
// deno-lint-ignore no-explicit-any
const getSupabaseClient = (authHeader?: string): SupabaseClient<any, any, any> => {
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
};

// Get broker ID from user
// deno-lint-ignore no-explicit-any
const getBrokerId = async (supabase: SupabaseClient<any, any, any>, userId: string): Promise<string> => {
  const { data, error } = await supabase
    .from("brokers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  
  if (error || !data) {
    throw new Error("Broker not found");
  }
  return (data as { id: string }).id;
};

// CORS preflight
app.options("/*", (c) => {
  return c.json({}, 200, corsHeaders);
});

// POST /init - Initialize a new UAZAPI instance for broker
app.post("/init", async (c) => {
  try {
    if (!UAZAPI_BASE_URL || !UAZAPI_DEFAULT_TOKEN) {
      return c.json(
        { error: "UAZAPI not configured" },
        500,
        corsHeaders,
      );
    }

    const authHeader = c.req.header("Authorization");
    const supabase = getSupabaseClient(authHeader);

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return c.json({ error: "Unauthorized" }, 401, corsHeaders);
    }

    const brokerId = await getBrokerId(supabase, user.id);
    
    // Check if instance already exists
    const { data: existingInstance } = await supabase
      .from("broker_whatsapp_instances")
      .select("*")
      .eq("broker_id", brokerId)
      .maybeSingle();

    if (existingInstance) {
      const instance = existingInstance as { status: string };
      // If exists and connected, return current status
      if (instance.status === "connected") {
        return c.json({
          success: true,
          instance: existingInstance,
          message: "Instance already connected",
        }, 200, corsHeaders);
      }
    }

    // Generate unique instance name
    const instanceName = `enove_broker_${brokerId.substring(0, 8)}`;

    // Create instance via UAZAPI
    const uazResponse = await uazapiFetchWithAuthFallback(
      `${UAZAPI_BASE_URL}/instance/init`,
      {
        method: "POST",
        includeJson: true,
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
        }),
      },
      UAZAPI_DEFAULT_TOKEN,
    );

    if (!uazResponse.ok) {
      const errorText = await uazResponse.text();
      console.error("UAZAPI Error:", errorText);
      return c.json({
        error: "Failed to create UAZAPI instance",
        status: uazResponse.status,
        details: errorText,
        hint:
          "A UAZAPI retornou Unauthorized. Confirme se UAZAPI_INSTANCE_URL aponta para a URL base do servidor e se UAZAPI_ADMIN_TOKEN (ou UAZAPI_TOKEN) tem permissão de criar instâncias.",
      }, 500, corsHeaders);
    }

    const uazData = await uazResponse.json();
    console.log("UAZAPI Response:", uazData);

    // Get instance token from response
    const instanceToken = uazData.hash || uazData.instance?.apikey || null;

    // Configure webhook for this instance
    const webhookUrl = `${SUPABASE_URL}/functions/v1/whatsapp-webhook`;
    try {
      const webhookResponse = await uazapiFetchWithAuthFallback(
        `${UAZAPI_BASE_URL}/webhook/set/${instanceName}`,
        {
          method: "POST",
          includeJson: true,
          body: JSON.stringify({
            url: webhookUrl,
            webhook_by_events: false,
            events: ["messages.upsert", "connection.update", "message.update"],
          }),
        },
        instanceToken || UAZAPI_DEFAULT_TOKEN,
      );
      
      if (webhookResponse.ok) {
        console.log(`Webhook configured for ${instanceName}: ${webhookUrl}`);
      } else {
        console.error("Failed to configure webhook:", await webhookResponse.text());
      }
    } catch (webhookErr) {
      console.error("Webhook configuration error:", webhookErr);
      // Continue anyway - webhook can be configured manually
    }

    // Upsert broker instance record
    const { data: instance, error: dbError } = await supabase
      .from("broker_whatsapp_instances")
      .upsert({
        broker_id: brokerId,
        instance_name: instanceName,
        instance_token: instanceToken,
        status: "qr_pending",
        updated_at: new Date().toISOString(),
      }, { onConflict: "broker_id" })
      .select()
      .single();

    if (dbError) {
      console.error("DB Error:", dbError);
      return c.json({ error: "Failed to save instance", details: dbError.message }, 500, corsHeaders);
    }

    return c.json({
      success: true,
      instance,
      uazapi: uazData,
      webhookConfigured: webhookUrl,
    }, 200, corsHeaders);

  } catch (err) {
    const error = err as Error;
    console.error("Init Error:", error);
    return c.json({ error: error.message }, 500, corsHeaders);
  }
});

// GET /status - Get instance status
app.get("/status", async (c) => {
  try {
    if (!UAZAPI_BASE_URL) {
      return c.json({ error: "UAZAPI not configured" }, 500, corsHeaders);
    }

    const authHeader = c.req.header("Authorization");
    const supabase = getSupabaseClient(authHeader);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return c.json({ error: "Unauthorized" }, 401, corsHeaders);
    }

    const brokerId = await getBrokerId(supabase, user.id);

    // Get broker instance
    const { data: instanceData } = await supabase
      .from("broker_whatsapp_instances")
      .select("*")
      .eq("broker_id", brokerId)
      .maybeSingle();

    if (!instanceData) {
      return c.json({
        success: true,
        instance: null,
        message: "No instance configured",
      }, 200, corsHeaders);
    }

    const instance = instanceData as { id: string; instance_name: string; instance_token: string | null; status: string; connected_at: string | null };

    // Check UAZAPI status
    const uazResponse = await uazapiFetchWithAuthFallback(
      `${UAZAPI_BASE_URL}/instance/connectionState/${instance.instance_name}`,
      { method: "GET" },
      instance.instance_token || UAZAPI_DEFAULT_TOKEN,
    );

    let uazStatus = null;
    if (uazResponse.ok) {
      uazStatus = await uazResponse.json();
      
      // Update local status based on UAZAPI response
      const state = uazStatus.instance?.state;
      const newStatus = state === "open" ? "connected" : 
                        state === "connecting" ? "connecting" : 
                        "disconnected";
      
      if (newStatus !== instance.status) {
        await supabase
          .from("broker_whatsapp_instances")
          .update({ 
            status: newStatus,
            connected_at: newStatus === "connected" ? new Date().toISOString() : instance.connected_at,
            last_seen_at: new Date().toISOString(),
          })
          .eq("id", instance.id);
        
        instance.status = newStatus;
      }
    }

    return c.json({
      success: true,
      instance,
      uazapi: uazStatus,
    }, 200, corsHeaders);

  } catch (err) {
    const error = err as Error;
    console.error("Status Error:", error);
    return c.json({ error: error.message }, 500, corsHeaders);
  }
});

// GET /qrcode - Get QR code for pairing
app.get("/qrcode", async (c) => {
  try {
    if (!UAZAPI_BASE_URL) {
      return c.json({ error: "UAZAPI not configured" }, 500, corsHeaders);
    }

    const authHeader = c.req.header("Authorization");
    const supabase = getSupabaseClient(authHeader);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return c.json({ error: "Unauthorized" }, 401, corsHeaders);
    }

    const brokerId = await getBrokerId(supabase, user.id);

    // Get broker instance
    const { data: instanceData } = await supabase
      .from("broker_whatsapp_instances")
      .select("*")
      .eq("broker_id", brokerId)
      .maybeSingle();

    if (!instanceData) {
      return c.json({ error: "No instance configured. Initialize first." }, 400, corsHeaders);
    }

    const instance = instanceData as { id: string; instance_name: string; instance_token: string | null };

    // Get QR code from UAZAPI
    const uazResponse = await uazapiFetchWithAuthFallback(
      `${UAZAPI_BASE_URL}/instance/connect/${instance.instance_name}`,
      { method: "GET" },
      instance.instance_token || UAZAPI_DEFAULT_TOKEN,
    );

    if (!uazResponse.ok) {
      const errorText = await uazResponse.text();
      console.error("UAZAPI QR Error:", errorText);
      return c.json({ error: "Failed to get QR code", details: errorText }, 500, corsHeaders);
    }

    const qrData = await uazResponse.json();

    // Update status to qr_pending
    await supabase
      .from("broker_whatsapp_instances")
      .update({ 
        status: "qr_pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", instance.id);

    return c.json({
      success: true,
      qrcode: qrData.base64 || qrData.qrcode,
      pairingCode: qrData.pairingCode,
    }, 200, corsHeaders);

  } catch (err) {
    const error = err as Error;
    console.error("QR Error:", error);
    return c.json({ error: error.message }, 500, corsHeaders);
  }
});

// POST /logout - Disconnect instance
app.post("/logout", async (c) => {
  try {
    if (!UAZAPI_BASE_URL) {
      return c.json({ error: "UAZAPI not configured" }, 500, corsHeaders);
    }

    const authHeader = c.req.header("Authorization");
    const supabase = getSupabaseClient(authHeader);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return c.json({ error: "Unauthorized" }, 401, corsHeaders);
    }

    const brokerId = await getBrokerId(supabase, user.id);

    // Get broker instance
    const { data: instanceData } = await supabase
      .from("broker_whatsapp_instances")
      .select("*")
      .eq("broker_id", brokerId)
      .maybeSingle();

    if (!instanceData) {
      return c.json({ error: "No instance configured" }, 400, corsHeaders);
    }

    const instance = instanceData as { id: string; instance_name: string; instance_token: string | null };

    // Logout from UAZAPI
    const uazResponse = await uazapiFetchWithAuthFallback(
      `${UAZAPI_BASE_URL}/instance/logout/${instance.instance_name}`,
      { method: "DELETE" },
      instance.instance_token || UAZAPI_DEFAULT_TOKEN,
    );

    if (!uazResponse.ok) {
      console.error("UAZAPI Logout Error:", await uazResponse.text());
    }

    // Update local status
    await supabase
      .from("broker_whatsapp_instances")
      .update({ 
        status: "disconnected",
        phone_number: null,
        connected_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", instance.id);

    return c.json({
      success: true,
      message: "Instance disconnected",
    }, 200, corsHeaders);

  } catch (err) {
    const error = err as Error;
    console.error("Logout Error:", error);
    return c.json({ error: error.message }, 500, corsHeaders);
  }
});

// POST /restart - Restart instance
app.post("/restart", async (c) => {
  try {
    if (!UAZAPI_BASE_URL) {
      return c.json({ error: "UAZAPI not configured" }, 500, corsHeaders);
    }

    const authHeader = c.req.header("Authorization");
    const supabase = getSupabaseClient(authHeader);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return c.json({ error: "Unauthorized" }, 401, corsHeaders);
    }

    const brokerId = await getBrokerId(supabase, user.id);

    // Get broker instance
    const { data: instanceData } = await supabase
      .from("broker_whatsapp_instances")
      .select("*")
      .eq("broker_id", brokerId)
      .maybeSingle();

    if (!instanceData) {
      return c.json({ error: "No instance configured" }, 400, corsHeaders);
    }

    const instance = instanceData as { id: string; instance_name: string; instance_token: string | null };

    // Restart via UAZAPI
    const uazResponse = await uazapiFetchWithAuthFallback(
      `${UAZAPI_BASE_URL}/instance/restart/${instance.instance_name}`,
      { method: "PUT" },
      instance.instance_token || UAZAPI_DEFAULT_TOKEN,
    );

    if (!uazResponse.ok) {
      const errorText = await uazResponse.text();
      console.error("UAZAPI Restart Error:", errorText);
      return c.json({ error: "Failed to restart", details: errorText }, 500, corsHeaders);
    }

    // Update status
    await supabase
      .from("broker_whatsapp_instances")
      .update({ 
        status: "connecting",
        updated_at: new Date().toISOString(),
      })
      .eq("id", instance.id);

    return c.json({
      success: true,
      message: "Instance restarting",
    }, 200, corsHeaders);

  } catch (err) {
    const error = err as Error;
    console.error("Restart Error:", error);
    return c.json({ error: error.message }, 500, corsHeaders);
  }
});

// POST /pause - Pause/unpause sending
app.post("/pause", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const supabase = getSupabaseClient(authHeader);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return c.json({ error: "Unauthorized" }, 401, corsHeaders);
    }

    const brokerId = await getBrokerId(supabase, user.id);
    const body = await c.req.json();
    const { pause, reason } = body;

    // Update pause status
    const { data: instance, error } = await supabase
      .from("broker_whatsapp_instances")
      .update({ 
        is_paused: pause,
        pause_reason: pause ? (reason || "Paused by user") : null,
        updated_at: new Date().toISOString(),
      })
      .eq("broker_id", brokerId)
      .select()
      .single();

    if (error) {
      return c.json({ error: "Failed to update pause status" }, 500, corsHeaders);
    }

    // If pausing, also pause all queued messages
    if (pause) {
      await supabase
        .from("whatsapp_message_queue")
        .update({ status: "paused_by_system" })
        .eq("broker_id", brokerId)
        .in("status", ["queued", "scheduled"]);
    }

    return c.json({
      success: true,
      instance,
    }, 200, corsHeaders);

  } catch (err) {
    const error = err as Error;
    console.error("Pause Error:", error);
    return c.json({ error: error.message }, 500, corsHeaders);
  }
});

// POST /settings - Update instance settings
app.post("/settings", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const supabase = getSupabaseClient(authHeader);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return c.json({ error: "Unauthorized" }, 401, corsHeaders);
    }

    const brokerId = await getBrokerId(supabase, user.id);
    const body = await c.req.json();
    const { hourly_limit, daily_limit, working_hours_start, working_hours_end } = body;

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (hourly_limit !== undefined) updateData.hourly_limit = Math.min(60, Math.max(10, hourly_limit));
    if (daily_limit !== undefined) updateData.daily_limit = Math.min(300, Math.max(30, daily_limit));
    if (working_hours_start !== undefined) updateData.working_hours_start = working_hours_start;
    if (working_hours_end !== undefined) updateData.working_hours_end = working_hours_end;

    const { data: instance, error } = await supabase
      .from("broker_whatsapp_instances")
      .update(updateData)
      .eq("broker_id", brokerId)
      .select()
      .single();

    if (error) {
      return c.json({ error: "Failed to update settings" }, 500, corsHeaders);
    }

    return c.json({
      success: true,
      instance,
    }, 200, corsHeaders);

  } catch (err) {
    const error = err as Error;
    console.error("Settings Error:", error);
    return c.json({ error: error.message }, 500, corsHeaders);
  }
});

Deno.serve(app.fetch);

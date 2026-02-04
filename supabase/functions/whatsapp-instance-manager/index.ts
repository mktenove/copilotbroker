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

type UazapiAuthStyle = "admintoken" | "token" | "apikey" | "bearer" | "x-api-key";

const buildUazapiHeaders = (
  token: string,
  includeJson = false,
  style: UazapiAuthStyle = "token",
): Record<string, string> => {
  // Important: some UAZAPI deployments will only check ONE header.
  // If we send multiple auth headers at once, the server may prioritize the wrong one and return 401.
  const headers: Record<string, string> = {};

  if (style === "admintoken") headers.admintoken = token;
  if (style === "token") headers.token = token;
  if (style === "apikey") headers.apikey = token;
  if (style === "x-api-key") headers["x-api-key"] = token;
  if (style === "bearer") headers.Authorization = `Bearer ${token}`;

  if (includeJson) headers["Content-Type"] = "application/json";
  return headers;
};

// For regular instance operations, we should try "token" first (instance token).
// For admin operations (like /instance/init), we should try "admintoken" first.
const uazapiFetchWithAuthFallback = async (
  url: string,
  opts: Omit<RequestInit, "headers"> & { includeJson?: boolean; bodyString?: string },
  token: string,
  isAdminEndpoint = false,
): Promise<Response> => {
  // Prioritize based on endpoint type
  const styles: UazapiAuthStyle[] = isAdminEndpoint 
    ? ["admintoken", "token", "apikey", "x-api-key", "bearer"]
    : ["token", "admintoken", "apikey", "x-api-key", "bearer"];
  
  // Sanitize token
  const cleanToken = token.trim();

  console.log(`[UAZAPI] Attempting request to: ${url}`);
  console.log(`[UAZAPI] Token length: ${cleanToken.length}, Token preview: ${cleanToken.substring(0, 8)}...`);

  let lastResponseBody = "";
  let lastStatus = 401;
  let lastStatusText = "Unauthorized";

  for (const style of styles) {
    const headers = buildUazapiHeaders(cleanToken, Boolean(opts.includeJson), style);
    console.log(`[UAZAPI] Trying auth style: ${style}, headers: ${JSON.stringify(Object.keys(headers))}`);
    
    const fetchOpts: RequestInit = {
      method: opts.method,
      headers,
    };
    if (opts.bodyString) {
      fetchOpts.body = opts.bodyString;
    }

    const res = await fetch(url, fetchOpts);
    console.log(`[UAZAPI] Response status: ${res.status} for style: ${style}`);

    if (res.status !== 401) return res;

    // Store response info before consuming body
    lastStatus = res.status;
    lastStatusText = res.statusText;
    try {
      lastResponseBody = await res.text();
      console.log(`[UAZAPI] 401 response body: ${lastResponseBody.substring(0, 200)}`);
    } catch {
      lastResponseBody = "Unauthorized";
    }
  }

  console.error(`[UAZAPI] All auth styles failed for URL: ${url}`);
  
  // All auth styles returned 401 - return a new Response with the stored body
  return new Response(lastResponseBody, {
    status: lastStatus,
    statusText: lastStatusText,
    headers: { "Content-Type": "application/json" },
  });
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
      const instance = existingInstance as { status: string; instance_token: string | null };
      // If exists and connected, return current status
      if (instance.status === "connected") {
        return c.json({
          success: true,
          instance: existingInstance,
          message: "Instance already connected",
        }, 200, corsHeaders);
      }
      // If has token but not connected, skip creation and just return for QR
      if (instance.instance_token) {
        return c.json({
          success: true,
          instance: existingInstance,
          message: "Instance exists, ready for QR code",
        }, 200, corsHeaders);
      }
    }

    // Generate unique instance name
    const instanceName = `enove_broker_${brokerId.substring(0, 8)}`;

    // Create instance via UAZAPI (admin endpoint)
    const uazResponse = await uazapiFetchWithAuthFallback(
      `${UAZAPI_BASE_URL}/instance/init`,
      {
        method: "POST",
        includeJson: true,
        bodyString: JSON.stringify({
          // Docs: https://docs.uazapi.com/schema/Instance
          // Endpoint expects "name" and an administrative token (admintoken)
          name: instanceName,
          systemName: "enove",
          // Optional metadata fields (safe + helpful for tracing)
          adminField01: brokerId,
        }),
      },
      UAZAPI_DEFAULT_TOKEN,
      true, // isAdminEndpoint
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
    console.log("UAZAPI Init Response:", JSON.stringify(uazData, null, 2));

    // === IMPROVED: Capture real instance data from UAZAPI response ===
    // UAZAPI may return different structures, so we check multiple paths
    const realInstanceName = 
      uazData?.name || 
      uazData?.instance?.name || 
      uazData?.instance?.instanceName ||
      instanceName;
    
    // Get instance token from response (different UAZAPI versions use different keys)
    const instanceToken =
      uazData?.token ||
      uazData?.key ||
      uazData?.hash ||
      uazData?.instance?.token ||
      uazData?.instance?.apikey ||
      uazData?.instance?.key ||
      null;

    console.log(`[UAZAPI] Real instance name: ${realInstanceName}, Token found: ${!!instanceToken}`);

    // Configure webhook (admin endpoint)
    const webhookUrl = `${SUPABASE_URL}/functions/v1/whatsapp-webhook`;
    try {
      // Use instance token if available for webhook config
      const webhookResponse = await uazapiFetchWithAuthFallback(
        `${UAZAPI_BASE_URL}/webhook`,
        {
          method: "POST",
          includeJson: true,
          bodyString: JSON.stringify({
            url: webhookUrl,
            enabled: true,
            events: ["messages", "connection", "messages_update"],
            excludeMessages: ["wasSentByApi"],
          }),
        },
        instanceToken || UAZAPI_DEFAULT_TOKEN,
        !instanceToken, // Use admin mode only if no instance token
      );
      
      if (webhookResponse.ok) {
        console.log(`Webhook configured for ${realInstanceName}: ${webhookUrl}`);
      } else {
        console.error("Failed to configure webhook:", await webhookResponse.text());
      }
    } catch (webhookErr) {
      console.error("Webhook configuration error:", webhookErr);
      // Continue anyway - webhook can be configured manually
    }

    // Upsert broker instance record with real data from UAZAPI
    const { data: instance, error: dbError } = await supabase
      .from("broker_whatsapp_instances")
      .upsert({
        broker_id: brokerId,
        instance_name: realInstanceName, // Use name returned by UAZAPI
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

    // Check UAZAPI status - try connectionState endpoint with instance token
    const uazResponse = await uazapiFetchWithAuthFallback(
      `${UAZAPI_BASE_URL}/instance/connectionState/${instance.instance_name}`,
      { method: "GET" },
      instance.instance_token || UAZAPI_DEFAULT_TOKEN,
      false, // Instance endpoint
    );

    let uazStatus = null;
    if (uazResponse.ok) {
      uazStatus = await uazResponse.json();
      
      // Update local status based on UAZAPI response
      const state = uazStatus.instance?.state || uazStatus.state;
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

    // === FIXED: Use correct endpoint and token for QR code ===
    // According to UAZAPI V2 docs: POST /instance/connect with instance token
    const instanceToken = instance.instance_token;
    
    if (!instanceToken) {
      return c.json({ 
        error: "Instance token not found", 
        hint: "A instância foi criada mas não retornou um token. Tente reinicializar a conexão.",
      }, 400, corsHeaders);
    }

    console.log(`[UAZAPI] Getting QR code for instance: ${instance.instance_name}`);
    console.log(`[UAZAPI] Using instance token: ${instanceToken.substring(0, 8)}...`);

    // === FIXED: Use /instance/connectionState which returns QR code in response ===
    // The logs show this endpoint returns the QR code at response.instance.qrcode
    const uazResponse = await uazapiFetchWithAuthFallback(
      `${UAZAPI_BASE_URL}/instance/connectionState/${instance.instance_name}`,
      { method: "GET" },
      instanceToken,
      false, // Instance endpoint, not admin
    );

    console.log(`[UAZAPI] ConnectionState response status: ${uazResponse.status}`);

    if (!uazResponse.ok) {
      const errorText = await uazResponse.text();
      console.error("UAZAPI QR Error:", errorText);
      
      return c.json({ 
        error: "Failed to get QR code", 
        details: errorText,
        hint: "Verifique se a instância foi criada corretamente e se o token está válido.",
      }, 500, corsHeaders);
    }

    const qrData = await uazResponse.json();
    console.log("[UAZAPI] QR Response:", JSON.stringify(qrData, null, 2));

    // Extract QR code from response - UAZAPI returns it in instance.qrcode
    const qrcode = qrData.instance?.qrcode || qrData.qrcode || qrData.base64 || qrData.code;
    const pairingCode = qrData.instance?.paircode || qrData.pairingCode || qrData.paircode;

    if (!qrcode) {
      console.log("[UAZAPI] No QR code in response, instance may already be connected");
      return c.json({
        success: true,
        qrcode: null,
        message: qrData.instance?.status === "connected" 
          ? "Instância já conectada" 
          : "QR code não disponível no momento. Tente novamente.",
      }, 200, corsHeaders);
    }

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
      qrcode: qrcode,
      pairingCode: pairingCode,
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

    // Logout from UAZAPI using instance token
    const uazResponse = await fetch(`${UAZAPI_BASE_URL}/instance/logout`, {
      method: "DELETE",
      headers: {
        "token": instance.instance_token || "",
      },
    });

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

    // Restart via UAZAPI using instance token
    const uazResponse = await fetch(`${UAZAPI_BASE_URL}/instance/restart`, {
      method: "PUT",
      headers: {
        "token": instance.instance_token || "",
      },
    });

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

// POST /sync - Sync instance from UAZAPI (for existing instances created outside)
app.post("/sync", async (c) => {
  try {
    if (!UAZAPI_BASE_URL || !UAZAPI_DEFAULT_TOKEN) {
      return c.json({ error: "UAZAPI not configured" }, 500, corsHeaders);
    }

    const authHeader = c.req.header("Authorization");
    const supabase = getSupabaseClient(authHeader);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return c.json({ error: "Unauthorized" }, 401, corsHeaders);
    }

    const brokerId = await getBrokerId(supabase, user.id);
    
    // Try to find instance in UAZAPI by listing all instances
    const listResponse = await fetch(`${UAZAPI_BASE_URL}/instance/fetchInstances`, {
      method: "GET",
      headers: {
        "admintoken": UAZAPI_ADMIN_TOKEN,
      },
    });

    if (!listResponse.ok) {
      return c.json({ 
        error: "Failed to list UAZAPI instances", 
        details: await listResponse.text(),
      }, 500, corsHeaders);
    }

    const instances = await listResponse.json();
    const expectedName = `enove_broker_${brokerId.substring(0, 8)}`;
    
    // Find matching instance
    // deno-lint-ignore no-explicit-any
    const matchingInstance = (instances as any[])?.find((inst: any) => 
      inst.name === expectedName || 
      inst.instanceName === expectedName ||
      inst.adminField01 === brokerId
    );

    if (!matchingInstance) {
      return c.json({ 
        error: "No matching instance found in UAZAPI",
        expectedName,
        availableInstances: instances,
      }, 404, corsHeaders);
    }

    // Update local database with UAZAPI data
    const { data: instance, error: dbError } = await supabase
      .from("broker_whatsapp_instances")
      .upsert({
        broker_id: brokerId,
        instance_name: matchingInstance.name || matchingInstance.instanceName || expectedName,
        instance_token: matchingInstance.token || matchingInstance.key || matchingInstance.apikey,
        status: matchingInstance.connectionStatus === "open" ? "connected" : "disconnected",
        updated_at: new Date().toISOString(),
      }, { onConflict: "broker_id" })
      .select()
      .single();

    if (dbError) {
      return c.json({ error: "Failed to sync instance", details: dbError.message }, 500, corsHeaders);
    }

    return c.json({
      success: true,
      instance,
      synced_from: matchingInstance,
    }, 200, corsHeaders);

  } catch (err) {
    const error = err as Error;
    console.error("Sync Error:", error);
    return c.json({ error: error.message }, 500, corsHeaders);
  }
});

// GET /debug/instances - List all instances from UAZAPI (admin diagnostic)
app.get("/debug/instances", async (c) => {
  try {
    if (!UAZAPI_BASE_URL || !UAZAPI_DEFAULT_TOKEN) {
      return c.json({ error: "UAZAPI not configured" }, 500, corsHeaders);
    }

    const authHeader = c.req.header("Authorization");
    const supabase = getSupabaseClient(authHeader);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return c.json({ error: "Unauthorized" }, 401, corsHeaders);
    }

    // List all instances via UAZAPI admin endpoint
    const uazResponse = await fetch(`${UAZAPI_BASE_URL}/instance/fetchInstances`, {
      method: "GET",
      headers: {
        "admintoken": UAZAPI_ADMIN_TOKEN,
      },
    });

    if (!uazResponse.ok) {
      const errorText = await uazResponse.text();
      console.error("UAZAPI List Error:", errorText);
      return c.json({ 
        error: "Failed to list instances", 
        status: uazResponse.status,
        details: errorText,
      }, 500, corsHeaders);
    }

    const instances = await uazResponse.json();
    
    // Also get local broker instance for comparison
    const brokerId = await getBrokerId(supabase, user.id);
    const { data: localInstance } = await supabase
      .from("broker_whatsapp_instances")
      .select("*")
      .eq("broker_id", brokerId)
      .maybeSingle();

    return c.json({
      success: true,
      uazapi_instances: instances,
      local_instance: localInstance,
      uazapi_base_url: UAZAPI_BASE_URL,
    }, 200, corsHeaders);

  } catch (err) {
    const error = err as Error;
    console.error("Debug Error:", error);
    return c.json({ error: error.message }, 500, corsHeaders);
  }
});

Deno.serve(app.fetch);

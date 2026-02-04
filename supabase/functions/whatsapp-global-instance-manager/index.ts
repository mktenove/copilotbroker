import { Hono } from "https://deno.land/x/hono@v3.12.11/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const app = new Hono().basePath("/whatsapp-global-instance-manager");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Parse UAZAPI_INSTANCE_URL to extract base URL and instance name
// Expected format: https://api.uazapi.com/v2/{instanceName}
const parseInstanceFromUrl = (): { baseUrl: string; instanceName: string } | null => {
  const url = Deno.env.get("UAZAPI_INSTANCE_URL") || "";
  const match = url.match(/^(.+?)\/v2\/([^/]+)$/);
  if (match) {
    return { baseUrl: match[1], instanceName: match[2] };
  }
  // Alternative format: just the base URL without /v2/
  const altMatch = url.match(/^(.+?)\/([^/]+)$/);
  if (altMatch && !url.includes("/v2/")) {
    return { baseUrl: url.replace(/\/[^/]+$/, ""), instanceName: altMatch[2] };
  }
  return null;
};

const UAZAPI_TOKEN = Deno.env.get("UAZAPI_TOKEN") || "";
const UAZAPI_ADMIN_TOKEN = Deno.env.get("UAZAPI_ADMIN_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

type UazapiAuthStyle = "token" | "admintoken" | "apikey" | "bearer";

const buildHeaders = (token: string, style: UazapiAuthStyle = "token", includeJson = false): Record<string, string> => {
  const headers: Record<string, string> = {};
  
  if (style === "token") headers.token = token;
  if (style === "admintoken") headers.admintoken = token;
  if (style === "apikey") headers.apikey = token;
  if (style === "bearer") headers.Authorization = `Bearer ${token}`;
  
  if (includeJson) headers["Content-Type"] = "application/json";
  return headers;
};

// Try multiple auth styles for compatibility
const fetchWithAuthFallback = async (
  url: string,
  opts: RequestInit,
  token: string,
  isAdmin = false
): Promise<Response> => {
  const styles: UazapiAuthStyle[] = isAdmin 
    ? ["admintoken", "token", "apikey", "bearer"]
    : ["token", "admintoken", "apikey", "bearer"];
  
  const tokensToTry = [token, UAZAPI_ADMIN_TOKEN, UAZAPI_TOKEN].filter(Boolean);
  
  let lastResponse: Response | null = null;
  
  for (const currentToken of tokensToTry) {
    for (const style of styles) {
      const headers = {
        ...buildHeaders(currentToken, style, opts.method !== "GET"),
        ...(opts.headers as Record<string, string> || {}),
      };
      
      const response = await fetch(url, { ...opts, headers });
      
      if (response.ok) return response;
      
      lastResponse = response;
      
      // Only continue fallback on auth errors
      if (response.status !== 401 && response.status !== 403) {
        return response;
      }
    }
  }
  
  return lastResponse || new Response(JSON.stringify({ error: "All auth attempts failed" }), { status: 401 });
};

// Verify user is admin
const verifyAdmin = async (authHeader: string | undefined): Promise<boolean> => {
  if (!authHeader) return false;
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const token = authHeader.replace("Bearer ", "");
  
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return false;
  
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .eq("role", "admin")
    .maybeSingle();
  
  return !!roleData;
};

// Normalize UAZAPI status response
const normalizeStatus = (uazStatus: Record<string, unknown>): {
  status: "connected" | "connecting" | "disconnected" | "qr_pending";
  phoneNumber: string | null;
} => {
  const rawState = 
    (uazStatus?.instance as Record<string, unknown>)?.state ||
    (uazStatus?.instance as Record<string, unknown>)?.status ||
    uazStatus?.state ||
    uazStatus?.status ||
    uazStatus?.response ||
    null;
  
  const rawStr = String(rawState || "").toLowerCase();
  
  const isConnectedBool = uazStatus?.connected === true || uazStatus?.loggedIn === true;
  const connectedStates = ["open", "connected", "online", "active", "authenticated"];
  const isConnectedStr = connectedStates.includes(rawStr);
  const connectingStates = ["connecting", "syncing", "opening"];
  const isConnecting = connectingStates.includes(rawStr);
  const qrPendingStates = ["qr", "qr_pending", "qrcode", "pairing", "waiting"];
  const isQrPending = qrPendingStates.includes(rawStr);
  
  let status: "connected" | "connecting" | "disconnected" | "qr_pending";
  if (isConnectedBool || isConnectedStr) {
    status = "connected";
  } else if (isConnecting) {
    status = "connecting";
  } else if (isQrPending) {
    status = "qr_pending";
  } else {
    status = "disconnected";
  }
  
  const instanceData = uazStatus?.instance as Record<string, unknown> | undefined;
  const phoneNumber = 
    instanceData?.owner ||
    (uazStatus?.jid as string)?.split("@")[0] ||
    instanceData?.profileName ||
    instanceData?.phoneNumber ||
    uazStatus?.ownerJid?.toString()?.split("@")[0] ||
    null;
  
  return { status, phoneNumber: phoneNumber as string | null };
};

// CORS preflight
app.options("/*", (c) => {
  return c.json({}, 200, corsHeaders);
});

// GET /status - Get global instance status
app.get("/status", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const isAdmin = await verifyAdmin(authHeader);
    if (!isAdmin) {
      return c.json({ error: "Unauthorized - Admin only" }, 401, corsHeaders);
    }

    const parsed = parseInstanceFromUrl();
    if (!parsed) {
      return c.json({ error: "UAZAPI_INSTANCE_URL not configured correctly" }, 500, corsHeaders);
    }

    const { baseUrl, instanceName } = parsed;
    console.log(`[Global Instance] Checking status for: ${instanceName}`);
    
    const response = await fetchWithAuthFallback(
      `${baseUrl}/v2/${instanceName}/instance/status`,
      { method: "GET" },
      UAZAPI_TOKEN
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Global Instance] Status error: ${response.status} - ${errorText}`);
      return c.json({ 
        error: "Failed to get status", 
        status: response.status,
        details: errorText 
      }, response.status, corsHeaders);
    }

    const uazData = await response.json();
    const { status, phoneNumber } = normalizeStatus(uazData);

    return c.json({
      instance: {
        instance_name: instanceName,
        status,
        phone_number: phoneNumber,
      },
      raw: uazData,
    }, 200, corsHeaders);

  } catch (err) {
    console.error("[Global Instance] Status error:", err);
    return c.json({ error: (err as Error).message }, 500, corsHeaders);
  }
});

// GET /qrcode - Get QR code for global instance
app.get("/qrcode", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const isAdmin = await verifyAdmin(authHeader);
    if (!isAdmin) {
      return c.json({ error: "Unauthorized - Admin only" }, 401, corsHeaders);
    }

    const parsed = parseInstanceFromUrl();
    if (!parsed) {
      return c.json({ error: "UAZAPI_INSTANCE_URL not configured correctly" }, 500, corsHeaders);
    }

    const { baseUrl, instanceName } = parsed;
    console.log(`[Global Instance] Getting QR for: ${instanceName}`);
    
    const response = await fetchWithAuthFallback(
      `${baseUrl}/v2/${instanceName}/instance/connect`,
      { method: "GET" },
      UAZAPI_TOKEN
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Global Instance] QR error: ${response.status} - ${errorText}`);
      return c.json({ 
        error: "Failed to get QR code", 
        status: response.status,
        details: errorText 
      }, response.status, corsHeaders);
    }

    const data = await response.json();
    
    // Extract QR code from various possible response formats
    const qrcode = data?.qrcode || data?.qr || data?.code || data?.base64 || null;

    return c.json({ qrcode, raw: data }, 200, corsHeaders);

  } catch (err) {
    console.error("[Global Instance] QR error:", err);
    return c.json({ error: (err as Error).message }, 500, corsHeaders);
  }
});

// POST /logout - Disconnect global instance
app.post("/logout", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const isAdmin = await verifyAdmin(authHeader);
    if (!isAdmin) {
      return c.json({ error: "Unauthorized - Admin only" }, 401, corsHeaders);
    }

    const parsed = parseInstanceFromUrl();
    if (!parsed) {
      return c.json({ error: "UAZAPI_INSTANCE_URL not configured correctly" }, 500, corsHeaders);
    }

    const { baseUrl, instanceName } = parsed;
    console.log(`[Global Instance] Logging out: ${instanceName}`);
    
    const response = await fetchWithAuthFallback(
      `${baseUrl}/v2/${instanceName}/instance/disconnect`,
      { method: "POST" },
      UAZAPI_TOKEN
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Global Instance] Logout error: ${response.status} - ${errorText}`);
      return c.json({ 
        error: "Failed to logout", 
        status: response.status,
        details: errorText 
      }, response.status, corsHeaders);
    }

    return c.json({ success: true }, 200, corsHeaders);

  } catch (err) {
    console.error("[Global Instance] Logout error:", err);
    return c.json({ error: (err as Error).message }, 500, corsHeaders);
  }
});

// POST /restart - Restart global instance
app.post("/restart", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const isAdmin = await verifyAdmin(authHeader);
    if (!isAdmin) {
      return c.json({ error: "Unauthorized - Admin only" }, 401, corsHeaders);
    }

    const parsed = parseInstanceFromUrl();
    if (!parsed) {
      return c.json({ error: "UAZAPI_INSTANCE_URL not configured correctly" }, 500, corsHeaders);
    }

    const { baseUrl, instanceName } = parsed;
    console.log(`[Global Instance] Restarting: ${instanceName}`);
    
    const response = await fetchWithAuthFallback(
      `${baseUrl}/v2/${instanceName}/instance/restart`,
      { method: "POST" },
      UAZAPI_TOKEN
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Global Instance] Restart error: ${response.status} - ${errorText}`);
      return c.json({ 
        error: "Failed to restart", 
        status: response.status,
        details: errorText 
      }, response.status, corsHeaders);
    }

    return c.json({ success: true }, 200, corsHeaders);

  } catch (err) {
    console.error("[Global Instance] Restart error:", err);
    return c.json({ error: (err as Error).message }, 500, corsHeaders);
  }
});

Deno.serve(app.fetch);

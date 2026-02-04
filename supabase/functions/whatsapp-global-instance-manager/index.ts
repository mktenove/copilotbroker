import { Hono } from "https://deno.land/x/hono@v3.12.11/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const app = new Hono().basePath("/whatsapp-global-instance-manager");

// Get instance config from environment
const getInstanceConfig = (): { instanceUrl: string; instanceName: string } | null => {
  const url = Deno.env.get("UAZAPI_INSTANCE_URL") || "";
  const token = Deno.env.get("UAZAPI_TOKEN");
  
  if (!url || !token) {
    console.log("Missing config - UAZAPI_INSTANCE_URL:", !!url, "UAZAPI_TOKEN:", !!token);
    return null;
  }
  
  // Extract instance name from URL
  let instanceName = "enove";
  try {
    const urlObj = new URL(url);
    const hostParts = urlObj.hostname.split(".");
    if (hostParts.length >= 2 && hostParts[1].includes("uazapi")) {
      instanceName = hostParts[0];
    }
  } catch {
    console.log("Could not parse URL");
  }
  
  return { instanceUrl: url, instanceName };
};

// Make UAZAPI request with token header
const makeUazapiRequest = async (
  endpoint: string,
  method: string = "GET",
  body?: unknown
): Promise<Response> => {
  const config = getInstanceConfig();
  if (!config) throw new Error("UAZAPI not configured");

  const token = Deno.env.get("UAZAPI_TOKEN")!;
  const url = `${config.instanceUrl.replace(/\/$/, "")}${endpoint}`;
  
  console.log(`Making request: ${method} ${url}`);

  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      "token": token,
    },
  };

  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
  }

  return fetch(url, options);
};

// Normalize status from various UAZAPI response formats
const normalizeStatus = (rawStatus: unknown): string => {
  const statusStr = String(rawStatus || "disconnected").toLowerCase();
  const connected = ["open", "online", "active", "connected"];
  if (connected.includes(statusStr)) return "connected";
  if (statusStr === "qr_pending" || statusStr === "qrcode") return "qr_pending";
  return "disconnected";
};

// Extract status from UAZAPI response (handles multiple response formats)
const extractStatusFromResponse = (data: Record<string, unknown>): { 
  status: string; 
  phoneNumber: string | null; 
  instanceName: string | null;
} => {
  // Format 1: { status: { checked_instance: { connection_status, name } } }
  const checkedInstance = (data?.status as Record<string, unknown>)?.checked_instance as Record<string, unknown> | undefined;
  if (checkedInstance) {
    return {
      status: String(checkedInstance.connection_status || "disconnected"),
      phoneNumber: null,
      instanceName: String(checkedInstance.name || null),
    };
  }
  
  // Format 2: { instance: { state, phoneNumber } }
  const instance = data?.instance as Record<string, unknown> | undefined;
  if (instance) {
    return {
      status: String(instance.state || instance.status || "disconnected"),
      phoneNumber: String(instance.phoneNumber || instance.phone || null),
      instanceName: String(instance.name || null),
    };
  }
  
  // Format 3: { state, phoneNumber }
  return {
    status: String(data?.state || data?.status || data?.connection_status || "disconnected"),
    phoneNumber: String(data?.phoneNumber || data?.phone || null),
    instanceName: String(data?.name || null),
  };
};

// CORS preflight
app.options("/*", () => {
  return new Response(null, { status: 204, headers: corsHeaders });
});

// GET /status - Check global instance status
app.get("/status", async (c) => {
  try {
    const config = getInstanceConfig();
    if (!config) {
      return c.json({ error: "Global instance not configured" }, 500, corsHeaders);
    }

    // The /status endpoint works according to logs
    const response = await makeUazapiRequest("/status");
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Status request failed:", response.status, errorText);
      return c.json({ 
        status: "disconnected",
        instanceName: config.instanceName,
        error: `UAZAPI returned ${response.status}`
      }, 200, corsHeaders);
    }
    
    const data = await response.json();
    console.log("Status response:", JSON.stringify(data));
    
    const extracted = extractStatusFromResponse(data);
    
    return c.json({
      status: normalizeStatus(extracted.status),
      instanceName: extracted.instanceName || config.instanceName,
      phoneNumber: extracted.phoneNumber,
      rawStatus: extracted.status,
      lastSeenAt: new Date().toISOString(),
    }, 200, corsHeaders);
  } catch (error) {
    console.error("Status error:", error);
    return c.json({ 
      status: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error"
    }, 200, corsHeaders);
  }
});

// GET /qrcode
app.get("/qrcode", async (c) => {
  try {
    const config = getInstanceConfig();
    if (!config) {
      return c.json({ error: "Global instance not configured" }, 500, corsHeaders);
    }

    // Try common QR endpoints
    const endpoints = ["/qrcode", "/qr", "/connect"];
    
    for (const endpoint of endpoints) {
      try {
        const response = await makeUazapiRequest(endpoint);
        
        if (response.ok) {
          const data = await response.json();
          const qrCode = data?.qrcode || data?.qr || data?.base64 || data?.qr_code || null;
          if (qrCode) {
            return c.json({ qrCode }, 200, corsHeaders);
          }
        }
      } catch (err) {
        console.log(`QR endpoint ${endpoint} failed:`, err);
      }
    }
    
    return c.json({ error: "Could not get QR code - instance may already be connected" }, 200, corsHeaders);
  } catch (error) {
    console.error("QR error:", error);
    return c.json({ error: error instanceof Error ? error.message : "Unknown error" }, 500, corsHeaders);
  }
});

// POST /logout
app.post("/logout", async (c) => {
  try {
    const endpoints = ["/logout", "/disconnect"];
    
    for (const endpoint of endpoints) {
      try {
        const response = await makeUazapiRequest(endpoint, "POST");
        if (response.ok) {
          return c.json({ success: true, message: "Instance disconnected" }, 200, corsHeaders);
        }
      } catch (err) {
        console.log(`Logout endpoint ${endpoint} failed:`, err);
      }
    }
    
    return c.json({ error: "Could not disconnect" }, 500, corsHeaders);
  } catch (error) {
    console.error("Logout error:", error);
    return c.json({ error: error instanceof Error ? error.message : "Unknown error" }, 500, corsHeaders);
  }
});

// POST /restart
app.post("/restart", async (c) => {
  try {
    const response = await makeUazapiRequest("/restart", "POST");
    
    if (response.ok) {
      return c.json({ success: true, message: "Instance restarted" }, 200, corsHeaders);
    }
    
    const errorText = await response.text();
    return c.json({ error: `Could not restart: ${errorText}` }, 500, corsHeaders);
  } catch (error) {
    console.error("Restart error:", error);
    return c.json({ error: error instanceof Error ? error.message : "Unknown error" }, 500, corsHeaders);
  }
});

Deno.serve(app.fetch);

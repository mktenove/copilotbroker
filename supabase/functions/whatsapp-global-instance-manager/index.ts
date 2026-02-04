import { Hono } from "https://deno.land/x/hono@v3.12.11/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const app = new Hono().basePath("/whatsapp-global-instance-manager");

// Parse instance details from UAZAPI_INSTANCE_URL
const parseInstanceFromUrl = (): { baseUrl: string; instanceName: string } | null => {
  const url = Deno.env.get("UAZAPI_INSTANCE_URL") || "";
  // Expected format: https://api.uazapi.com/v2/instance_name
  const match = url.match(/^(.+?)\/v2\/([^/]+)$/);
  if (match) {
    return { baseUrl: match[1], instanceName: match[2] };
  }
  return null;
};

// Helper to make UAZAPI requests with fallback auth
const makeUazapiRequest = async (
  endpoint: string,
  method: string = "GET",
  body?: unknown
): Promise<Response> => {
  const parsed = parseInstanceFromUrl();
  if (!parsed) {
    throw new Error("UAZAPI_INSTANCE_URL not configured or invalid format");
  }

  const { baseUrl, instanceName } = parsed;
  const token = Deno.env.get("UAZAPI_TOKEN");

  if (!token) {
    throw new Error("UAZAPI_TOKEN not configured");
  }

  const url = `${baseUrl}/v2/${instanceName}${endpoint}`;

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

// Normalize status from UAZAPI to internal format
const normalizeStatus = (uazapiStatus: string): string => {
  const connected = ["open", "online", "active", "connected"];
  if (connected.includes(uazapiStatus?.toLowerCase())) {
    return "connected";
  }
  if (uazapiStatus === "qr_pending" || uazapiStatus === "qrcode") {
    return "qr_pending";
  }
  return "disconnected";
};

// CORS preflight
app.options("/*", (c) => {
  return c.text("", 204, corsHeaders);
});

// GET /status - Check global instance status
app.get("/status", async (c) => {
  try {
    const parsed = parseInstanceFromUrl();
    if (!parsed) {
      return c.json(
        { error: "Global instance not configured" },
        500,
        corsHeaders
      );
    }

    const response = await makeUazapiRequest("/instance/status");
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("UAZAPI status error:", response.status, errorText);
      return c.json(
        { 
          status: "disconnected",
          instanceName: parsed.instanceName,
          error: `UAZAPI returned ${response.status}`
        },
        200,
        corsHeaders
      );
    }

    const data = await response.json();
    const rawStatus = data?.instance?.state || data?.state || data?.status || "disconnected";
    const phoneNumber = data?.instance?.phoneNumber || data?.phoneNumber || null;

    return c.json(
      {
        status: normalizeStatus(rawStatus),
        instanceName: parsed.instanceName,
        phoneNumber,
        rawStatus,
        lastSeenAt: new Date().toISOString(),
      },
      200,
      corsHeaders
    );
  } catch (error) {
    console.error("Status check error:", error);
    return c.json(
      { 
        status: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      200,
      corsHeaders
    );
  }
});

// GET /qrcode - Get QR code for connection
app.get("/qrcode", async (c) => {
  try {
    const parsed = parseInstanceFromUrl();
    if (!parsed) {
      return c.json(
        { error: "Global instance not configured" },
        500,
        corsHeaders
      );
    }

    // Try /instance/connect endpoint for QR code
    const response = await makeUazapiRequest("/instance/connect");

    if (!response.ok) {
      const errorText = await response.text();
      console.error("UAZAPI qrcode error:", response.status, errorText);
      return c.json(
        { error: `Failed to get QR code: ${response.status}` },
        500,
        corsHeaders
      );
    }

    const data = await response.json();
    const qrCode = data?.qrcode || data?.qr || data?.base64 || null;

    if (!qrCode) {
      // Maybe already connected?
      return c.json(
        { 
          error: "No QR code available - instance may already be connected",
          data 
        },
        200,
        corsHeaders
      );
    }

    return c.json({ qrCode }, 200, corsHeaders);
  } catch (error) {
    console.error("QR code fetch error:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
      corsHeaders
    );
  }
});

// POST /logout - Disconnect the instance
app.post("/logout", async (c) => {
  try {
    const response = await makeUazapiRequest("/instance/disconnect", "POST");

    if (!response.ok) {
      const errorText = await response.text();
      console.error("UAZAPI logout error:", response.status, errorText);
      return c.json(
        { error: `Failed to disconnect: ${response.status}` },
        500,
        corsHeaders
      );
    }

    return c.json({ success: true, message: "Instance disconnected" }, 200, corsHeaders);
  } catch (error) {
    console.error("Logout error:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
      corsHeaders
    );
  }
});

// POST /restart - Restart the instance
app.post("/restart", async (c) => {
  try {
    const response = await makeUazapiRequest("/instance/restart", "POST");

    if (!response.ok) {
      const errorText = await response.text();
      console.error("UAZAPI restart error:", response.status, errorText);
      return c.json(
        { error: `Failed to restart: ${response.status}` },
        500,
        corsHeaders
      );
    }

    return c.json({ success: true, message: "Instance restarted" }, 200, corsHeaders);
  } catch (error) {
    console.error("Restart error:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
      corsHeaders
    );
  }
});

Deno.serve(app.fetch);

/**
 * Edge Function: whatsapp-global-instance-manager
 * 
 * Gerencia a instância global do WhatsApp (Enove) para notificações do sistema.
 * 
 * Documentação UAZAPI:
 * - GET /instance/status: Verifica status da conexão
 * - POST /instance/connect: Inicia conexão (gera QR code)
 * - POST /instance/disconnect: Desconecta a instância
 * - Auth: Header "token" com o token da instância
 */

import { Hono } from "https://deno.land/x/hono@v3.12.11/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const app = new Hono().basePath("/whatsapp-global-instance-manager");

// Get configuration from environment
const getConfig = () => {
  const url = Deno.env.get("UAZAPI_INSTANCE_URL");
  const token = Deno.env.get("UAZAPI_TOKEN");
  
  if (!url || !token) {
    return null;
  }
  
  // Extract instance name from URL (e.g., https://enove.uazapi.com -> enove)
  let instanceName = "enove";
  try {
    const urlObj = new URL(url);
    const hostParts = urlObj.hostname.split(".");
    if (hostParts.length >= 2) {
      instanceName = hostParts[0];
    }
  } catch {
    // Keep default
  }
  
  return { 
    baseUrl: url.replace(/\/$/, ""), 
    token, 
    instanceName 
  };
};

// Make UAZAPI request with proper authentication
const makeRequest = async (
  endpoint: string,
  method: string = "GET",
  body?: unknown
): Promise<Response> => {
  const config = getConfig();
  if (!config) throw new Error("UAZAPI não configurado");

  const url = `${config.baseUrl}${endpoint}`;
  console.log(`🌐 ${method} ${url}`);

  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      "token": config.token,
    },
  };

  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
  }

  return fetch(url, options);
};

// CORS preflight handler
app.options("/*", (c) => {
  return c.body(null, 204, corsHeaders);
});

// GET /status - Check instance status
app.get("/status", async (c) => {
  try {
    const config = getConfig();
    if (!config) {
      return c.json({ 
        status: "disconnected", 
        error: "Instância global não configurada" 
      }, 200, corsHeaders);
    }

    const response = await makeRequest("/instance/status");
    const responseText = await response.text();
    
    console.log(`📨 Status response (${response.status}):`, responseText);

    if (!response.ok) {
      return c.json({ 
        status: "disconnected",
        instanceName: config.instanceName,
        error: `UAZAPI retornou ${response.status}`
      }, 200, corsHeaders);
    }

    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      return c.json({ 
        status: "disconnected",
        instanceName: config.instanceName,
        error: "Resposta inválida da UAZAPI"
      }, 200, corsHeaders);
    }

    // Extract status from response
    // Possible formats:
    // 1. { instance: { status: "connected" } }
    // 2. { status: { connected: true } }
    // 3. { instance: { id, status, profileName, ... } }
    const instance = data.instance as Record<string, unknown> | undefined;
    const statusObj = data.status as Record<string, unknown> | undefined;
    
    let connectionStatus = "disconnected";
    let phoneNumber: string | null = null;
    let profileName: string | null = null;
    
    if (instance) {
      const rawStatus = String(instance.status || "").toLowerCase();
      if (rawStatus === "connected" || rawStatus === "open" || rawStatus === "online") {
        connectionStatus = "connected";
      } else if (rawStatus === "connecting") {
        connectionStatus = "connecting";
      }
      phoneNumber = instance.phone as string || null;
      profileName = instance.profileName as string || null;
    }
    
    if (statusObj?.connected === true || statusObj?.loggedIn === true) {
      connectionStatus = "connected";
    }

    // Check if QR code is present (means we're waiting for scan)
    if (instance?.qrcode || data.qrcode) {
      connectionStatus = "qr_pending";
    }

    return c.json({
      status: connectionStatus,
      instanceName: config.instanceName,
      phoneNumber,
      profileName,
      lastSeenAt: new Date().toISOString(),
    }, 200, corsHeaders);

  } catch (error) {
    console.error("❌ Erro ao verificar status:", error);
    return c.json({ 
      status: "disconnected",
      error: error instanceof Error ? error.message : "Erro desconhecido"
    }, 200, corsHeaders);
  }
});

// GET /qrcode - Get QR code for connection
app.get("/qrcode", async (c) => {
  try {
    const config = getConfig();
    if (!config) {
      return c.json({ error: "Instância global não configurada" }, 500, corsHeaders);
    }

    // First, initiate connection to get QR code
    // POST /instance/connect triggers QR code generation
    const connectResponse = await makeRequest("/instance/connect", "POST");
    const connectText = await connectResponse.text();
    
    console.log(`📨 Connect response (${connectResponse.status}):`, connectText);

    let connectData: Record<string, unknown> = {};
    try {
      connectData = JSON.parse(connectText);
    } catch {
      // Try getting status which might have QR code
    }

    // Check for QR code in connect response
    let qrCode = connectData.qrcode as string || 
                 (connectData.instance as Record<string, unknown>)?.qrcode as string ||
                 null;

    // If no QR code in connect response, check status
    if (!qrCode) {
      const statusResponse = await makeRequest("/instance/status");
      const statusText = await statusResponse.text();
      
      try {
        const statusData = JSON.parse(statusText);
        qrCode = statusData.qrcode || 
                 statusData.instance?.qrcode || 
                 null;
      } catch {
        // No QR code available
      }
    }

    if (!qrCode) {
      return c.json({ 
        error: "QR Code não disponível - instância pode já estar conectada" 
      }, 200, corsHeaders);
    }

    return c.json({ qrCode }, 200, corsHeaders);

  } catch (error) {
    console.error("❌ Erro ao obter QR code:", error);
    return c.json({ 
      error: error instanceof Error ? error.message : "Erro desconhecido" 
    }, 500, corsHeaders);
  }
});

// POST /logout - Disconnect instance
app.post("/logout", async (c) => {
  try {
    const config = getConfig();
    if (!config) {
      return c.json({ error: "Instância global não configurada" }, 500, corsHeaders);
    }

    // POST /instance/disconnect
    const response = await makeRequest("/instance/disconnect", "POST");
    const responseText = await response.text();
    
    console.log(`📨 Disconnect response (${response.status}):`, responseText);

    if (!response.ok) {
      return c.json({ 
        error: `Falha ao desconectar: ${response.status}` 
      }, 500, corsHeaders);
    }

    return c.json({ 
      success: true, 
      message: "Instância desconectada com sucesso" 
    }, 200, corsHeaders);

  } catch (error) {
    console.error("❌ Erro ao desconectar:", error);
    return c.json({ 
      error: error instanceof Error ? error.message : "Erro desconhecido" 
    }, 500, corsHeaders);
  }
});

// POST /restart - Restart instance
app.post("/restart", async (c) => {
  try {
    const config = getConfig();
    if (!config) {
      return c.json({ error: "Instância global não configurada" }, 500, corsHeaders);
    }

    // Disconnect first, then reconnect
    console.log("🔄 Reiniciando instância...");
    
    await makeRequest("/instance/disconnect", "POST");
    
    // Wait a bit before reconnecting
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const connectResponse = await makeRequest("/instance/connect", "POST");
    const connectText = await connectResponse.text();
    
    console.log(`📨 Reconnect response (${connectResponse.status}):`, connectText);

    return c.json({ 
      success: true, 
      message: "Instância reiniciada" 
    }, 200, corsHeaders);

  } catch (error) {
    console.error("❌ Erro ao reiniciar:", error);
    return c.json({ 
      error: error instanceof Error ? error.message : "Erro desconhecido" 
    }, 500, corsHeaders);
  }
});

// DELETE /delete - Remove instance completely
app.delete("/delete", async (c) => {
  try {
    const config = getConfig();
    if (!config) {
      return c.json({ error: "Instância global não configurada" }, 500, corsHeaders);
    }

    console.log("🗑️ Removendo instância global...");
    
    // Try to disconnect first (may fail if already disconnected)
    try {
      await makeRequest("/instance/disconnect", "POST");
      console.log("✅ Instância desconectada");
    } catch {
      console.log("⚠️ Não foi possível desconectar (pode já estar desconectada)");
    }
    
    // Try to delete the instance from UAZAPI
    // UAZAPI v2: DELETE /instance/delete
    try {
      const deleteResponse = await makeRequest("/instance/delete", "DELETE");
      const deleteText = await deleteResponse.text();
      console.log(`📨 Delete response (${deleteResponse.status}):`, deleteText);
      
      if (deleteResponse.ok) {
        return c.json({ 
          success: true, 
          message: "Instância removida com sucesso" 
        }, 200, corsHeaders);
      }
    } catch {
      console.log("⚠️ Endpoint DELETE /instance/delete não disponível");
    }
    
    // Try alternative endpoint POST /instance/destroy
    try {
      const destroyResponse = await makeRequest("/instance/destroy", "POST");
      const destroyText = await destroyResponse.text();
      console.log(`📨 Destroy response (${destroyResponse.status}):`, destroyText);
      
      if (destroyResponse.ok) {
        return c.json({ 
          success: true, 
          message: "Instância removida com sucesso" 
        }, 200, corsHeaders);
      }
    } catch {
      console.log("⚠️ Endpoint POST /instance/destroy não disponível");
    }

    // If all deletion endpoints failed, just report disconnection
    return c.json({ 
      success: true, 
      message: "Instância desconectada (remoção completa pode não estar disponível na API)" 
    }, 200, corsHeaders);

  } catch (error) {
    console.error("❌ Erro ao remover instância:", error);
    return c.json({ 
      error: error instanceof Error ? error.message : "Erro desconhecido" 
    }, 500, corsHeaders);
  }
});

Deno.serve(app.fetch);

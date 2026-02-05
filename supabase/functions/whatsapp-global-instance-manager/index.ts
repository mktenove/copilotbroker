/**
 * Edge Function: whatsapp-global-instance-manager
 * 
 * Gerencia a instância global do WhatsApp (Enove) para notificações do sistema.
 * 
 * Documentação UAZAPI:
 * - GET /instance/status: Verifica status da conexão
 * - POST /instance/connect: Inicia conexão (gera QR code)
 * - POST /instance/disconnect: Desconecta a instância
 * - POST /instance/init: Cria nova instância (requer admintoken)
 * - Auth: Header "token" com o token da instância, ou "admintoken" para admin
 */

import { Hono } from "https://deno.land/x/hono@v3.12.11/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const app = new Hono().basePath("/whatsapp-global-instance-manager");

// Configuration
interface Config {
  baseUrl: string;
  adminToken: string;
  instanceToken: string | null;
  instanceName: string;
}

// Get configuration from environment
const getConfig = (): Config | null => {
  const url = Deno.env.get("UAZAPI_INSTANCE_URL");
  const adminToken = Deno.env.get("UAZAPI_ADMIN_TOKEN");
  const instanceToken = Deno.env.get("UAZAPI_TOKEN");
  
  if (!url || !adminToken) {
    console.error("❌ UAZAPI_INSTANCE_URL ou UAZAPI_ADMIN_TOKEN não configurados");
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
    adminToken,
    instanceToken: instanceToken || null,
    instanceName 
  };
};

// Make UAZAPI request with authentication fallback
const makeRequest = async (
  endpoint: string,
  method: string = "GET",
  body?: unknown,
  useAdminToken: boolean = false
): Promise<Response> => {
  const config = getConfig();
  if (!config) throw new Error("UAZAPI não configurado");

  const url = `${config.baseUrl}${endpoint}`;
  console.log(`🌐 ${method} ${url} (useAdminToken: ${useAdminToken})`);

  // Try different auth headers
  const authHeaders = useAdminToken 
    ? [
        { "admintoken": config.adminToken },
        { "token": config.adminToken },
      ]
    : [
        { "token": config.instanceToken || config.adminToken },
        { "admintoken": config.adminToken },
      ];

  let lastResponse: Response | null = null;
  let lastError: string = "";

  for (const authHeader of authHeaders) {
    try {
      const options: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
      };

      if (body && method !== "GET") {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      
      // If we get 401, try next auth header
      if (response.status === 401) {
        lastError = `401 com header ${Object.keys(authHeader)[0]}`;
        console.log(`⚠️ ${lastError}, tentando próximo...`);
        lastResponse = response;
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Erro desconhecido";
      console.error(`❌ Erro com header ${Object.keys(authHeader)[0]}:`, lastError);
    }
  }

  // Return last response or throw
  if (lastResponse) return lastResponse;
  throw new Error(lastError || "Todas as tentativas de autenticação falharam");
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
        error: "Instância global não configurada (UAZAPI_ADMIN_TOKEN necessário)" 
      }, 200, corsHeaders);
    }

    const response = await makeRequest("/instance/status");
    const responseText = await response.text();
    
    console.log(`📨 Status response (${response.status}):`, responseText);

    if (!response.ok) {
      // 401 means instance might not exist
      if (response.status === 401 || response.status === 404) {
        return c.json({ 
          status: "disconnected",
          instanceName: config.instanceName,
          needsInit: true,
          error: "Instância não encontrada ou token inválido - crie uma nova instância"
        }, 200, corsHeaders);
      }
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
      needsInit: true,
      error: error instanceof Error ? error.message : "Erro desconhecido"
    }, 200, corsHeaders);
  }
});

// POST /init - Create new instance
app.post("/init", async (c) => {
  try {
    const config = getConfig();
    if (!config) {
      return c.json({ error: "UAZAPI_ADMIN_TOKEN não configurado" }, 500, corsHeaders);
    }

    const instanceName = `enove_global_${Date.now()}`;
    console.log(`🆕 Criando nova instância: ${instanceName}`);

    // Create instance using admin token
    const initResponse = await fetch(`${config.baseUrl}/instance/init`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "admintoken": config.adminToken,
      },
      body: JSON.stringify({
        name: instanceName,
        token: config.adminToken, // Use admin token as instance token initially
      }),
    });

    const initText = await initResponse.text();
    console.log(`📨 Init response (${initResponse.status}):`, initText);

    if (!initResponse.ok) {
      // Try alternative endpoint
      console.log("⚠️ /instance/init falhou, tentando /instance/create...");
      
      const createResponse = await fetch(`${config.baseUrl}/instance/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "admintoken": config.adminToken,
        },
        body: JSON.stringify({
          name: instanceName,
        }),
      });

      const createText = await createResponse.text();
      console.log(`📨 Create response (${createResponse.status}):`, createText);

      if (!createResponse.ok) {
        return c.json({ 
          error: `Falha ao criar instância: ${initResponse.status} / ${createResponse.status}`,
          details: createText
        }, 500, corsHeaders);
      }

      let createData: Record<string, unknown> = {};
      try {
        createData = JSON.parse(createText);
      } catch {
        // Continue anyway
      }

      return c.json({
        success: true,
        instanceName,
        token: createData.token || null,
        message: "Instância criada via /instance/create"
      }, 200, corsHeaders);
    }

    let initData: Record<string, unknown> = {};
    try {
      initData = JSON.parse(initText);
    } catch {
      // Continue anyway
    }

    // Extract new token if provided
    const newToken = initData.token as string || 
                     (initData.instance as Record<string, unknown>)?.token as string ||
                     null;

    return c.json({
      success: true,
      instanceName,
      token: newToken,
      qrCode: initData.qrcode || (initData.instance as Record<string, unknown>)?.qrcode || null,
      message: "Instância criada com sucesso"
    }, 200, corsHeaders);

  } catch (error) {
    console.error("❌ Erro ao criar instância:", error);
    return c.json({ 
      error: error instanceof Error ? error.message : "Erro desconhecido" 
    }, 500, corsHeaders);
  }
});

// GET /qrcode - Get QR code for connection (smart: creates if needed)
app.get("/qrcode", async (c) => {
  try {
    const config = getConfig();
    if (!config) {
      return c.json({ error: "Instância global não configurada" }, 500, corsHeaders);
    }

    // First, try to connect existing instance
    console.log("🔗 Tentando conectar instância existente...");
    const connectResponse = await makeRequest("/instance/connect", "POST");
    const connectText = await connectResponse.text();
    
    console.log(`📨 Connect response (${connectResponse.status}):`, connectText);

    // If 401 or 404, instance doesn't exist - create new one
    if (connectResponse.status === 401 || connectResponse.status === 404) {
      console.log("⚠️ Instância não existe, criando nova...");
      
      const instanceName = `enove_global_${Date.now()}`;
      
      // Try to create via init
      const initResponse = await fetch(`${config.baseUrl}/instance/init`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "admintoken": config.adminToken,
        },
        body: JSON.stringify({
          name: instanceName,
        }),
      });

      const initText = await initResponse.text();
      console.log(`📨 Init response (${initResponse.status}):`, initText);

      if (!initResponse.ok) {
        return c.json({ 
          error: "Falha ao criar instância - verifique o UAZAPI_ADMIN_TOKEN",
          needsInit: true,
          status: initResponse.status
        }, 200, corsHeaders);
      }

      let initData: Record<string, unknown> = {};
      try {
        initData = JSON.parse(initText);
      } catch {
        // Continue
      }

      const qrCode = initData.qrcode || 
                     (initData.instance as Record<string, unknown>)?.qrcode ||
                     null;

      if (qrCode) {
        return c.json({ qrCode, instanceName, newInstance: true }, 200, corsHeaders);
      }

      // Try to get QR code from status after init
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(`${config.baseUrl}/instance/status`, {
        headers: {
          "Content-Type": "application/json",
          "admintoken": config.adminToken,
        },
      });
      
      const statusText = await statusResponse.text();
      console.log(`📨 Status after init (${statusResponse.status}):`, statusText);

      try {
        const statusData = JSON.parse(statusText);
        const statusQr = statusData.qrcode || statusData.instance?.qrcode;
        if (statusQr) {
          return c.json({ qrCode: statusQr, instanceName, newInstance: true }, 200, corsHeaders);
        }
      } catch {
        // No QR
      }

      return c.json({ 
        error: "Instância criada mas QR Code não disponível ainda - tente novamente",
        instanceName,
        newInstance: true
      }, 200, corsHeaders);
    }

    // Parse connect response for QR code
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

// POST /clear-session - Disconnect and clear session
app.post("/clear-session", async (c) => {
  try {
    const config = getConfig();
    if (!config) {
      return c.json({ error: "Instância global não configurada" }, 500, corsHeaders);
    }

    console.log("🧹 Limpando sessão da instância global...");
    
    const response = await makeRequest("/instance/disconnect", "POST");
    const responseText = await response.text();
    
    console.log(`📨 Disconnect response (${response.status}):`, responseText);

    // Even if disconnect fails (already disconnected), we consider it a success
    return c.json({ 
      success: true, 
      message: "Sessão limpa com sucesso" 
    }, 200, corsHeaders);

  } catch (error) {
    console.error("❌ Erro ao limpar sessão:", error);
    return c.json({ 
      error: error instanceof Error ? error.message : "Erro desconhecido" 
    }, 500, corsHeaders);
  }
});

Deno.serve(app.fetch);

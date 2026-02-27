/**
 * Edge Function: whatsapp-global-instance-manager
 * 
 * Gerencia a instância global do WhatsApp (Enove) para notificações do sistema.
 * Persiste credenciais no banco de dados para sobreviver a restarts da função.
 * 
 * Documentação UAZAPI:
 * - GET /instance/status: Verifica status da conexão
 * - POST /instance/connect: Inicia conexão (gera QR code)
 * - POST /instance/disconnect: Desconecta a instância
 * - POST /instance/init: Cria nova instância (requer admintoken)
 * - Auth: Header "token" com o token da instância, ou "admintoken" para admin
 */

import { Hono } from "https://deno.land/x/hono@v3.12.11/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/security.ts";

// Dynamic CORS helper for Hono — builds headers from the request's Origin
function getHonoCors(c: { req: { header: (name: string) => string | undefined } }): Record<string, string> {
  const origin = c.req.header("origin") || "";
  return { ...getCorsHeaders(new Request("https://dummy", { headers: { origin } })), "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
}

// Default corsHeaders for routes that don't have access to `c` easily.
// The preflight handler uses getHonoCors(c) for dynamic origin.
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://onovocondominio.com.br",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

interface StoredInstance {
  id: string;
  instance_name: string;
  instance_token: string;
  phone_number: string | null;
  status: string;
}

// Get Supabase client with service role for DB operations
const getSupabaseClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados");
    return null;
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
};

// Get stored instance from database
const getStoredInstance = async (): Promise<StoredInstance | null> => {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  
  try {
    const { data, error } = await supabase
      .from("global_whatsapp_config")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      if (error.code === "PGRST116") {
        // No rows found
        return null;
      }
      console.error("❌ Erro ao buscar instância do banco:", error);
      return null;
    }
    
    return data as StoredInstance;
  } catch (err) {
    console.error("❌ Erro ao buscar instância:", err);
    return null;
  }
};

// Save instance to database
const saveInstance = async (instanceName: string, instanceToken: string, phoneNumber?: string): Promise<boolean> => {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  
  try {
    // First, delete any existing config
    await supabase.from("global_whatsapp_config").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    
    // Insert new config
    const { error } = await supabase
      .from("global_whatsapp_config")
      .insert({
        instance_name: instanceName,
        instance_token: instanceToken,
        phone_number: phoneNumber || null,
        status: "disconnected",
      });
    
    if (error) {
      console.error("❌ Erro ao salvar instância:", error);
      return false;
    }
    
    console.log(`✅ Instância salva no banco: ${instanceName}`);
    return true;
  } catch (err) {
    console.error("❌ Erro ao salvar instância:", err);
    return false;
  }
};

// Update instance status in database
const updateInstanceStatus = async (status: string, phoneNumber?: string): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  
  try {
    const updateData: Record<string, unknown> = { status };
    if (phoneNumber) updateData.phone_number = phoneNumber;
    
    // Need a proper filter for PostgREST UPDATE - update all rows (there should be only one)
    const { error } = await supabase
      .from("global_whatsapp_config")
      .update(updateData)
      .neq("id", "00000000-0000-0000-0000-000000000000");
    
    if (error) {
      console.error("❌ Erro ao atualizar status no banco:", error);
    } else {
      console.log(`✅ Status atualizado no banco: ${status}`);
    }
  } catch (err) {
    console.error("❌ Erro ao atualizar status:", err);
  }
};

// Clear instance from database
const clearStoredInstance = async (): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  
  try {
    await supabase.from("global_whatsapp_config").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("🧹 Instância removida do banco");
  } catch (err) {
    console.error("❌ Erro ao limpar instância:", err);
  }
};

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

// Make UAZAPI request with specific token
const makeRequestWithToken = async (
  baseUrl: string,
  endpoint: string,
  token: string,
  method: string = "GET",
  body?: unknown
): Promise<Response> => {
  const url = `${baseUrl}${endpoint}`;
  console.log(`🌐 ${method} ${url}`);
  
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

  return await fetch(url, options);
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
  return c.body(null, 204, getHonoCors(c));
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

    // First, check if we have a stored instance in the database
    const storedInstance = await getStoredInstance();
    
    if (storedInstance) {
      console.log(`🔍 Verificando status da instância salva: ${storedInstance.instance_name}`);
      
      try {
        const response = await makeRequestWithToken(
          config.baseUrl,
          "/instance/status",
          storedInstance.instance_token
        );
        
        const responseText = await response.text();
        console.log(`📨 Status response (${response.status}):`, responseText);

        if (response.ok) {
          let data: Record<string, unknown> = {};
          try {
            data = JSON.parse(responseText);
          } catch {
            // Continue
          }

          // Extract status
          const instance = data.instance as Record<string, unknown> | undefined;
          const statusObj = data.status as Record<string, unknown> | undefined;
          
          let connectionStatus = "disconnected";
          let phoneNumber: string | null = storedInstance.phone_number;
          let profileName: string | null = null;
          
          if (instance) {
            const rawStatus = String(instance.status || "").toLowerCase();
            if (rawStatus === "connected" || rawStatus === "open" || rawStatus === "online") {
              connectionStatus = "connected";
            } else if (rawStatus === "connecting") {
              connectionStatus = "connecting";
            }
            phoneNumber = instance.phone as string || phoneNumber;
            profileName = instance.profileName as string || null;
          }
          
          if (statusObj?.connected === true || statusObj?.loggedIn === true) {
            connectionStatus = "connected";
          }

          // Check if QR code is present (means we're waiting for scan)
          if (instance?.qrcode || data.qrcode) {
            connectionStatus = "qr_pending";
          }

          // Update status in DB
          await updateInstanceStatus(connectionStatus, phoneNumber || undefined);

          return c.json({
            status: connectionStatus,
            instanceName: storedInstance.instance_name,
            phoneNumber,
            profileName,
            lastSeenAt: new Date().toISOString(),
          }, 200, corsHeaders);
        }
        
        // If 401, token might be invalid - clear stored instance
        if (response.status === 401) {
          console.log("⚠️ Token armazenado inválido, limpando...");
          await clearStoredInstance();
        }
      } catch (err) {
        console.error("❌ Erro ao verificar instância salva:", err);
      }
    }

    // Fallback: try with environment tokens
    console.log("🔄 Tentando com tokens de ambiente...");
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
        token: config.adminToken,
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

      const newToken = createData.token as string || 
                       (createData.instance as Record<string, unknown>)?.token as string || 
                       config.adminToken;
      
      // Save to database
      await saveInstance(instanceName, newToken);

      return c.json({
        success: true,
        instanceName,
        token: newToken,
        message: "Instância criada via /instance/create"
      }, 200, corsHeaders);
    }

    let initData: Record<string, unknown> = {};
    try {
      initData = JSON.parse(initText);
    } catch {
      // Continue anyway
    }

    // Extract new token from response
    const instanceData = initData.instance as Record<string, unknown> | undefined;
    const newToken = initData.token as string || 
                     instanceData?.token as string ||
                     config.adminToken;
    
    const returnedName = instanceData?.name as string || instanceName;
    
    // Save to database for persistence
    await saveInstance(returnedName, newToken);
    console.log(`✅ Instância criada: ${returnedName}, token: ${newToken.substring(0, 8)}...`);

    // Wait for UAZAPI to generate QR
    console.log("⏳ Aguardando 2s para QR Code ser gerado...");
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Try to fetch QR code using the NEW token
    let qrCode: string | null = null;
    
    // Try connectionState endpoint first
    const qrEndpoints = [
      `/instance/connectionState/${returnedName}`,
      `/instance/connect`,
      `/instance/qrcode`,
    ];

    for (const endpoint of qrEndpoints) {
      try {
        console.log(`🔍 Tentando obter QR via: ${endpoint}`);
        const qrResponse = await makeRequestWithToken(config.baseUrl, endpoint, newToken, endpoint.includes("connect") ? "POST" : "GET");

        const qrText = await qrResponse.text();
        console.log(`📨 QR response (${qrResponse.status}):`, qrText.substring(0, 200));

        if (qrResponse.ok) {
          try {
            const qrData = JSON.parse(qrText);
            qrCode = qrData.qrcode || 
                     qrData.qr || 
                     qrData.base64 ||
                     (qrData.instance as Record<string, unknown>)?.qrcode as string ||
                     null;
            
            if (qrCode) {
              console.log(`✅ QR Code obtido via ${endpoint}`);
              break;
            }
          } catch {
            // Try next endpoint
          }
        }
      } catch (err) {
        console.error(`❌ Erro ao buscar QR via ${endpoint}:`, err);
      }
    }

    return c.json({
      success: true,
      instanceName: returnedName,
      token: newToken,
      qrCode,
      message: qrCode ? "Instância criada com QR Code" : "Instância criada, aguarde para QR Code"
    }, 200, corsHeaders);

  } catch (error) {
    console.error("❌ Erro ao criar instância:", error);
    return c.json({ 
      error: error instanceof Error ? error.message : "Erro desconhecido" 
    }, 500, corsHeaders);
  }
});

// GET /qrcode - Get QR code for connection (smart: uses stored token or creates new instance)
app.get("/qrcode", async (c) => {
  try {
    const config = getConfig();
    if (!config) {
      return c.json({ error: "Instância global não configurada" }, 500, corsHeaders);
    }

    // Check for stored instance in database
    const storedInstance = await getStoredInstance();
    
    if (storedInstance) {
      console.log(`🔄 Usando token salvo: ${storedInstance.instance_name}`);
      
      const qrEndpoints = [
        `/instance/connectionState/${storedInstance.instance_name}`,
        `/instance/connect`,
      ];

      for (const endpoint of qrEndpoints) {
        try {
          console.log(`🔍 Buscando QR via: ${endpoint}`);
          const qrResponse = await makeRequestWithToken(
            config.baseUrl,
            endpoint,
            storedInstance.instance_token,
            endpoint.includes("connect") ? "POST" : "GET"
          );

          const qrText = await qrResponse.text();
          console.log(`📨 QR response (${qrResponse.status}):`, qrText.substring(0, 200));

          if (qrResponse.ok) {
            try {
              const qrData = JSON.parse(qrText);
              const qrCode = qrData.qrcode || 
                             qrData.qr || 
                             qrData.base64 ||
                             (qrData.instance as Record<string, unknown>)?.qrcode as string ||
                             null;
              
              if (qrCode) {
                return c.json({ qrCode, instanceName: storedInstance.instance_name }, 200, corsHeaders);
              }
            } catch {
              // Try next endpoint
            }
          }
          
          // If 401, token might be invalid
          if (qrResponse.status === 401) {
            console.log("⚠️ Token salvo inválido, limpando...");
            await clearStoredInstance();
            break;
          }
        } catch (err) {
          console.error(`❌ Erro ao buscar QR via ${endpoint}:`, err);
        }
      }
    }

    // Fallback: try to connect existing instance with env tokens
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

      const instanceData = initData.instance as Record<string, unknown> | undefined;
      const newToken = initData.token as string || 
                       instanceData?.token as string ||
                       config.adminToken;
      
      const returnedName = instanceData?.name as string || instanceName;
      
      // Save to database
      await saveInstance(returnedName, newToken);

      // Wait and fetch QR
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const qrResponse = await makeRequestWithToken(
        config.baseUrl,
        `/instance/connectionState/${returnedName}`,
        newToken
      );
      
      const qrText = await qrResponse.text();
      console.log(`📨 QR after init (${qrResponse.status}):`, qrText.substring(0, 200));

      try {
        const qrData = JSON.parse(qrText);
        const qrCode = qrData.qrcode || qrData.qr || qrData.base64 || null;
        if (qrCode) {
          return c.json({ qrCode, instanceName: returnedName, newInstance: true }, 200, corsHeaders);
        }
      } catch {
        // No QR
      }

      return c.json({ 
        error: "Instância criada mas QR Code não disponível ainda - tente novamente",
        instanceName: returnedName,
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

    // Get stored instance to use correct token
    const storedInstance = await getStoredInstance();
    
    let response: Response;
    if (storedInstance) {
      response = await makeRequestWithToken(
        config.baseUrl,
        "/instance/disconnect",
        storedInstance.instance_token,
        "POST"
      );
    } else {
      response = await makeRequest("/instance/disconnect", "POST");
    }
    
    const responseText = await response.text();
    console.log(`📨 Disconnect response (${response.status}):`, responseText);

    // Clear stored instance from database
    await clearStoredInstance();

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
    
    // Get stored instance
    const storedInstance = await getStoredInstance();
    
    if (storedInstance) {
      await makeRequestWithToken(config.baseUrl, "/instance/disconnect", storedInstance.instance_token, "POST");
      await new Promise(resolve => setTimeout(resolve, 2000));
      const connectResponse = await makeRequestWithToken(config.baseUrl, "/instance/connect", storedInstance.instance_token, "POST");
      const connectText = await connectResponse.text();
      console.log(`📨 Reconnect response (${connectResponse.status}):`, connectText);
    } else {
      await makeRequest("/instance/disconnect", "POST");
      await new Promise(resolve => setTimeout(resolve, 2000));
      const connectResponse = await makeRequest("/instance/connect", "POST");
      const connectText = await connectResponse.text();
      console.log(`📨 Reconnect response (${connectResponse.status}):`, connectText);
    }

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
    
    // Get stored instance
    const storedInstance = await getStoredInstance();
    
    if (storedInstance) {
      const response = await makeRequestWithToken(config.baseUrl, "/instance/disconnect", storedInstance.instance_token, "POST");
      const responseText = await response.text();
      console.log(`📨 Disconnect response (${response.status}):`, responseText);
    } else {
      const response = await makeRequest("/instance/disconnect", "POST");
      const responseText = await response.text();
      console.log(`📨 Disconnect response (${response.status}):`, responseText);
    }

    // Clear stored instance from database
    await clearStoredInstance();

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

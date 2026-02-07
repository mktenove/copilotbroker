/**
 * Edge Function: notify-new-lead
 * 
 * Envia notificação de novo lead para o corretor via WhatsApp usando a instância global.
 * Busca o token do banco de dados (global_whatsapp_config) para persistência.
 * 
 * Documentação UAZAPI v2:
 * - Endpoint: POST /{instance_name}/send/text
 * - Auth: Header "token" com o token da instância
 * - Payload: { number: "5511999999999", text: "mensagem" }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Variables for logging
  let leadId: string | null = null;
  let brokerIdForLog: string | null = null;
  let recipientName = "Enove";

  try {
    // Fetch stored global instance from database
    const { data: storedInstance, error: fetchError } = await supabase
      .from("global_whatsapp_config")
      .select("instance_name, instance_token, status")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.warn("⚠️ Erro ao buscar configuração do banco:", fetchError.message);
    }

    console.log("🔧 Configuração encontrada no banco:", {
      hasStoredInstance: !!storedInstance,
      instanceName: storedInstance?.instance_name || null,
      status: storedInstance?.status || null,
      hasToken: !!storedInstance?.instance_token,
    });

    // Get base URL from environment (e.g., "https://enove.uazapi.com" or "https://enove.uazapi.com/old_instance")
    const envInstanceUrl = Deno.env.get("UAZAPI_INSTANCE_URL") || "";
    
    // Extract just the origin (protocol + host) from the URL
    let baseApiUrl: string;
    try {
      baseApiUrl = new URL(envInstanceUrl).origin;
    } catch {
      // If URL parsing fails, try to extract manually
      baseApiUrl = envInstanceUrl.replace(/\/[^\/]+\/?$/, "");
    }

    let instanceUrl: string;
    let instanceToken: string;

    if (storedInstance?.instance_token && storedInstance?.instance_name) {
      // Use stored configuration from database
      // UAZAPI v2: base URL only, instance identified by token header
      instanceUrl = baseApiUrl;
      instanceToken = storedInstance.instance_token;
      console.log("✅ Usando token persistido do banco de dados");
    } else {
      // Fallback to environment variables
      instanceUrl = envInstanceUrl;
      instanceToken = Deno.env.get("UAZAPI_TOKEN") || "";
      console.log("⚠️ Fallback para variáveis de ambiente");
    }

    const fallbackPhone = Deno.env.get("ENOVE_WHATSAPP");

    console.log("🔧 Configuração final:", {
      baseApiUrl,
      instanceUrl: instanceUrl ? instanceUrl.substring(0, 60) + "..." : null,
      hasInstanceToken: !!instanceToken,
      tokenPreview: instanceToken ? instanceToken.substring(0, 10) + "..." : null,
      hasFallbackPhone: !!fallbackPhone,
    });

    if (!instanceUrl || !instanceToken) {
      console.error("❌ UAZAPI não configurado - URL ou Token ausente");
      return new Response(
        JSON.stringify({ success: false, error: "UAZAPI não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json();
    leadId = body.leadId;
    const leadName = body.leadName;
    const leadWhatsapp = body.leadWhatsapp;
    const brokerId = body.brokerId;
    const source = body.source;
    
    console.log("📥 Notificação recebida:", { leadId, leadName, leadWhatsapp, brokerId, source });

    // Determine recipient
    let recipientPhone = fallbackPhone;

    if (brokerId) {
      const { data: broker } = await supabase
        .from("brokers")
        .select("id, name, whatsapp")
        .eq("id", brokerId)
        .single();

      if (broker?.whatsapp) {
        recipientPhone = broker.whatsapp;
        recipientName = broker.name;
        brokerIdForLog = broker.id;
        console.log(`👤 Corretor encontrado: ${recipientName} (${recipientPhone})`);
      }
    }

    if (!recipientPhone) {
      console.error("❌ Nenhum telefone disponível para notificação");
      
      // Log the failure
      if (leadId && !leadId.startsWith("test-")) {
        await supabase.from("lead_interactions").insert({
          lead_id: leadId,
          broker_id: brokerIdForLog,
          interaction_type: "notification",
          channel: "whatsapp",
          notes: `❌ Falha: Nenhum telefone disponível para notificação`,
        });
      }
      
      return new Response(
        JSON.stringify({ success: false, error: "Nenhum telefone disponível" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number (remove non-digits)
    const cleanPhone = recipientPhone.replace(/\D/g, "");
    console.log(`📱 Enviando para: ${cleanPhone}`);

    // Build notification message
    const messageText = `🏠 *Novo Lead Cadastrado!*

👤 *Nome:* ${leadName}
📱 *WhatsApp:* ${leadWhatsapp}
📍 *Origem:* ${source || "Site Enove"}

Entre em contato o mais rápido possível!`;

    // Build API URL - UAZAPI v2 format: /{instance_name}/send/text
    const apiUrl = `${instanceUrl.replace(/\/$/, "")}/send/text`;

    console.log(`🌐 Chamando UAZAPI:`, {
      url: apiUrl,
      method: "POST",
    });

    // Send message via UAZAPI v2
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": instanceToken,
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: messageText,
      }),
    });

    const responseText = await response.text();
    console.log(`📨 Resposta UAZAPI (${response.status}):`, responseText.substring(0, 500));

    // Parse response
    let responseData: Record<string, unknown> = {};
    try {
      responseData = JSON.parse(responseText);
    } catch {
      console.log("⚠️ Resposta não é JSON válido");
    }

    // Check for success - UAZAPI v2 retorna 200 para sucesso
    const isSuccess = response.ok && !responseData.error;

    // Log interaction (skip for test leads)
    if (leadId && !leadId.startsWith("test-")) {
      const { error: insertError } = await supabase.from("lead_interactions").insert({
        lead_id: leadId,
        broker_id: brokerIdForLog,
        interaction_type: "notification",
        channel: "whatsapp",
        notes: isSuccess
          ? `✅ Notificação enviada para ${recipientName}`
          : `❌ Falha ao enviar: ${JSON.stringify(responseData.error || response.statusText)}`,
      });
      
      if (insertError) {
        console.error("❌ Erro ao registrar interação:", insertError);
      } else {
        console.log("✅ Interação registrada com sucesso");
      }
    }

    if (!isSuccess) {
      console.error("❌ Falha ao enviar mensagem:", {
        status: response.status,
        error: responseData.error || responseData,
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: responseData.error || response.statusText,
          status: response.status,
          url: apiUrl,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Notificação enviada com sucesso!");
    return new Response(
      JSON.stringify({ 
        success: true, 
        recipient: recipientName, 
        phone: cleanPhone,
        messageId: responseData.id || responseData.messageid,
        source: storedInstance ? "database" : "env_fallback"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Erro na função:", error);
    
    // Try to log the error even when the function crashes
    if (leadId && !leadId.startsWith("test-")) {
      try {
        await supabase.from("lead_interactions").insert({
          lead_id: leadId,
          broker_id: brokerIdForLog,
          interaction_type: "notification",
          channel: "whatsapp",
          notes: `❌ Erro no sistema: ${String(error).substring(0, 200)}`,
        });
        console.log("✅ Erro registrado no histórico do lead");
      } catch (logError) {
        console.error("❌ Falha ao registrar erro:", logError);
      }
    }
    
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Edge Function: notify-new-lead
 * 
 * Envia notificação de novo lead para o corretor via WhatsApp usando a instância global.
 * 
 * Documentação UAZAPI v2:
 * - Endpoint: POST /send/text
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

  try {
    // Configuração da instância global
    const instanceUrl = Deno.env.get("UAZAPI_INSTANCE_URL");
    const instanceToken = Deno.env.get("UAZAPI_TOKEN");
    const fallbackPhone = Deno.env.get("ENOVE_WHATSAPP");

    console.log("🔧 Configuração:", {
      hasInstanceUrl: !!instanceUrl,
      hasInstanceToken: !!instanceToken,
      hasFallbackPhone: !!fallbackPhone,
      instanceUrlPreview: instanceUrl ? instanceUrl.substring(0, 50) + "..." : null,
    });

    if (!instanceUrl || !instanceToken) {
      console.error("❌ UAZAPI não configurado - UAZAPI_INSTANCE_URL ou UAZAPI_TOKEN ausente");
      return new Response(
        JSON.stringify({ success: false, error: "UAZAPI não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { leadId, leadName, leadWhatsapp, brokerId, source } = await req.json();
    console.log("📥 Notificação recebida:", { leadId, leadName, leadWhatsapp, brokerId, source });

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Determine recipient
    let recipientPhone = fallbackPhone;
    let recipientName = "Enove";
    let brokerIdForLog: string | null = null;

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

    // Build API URL - UAZAPI v2 format
    // A URL base deve ser algo como: https://enove.uazapi.com
    // O endpoint é: POST /send/text
    const baseUrl = instanceUrl.replace(/\/$/, "");
    const apiUrl = `${baseUrl}/send/text`;

    console.log(`🌐 Chamando UAZAPI:`, {
      url: apiUrl,
      method: "POST",
      hasToken: !!instanceToken,
      tokenPreview: instanceToken ? instanceToken.substring(0, 10) + "..." : null,
    });

    // Send message via UAZAPI v2
    // Documentação: POST /send/text com header "token"
    // Payload: { number, text }
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
      await supabase.from("lead_interactions").insert({
        lead_id: leadId,
        broker_id: brokerIdForLog,
        interaction_type: "notification",
        channel: "whatsapp",
        notes: isSuccess
          ? `✅ Notificação enviada para ${recipientName}`
          : `❌ Falha ao enviar: ${JSON.stringify(responseData.error || response.statusText)}`,
      });
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
        messageId: responseData.id || responseData.messageid
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Erro na função:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

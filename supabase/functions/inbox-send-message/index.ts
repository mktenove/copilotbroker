import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UAZAPI_INSTANCE_URL = Deno.env.get("UAZAPI_INSTANCE_URL") || "";
const UAZAPI_TOKEN = Deno.env.get("UAZAPI_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const formatPhoneForUAZAPI = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.startsWith("55") ? cleaned : `55${cleaned}`;
};

/**
 * Send text via UAZAPI with fallback endpoints + auth headers
 */
async function sendViaUAZAPI(
  instanceToken: string | null,
  phone: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const cleanPhone = formatPhoneForUAZAPI(phone);
  const token = instanceToken || UAZAPI_TOKEN;

  let baseUrl = UAZAPI_INSTANCE_URL.replace(/\/$/, "");
  try {
    baseUrl = new URL(baseUrl).origin;
  } catch { /* keep as-is */ }

  // Fallback endpoints
  const endpoints = ["/send/text", "/chat/send/text"];
  // Fallback auth headers
  const authHeaders = [
    { token },
    { admintoken: token },
    { apikey: token },
    { "x-api-key": token },
    { Authorization: `Bearer ${token}` },
  ];

  for (const endpoint of endpoints) {
    for (const authHeader of authHeaders) {
      try {
        const url = `${baseUrl}${endpoint}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify({ number: cleanPhone, text }),
        });

        if (res.status === 401 || res.status === 404) {
          await res.text(); // consume body
          continue;
        }

        const responseText = await res.text();
        if (!res.ok) {
          return { success: false, error: `HTTP ${res.status}: ${responseText}` };
        }

        let result: Record<string, unknown> = {};
        try { result = JSON.parse(responseText); } catch { /* ok */ }

        if (result.error) {
          return { success: false, error: String(result.error) };
        }

        const messageId = String(
          result.id || result.messageid || (result.key as Record<string, unknown>)?.id || ""
        );
        console.log(`✅ Mensagem enviada via ${endpoint} para ${cleanPhone}`);
        return { success: true, messageId };
      } catch (err) {
        console.warn(`⚠️ Falha ${endpoint}:`, (err as Error).message);
        continue;
      }
    }
  }

  return { success: false, error: "Todos os endpoints falharam" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { conversation_id, content } = await req.json();
    if (!conversation_id || !content) {
      return new Response(JSON.stringify({ error: "conversation_id and content are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Get conversation
    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .select("id, broker_id, phone, phone_normalized, lead_id")
      .eq("id", conversation_id)
      .single();

    if (convError || !conv) {
      return new Response(JSON.stringify({ error: "Conversa não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Get broker's WhatsApp instance
    const { data: instance } = await supabase
      .from("broker_whatsapp_instances")
      .select("instance_name, instance_token, status")
      .eq("broker_id", conv.broker_id)
      .maybeSingle();

    if (!instance || instance.status !== "connected") {
      return new Response(
        JSON.stringify({ error: "Instância WhatsApp não conectada. Conecte seu WhatsApp primeiro." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Send via UAZAPI
    const sendResult = await sendViaUAZAPI(
      instance.instance_token,
      conv.phone_normalized || conv.phone,
      content
    );

    if (!sendResult.success) {
      return new Response(
        JSON.stringify({ error: `Falha ao enviar: ${sendResult.error}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Save message in conversation_messages
    const { data: msg, error: msgError } = await supabase
      .from("conversation_messages")
      .insert({
        conversation_id,
        direction: "outbound",
        content,
        sent_by: "human",
        message_type: "text",
        status: "sent",
        uazapi_message_id: sendResult.messageId || null,
      })
      .select()
      .single();

    if (msgError) {
      console.error("Erro ao salvar mensagem:", msgError);
    }

    // 5. Register in lead_interactions for audit
    if (conv.lead_id) {
      await supabase.from("lead_interactions").insert({
        lead_id: conv.lead_id,
        interaction_type: "whatsapp_enviada",
        broker_id: conv.broker_id,
        notes: content.substring(0, 200),
        channel: "whatsapp",
        created_by: user.id,
      }).catch((e: Error) => console.error("Erro ao registrar interação:", e));
    }

    // 6. Update conversation status
    await supabase
      .from("conversations")
      .update({
        status: "attending",
        last_message_at: new Date().toISOString(),
        last_message_preview: content.substring(0, 100),
        last_message_direction: "outbound",
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversation_id);

    return new Response(
      JSON.stringify({
        success: true,
        message_id: msg?.id,
        uazapi_message_id: sendResult.messageId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("inbox-send-message error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

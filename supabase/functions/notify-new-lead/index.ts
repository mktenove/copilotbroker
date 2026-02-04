import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to send message via UAZAPI with endpoint fallback
const sendMessageViaUAZAPI = async (
  uazapiUrl: string,
  uazapiToken: string,
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string; endpoint?: string }> => {
  const cleanPhone = phone.replace(/\D/g, "");
  const baseUrl = uazapiUrl.replace(/\/$/, "");
  
  // Lista de endpoints e payloads para tentar
  const attempts = [
    {
      endpoint: "/send/text",
      payload: { phone: cleanPhone, message }
    },
    {
      endpoint: "/chat/send/text",
      payload: { Phone: cleanPhone, Body: message }
    },
    {
      endpoint: "/message/sendText",
      payload: { number: cleanPhone, text: message }
    },
    {
      endpoint: "/message/text",
      payload: { phone: cleanPhone, message }
    }
  ];

  for (const attempt of attempts) {
    try {
      const url = `${baseUrl}${attempt.endpoint}`;
      console.log(`Tentando: POST ${url}`);
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": uazapiToken,
        },
        body: JSON.stringify(attempt.payload),
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ Sucesso com endpoint: ${attempt.endpoint}`);
        return { success: true, endpoint: attempt.endpoint };
      }
      
      // 405 = endpoint errado, tentar próximo
      if (response.status === 405) {
        console.log(`Endpoint ${attempt.endpoint} retornou 405, tentando próximo...`);
        continue;
      }
      
      // 404 = endpoint não existe, tentar próximo
      if (response.status === 404) {
        console.log(`Endpoint ${attempt.endpoint} retornou 404, tentando próximo...`);
        continue;
      }
      
      // Outros erros podem ser problemas reais
      console.error(`Erro no endpoint ${attempt.endpoint}:`, result);
      
    } catch (err) {
      console.error(`Exceção no endpoint ${attempt.endpoint}:`, err);
    }
  }
  
  return { success: false, error: "Nenhum endpoint de envio funcionou" };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { leadId, leadName, leadWhatsapp, brokerId, source } = await req.json();

    console.log("Notificação de novo lead:", { leadId, leadName, leadWhatsapp, brokerId, source });

    // Buscar dados do corretor se houver broker_id
    let recipientPhone = Deno.env.get("ENOVE_WHATSAPP");
    let recipientName = "Enove";
    let recipientBrokerId: string | null = null;

    if (brokerId) {
      const { data: broker, error } = await supabase
        .from("brokers")
        .select("id, name, whatsapp")
        .eq("id", brokerId)
        .single();

      if (error) {
        console.error("Erro ao buscar corretor:", error);
      }

      if (broker?.whatsapp) {
        recipientPhone = broker.whatsapp.replace(/\D/g, "");
        recipientName = broker.name;
        recipientBrokerId = broker.id;
        console.log(`Notificando corretor: ${recipientName} (${recipientPhone})`);
      } else {
        console.log("Corretor sem WhatsApp cadastrado, enviando para Enove");
      }
    }

    if (!recipientPhone) {
      console.error("Nenhum número de telefone disponível para enviar notificação");
      
      // Log failure if we have leadId
      if (leadId) {
        await supabase.from("lead_interactions").insert({
          lead_id: leadId,
          broker_id: recipientBrokerId,
          interaction_type: "notification",
          channel: "whatsapp",
          notes: `❌ Falha: Nenhum número de telefone disponível para enviar notificação`,
        });
      }

      return new Response(
        JSON.stringify({ success: false, error: "No recipient phone available" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Montar mensagem
    const message = `🏠 *Novo Lead Cadastrado!*\n\n` +
      `👤 *Nome:* ${leadName}\n` +
      `📱 *WhatsApp:* ${leadWhatsapp}\n` +
      `📍 *Origem:* ${source || "Site Enove"}\n\n` +
      `Entre em contato o mais rápido possível!`;

    // Enviar via UAZAPI
    const uazapiUrl = Deno.env.get("UAZAPI_INSTANCE_URL");
    const uazapiToken = Deno.env.get("UAZAPI_TOKEN");

    if (!uazapiUrl || !uazapiToken) {
      console.error("UAZAPI não configurado corretamente");
      
      if (leadId) {
        await supabase.from("lead_interactions").insert({
          lead_id: leadId,
          broker_id: recipientBrokerId,
          interaction_type: "notification",
          channel: "whatsapp",
          notes: `❌ Falha: UAZAPI não configurado corretamente`,
        });
      }

      return new Response(
        JSON.stringify({ success: false, error: "UAZAPI not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log(`Enviando mensagem para ${recipientPhone} via UAZAPI`);

    // Usar função com fallback para múltiplos endpoints
    const sendResult = await sendMessageViaUAZAPI(uazapiUrl, uazapiToken, recipientPhone, message);

    // Log the notification attempt
    if (leadId) {
      const logNotes = sendResult.success
        ? `✅ Notificação enviada para ${recipientName} (${recipientPhone}) via ${sendResult.endpoint}`
        : `❌ Falha ao enviar para ${recipientName}: ${sendResult.error}`;

      await supabase.from("lead_interactions").insert({
        lead_id: leadId,
        broker_id: recipientBrokerId,
        interaction_type: "notification",
        channel: "whatsapp",
        notes: logNotes,
      });
    }

    if (!sendResult.success) {
      console.error("Erro ao enviar notificação:", sendResult.error);
      return new Response(
        JSON.stringify({ success: false, error: sendResult.error }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        recipient: recipientName,
        phone: recipientPhone,
        endpoint: sendResult.endpoint,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro ao enviar notificação:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Formato correto conforme documentação UAZAPI - usando header "token"
    const response = await fetch(`${uazapiUrl}/message/text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": uazapiToken,
      },
      body: JSON.stringify({
        phone: recipientPhone,
        message: message,
      }),
    });

    const result = await response.json();
    console.log("Resposta UAZAPI:", result);

    // Log the notification attempt
    if (leadId) {
      const logNotes = response.ok
        ? `✅ Notificação enviada para ${recipientName} (${recipientPhone})`
        : `❌ Falha ao enviar para ${recipientName}: ${JSON.stringify(result)}`;

      await supabase.from("lead_interactions").insert({
        lead_id: leadId,
        broker_id: recipientBrokerId,
        interaction_type: "notification",
        channel: "whatsapp",
        notes: logNotes,
      });
    }

    if (!response.ok) {
      console.error("Erro UAZAPI:", result);
      return new Response(
        JSON.stringify({ success: false, error: result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: response.status }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        recipient: recipientName,
        phone: recipientPhone,
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

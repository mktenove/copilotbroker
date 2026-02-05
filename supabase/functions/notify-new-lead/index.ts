import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Send message via UAZAPI with multi-endpoint fallback
async function sendMessage(
  baseUrl: string,
  token: string,
  phone: string,
  msg: string
): Promise<{ ok: boolean; err?: string; ep?: string }> {
  const cleanPhone = phone.replace(/\D/g, "");
  const url = baseUrl.replace(/\/$/, "");
  
  const endpoints = [
    { path: "/send/text", body: { phone: cleanPhone, message: msg } },
    { path: "/chat/send/text", body: { Phone: cleanPhone, Body: msg } },
    { path: "/message/sendText", body: { number: cleanPhone, text: msg } },
    { path: "/message/text", body: { phone: cleanPhone, message: msg } },
  ];

  for (const ep of endpoints) {
    try {
      console.log(`[UAZAPI] Tentando: ${ep.path}`);
      
      const res = await fetch(`${url}${ep.path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "token": token },
        body: JSON.stringify(ep.body),
      });

      if (res.ok) {
        console.log(`[UAZAPI] ✅ Sucesso: ${ep.path}`);
        return { ok: true, ep: ep.path };
      }
      
      if (res.status === 404 || res.status === 405) {
        console.log(`[UAZAPI] ${ep.path} -> ${res.status}, próximo...`);
        continue;
      }
      
      const data = await res.json().catch(() => ({}));
      console.error(`[UAZAPI] Erro ${ep.path}:`, data);
    } catch (e) {
      console.error(`[UAZAPI] Exceção ${ep.path}:`, e);
    }
  }
  
  return { ok: false, err: "Nenhum endpoint funcionou" };
}

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
    console.log("Nova notificação:", { leadId, leadName, brokerId });

    let phone = Deno.env.get("ENOVE_WHATSAPP");
    let name = "Enove";
    let brokerIdForLog: string | null = null;

    if (brokerId) {
      const { data: broker } = await supabase
        .from("brokers")
        .select("id, name, whatsapp")
        .eq("id", brokerId)
        .single();

      if (broker?.whatsapp) {
        phone = broker.whatsapp.replace(/\D/g, "");
        name = broker.name;
        brokerIdForLog = broker.id;
        console.log(`Destinatário: ${name} (${phone})`);
      }
    }

    if (!phone) {
      console.error("Sem telefone disponível");
      return new Response(
        JSON.stringify({ success: false, error: "No phone" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const uazUrl = Deno.env.get("UAZAPI_INSTANCE_URL");
    const uazToken = Deno.env.get("UAZAPI_TOKEN");

    if (!uazUrl || !uazToken) {
      console.error("UAZAPI não configurado");
      return new Response(
        JSON.stringify({ success: false, error: "UAZAPI not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const msg = `🏠 *Novo Lead Cadastrado!*\n\n👤 *Nome:* ${leadName}\n📱 *WhatsApp:* ${leadWhatsapp}\n📍 *Origem:* ${source || "Site Enove"}\n\nEntre em contato o mais rápido possível!`;

    console.log(`Enviando para ${phone}...`);
    const result = await sendMessage(uazUrl, uazToken, phone, msg);

    if (leadId && leadId !== "test-123" && leadId !== "test-456") {
      await supabase.from("lead_interactions").insert({
        lead_id: leadId,
        broker_id: brokerIdForLog,
        interaction_type: "notification",
        channel: "whatsapp",
        notes: result.ok
          ? `✅ Notificação enviada para ${name} via ${result.ep}`
          : `❌ Falha: ${result.err}`,
      });
    }

    if (!result.ok) {
      return new Response(
        JSON.stringify({ success: false, error: result.err }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, recipient: name, phone, endpoint: result.ep }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

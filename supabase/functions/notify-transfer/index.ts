import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, maskPhone } from "../_shared/security.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { lead_id, new_broker_id } = await req.json();

    if (!lead_id || !new_broker_id) {
      return new Response(JSON.stringify({ error: "lead_id e new_broker_id são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch lead, broker, and project data in parallel
    const [leadRes, brokerRes, configRes] = await Promise.all([
      supabase.from("leads").select("name, whatsapp, project_id").eq("id", lead_id).single(),
      supabase.from("brokers").select("user_id, whatsapp, name").eq("id", new_broker_id).single(),
      supabase
        .from("global_whatsapp_config")
        .select("instance_name, instance_token, status")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (!leadRes.data || !brokerRes.data) {
      return new Response(JSON.stringify({ error: "Lead ou corretor não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lead = leadRes.data;
    const broker = brokerRes.data;
    const globalConfig = configRes.data;

    // Get project name
    let projectName = "Empreendimento";
    if (lead.project_id) {
      const { data: proj } = await supabase
        .from("projects")
        .select("name")
        .eq("id", lead.project_id)
        .single();
      if (proj) projectName = proj.name;
    }

    // Send WhatsApp notification with full lead data (manual transfer = no data restriction)
    if (globalConfig?.instance_token && broker.whatsapp) {
      const envUrl = Deno.env.get("UAZAPI_INSTANCE_URL") || "";
      let baseUrl = "";
      try {
        baseUrl = new URL(envUrl).origin;
      } catch {
        baseUrl = envUrl.replace(/\/[^\/]+\/?$/, "");
      }

      if (baseUrl) {
        const cleanPhone = broker.whatsapp.replace(/\D/g, "");
        const message = `🔄 *Lead transferido para você*\n\n📋 *${projectName}*\n👤 ${lead.name}\n📱 ${lead.whatsapp}\n\n⚡ Acesse o CRM para iniciar o atendimento.`;

        const resp = await fetch(`${baseUrl}/send/text`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "token": globalConfig.instance_token,
          },
          body: JSON.stringify({
            number: cleanPhone,
            text: message,
          }),
        });

        console.log(`WhatsApp transfer notification to ${maskPhone(cleanPhone)}: ${resp.status}`);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in notify-transfer:", error);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

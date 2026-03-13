import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Não autorizado");
    const userId = userData.user.id;

    // Get broker record
    const { data: brokerRow } = await supabase
      .from("brokers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!brokerRow) throw new Error("Perfil de corretor não encontrado");

    // Parse body
    const { broker_project_id, project_id } = await req.json();
    if (!broker_project_id || !project_id) {
      throw new Error("Campos obrigatórios: broker_project_id, project_id");
    }

    // Verify the association belongs to this broker
    const { data: bpRow } = await supabase
      .from("broker_projects")
      .select("id")
      .eq("id", broker_project_id)
      .eq("broker_id", brokerRow.id)
      .maybeSingle();

    if (!bpRow) throw new Error("Associação não encontrada ou sem permissão");

    // Delete the project (cascades to broker_projects if FK CASCADE is set,
    // otherwise we delete broker_projects first)
    await supabase.from("broker_projects").delete().eq("id", broker_project_id);
    const { error: delErr } = await supabase.from("projects").delete().eq("id", project_id);

    if (delErr) {
      // Fallback: mark both as inactive
      await Promise.all([
        supabase.from("broker_projects").update({ is_active: false }).eq("id", broker_project_id),
        supabase.from("projects").update({ is_active: false }).eq("id", project_id),
      ]);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("remove-broker-project error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

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
    const { token } = await req.json();
    if (!token) throw new Error("Token é obrigatório");

    const { data: invite, error: inviteErr } = await supabase
      .from("invites")
      .select("email, status, expires_at")
      .eq("token", token)
      .single();

    if (inviteErr || !invite) throw new Error("Convite não encontrado");

    if (!["sent", "opened"].includes(invite.status)) throw new Error("Este convite já foi utilizado ou cancelado");

    if (new Date(invite.expires_at) < new Date()) {
      await supabase
        .from("invites")
        .update({ status: "expired" })
        .eq("token", token);
      throw new Error("Este convite expirou");
    }

    return new Response(JSON.stringify({ email: invite.email, valid: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

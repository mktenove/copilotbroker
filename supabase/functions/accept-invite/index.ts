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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const { token } = await req.json();
    if (!token) throw new Error("Token é obrigatório");

    // 1) Authenticate caller via Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Usuário não autenticado. Faça login primeiro.");

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Sessão inválida. Faça login novamente.");

    const userEmail = (user.email || "").toLowerCase();
    const userId = user.id;

    // 2) Service role client for admin operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3) Fetch invite by token
    const { data: invite, error: inviteErr } = await adminClient
      .from("invites")
      .select("id, tenant_id, email, role, status, expires_at")
      .eq("token", token)
      .single();

    if (inviteErr || !invite) throw new Error("Convite não encontrado ou token inválido");

    // 4) Validate status
    if (!["sent", "opened"].includes(invite.status)) {
      throw new Error(`Este convite já foi ${invite.status === "accepted" ? "aceito" : invite.status === "expired" ? "expirado" : "cancelado"}`);
    }

    // 5) Validate expiration
    if (new Date(invite.expires_at) < new Date()) {
      await adminClient.from("invites").update({ status: "expired" }).eq("id", invite.id);
      throw new Error("Este convite expirou. Solicite um novo convite ao administrador.");
    }

    // 6) Mark as opened if still sent
    if (invite.status === "sent") {
      await adminClient.from("invites").update({ status: "opened" }).eq("id", invite.id);
    }

    // 7) Validate email match (case-insensitive)
    if (userEmail !== invite.email.toLowerCase()) {
      throw new Error(
        `Este convite foi enviado para ${invite.email}. Você está logado como ${userEmail}. Faça login com o email correto.`
      );
    }

    // 8) Check entitlements
    const { data: entitlements } = await adminClient
      .from("tenant_entitlements")
      .select("max_users")
      .eq("tenant_id", invite.tenant_id)
      .single();

    const { count: currentMembers } = await adminClient
      .from("tenant_memberships")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", invite.tenant_id)
      .eq("is_active", true);

    if (entitlements && currentMembers !== null && currentMembers >= entitlements.max_users) {
      throw new Error("A organização atingiu o limite de usuários. Entre em contato com o administrador.");
    }

    // 9) Create/ensure membership (idempotent via upsert)
    const { error: membershipErr } = await adminClient
      .from("tenant_memberships")
      .upsert(
        {
          tenant_id: invite.tenant_id,
          user_id: userId,
          role: invite.role || "member",
          is_active: true,
        },
        { onConflict: "tenant_id,user_id" }
      );

    if (membershipErr) {
      console.error("Membership error:", membershipErr);
      throw new Error("Erro ao criar vínculo com a organização");
    }

    // 10) Create/ensure broker record (idempotent)
    const { data: existingBroker } = await adminClient
      .from("brokers")
      .select("id")
      .eq("user_id", userId)
      .eq("tenant_id", invite.tenant_id)
      .maybeSingle();

    if (!existingBroker) {
      const displayName = user.user_metadata?.name || user.user_metadata?.full_name || userEmail.split("@")[0];
      const slug = displayName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now().toString(36);

      await adminClient.from("brokers").insert({
        user_id: userId,
        name: displayName,
        email: userEmail,
        slug,
        tenant_id: invite.tenant_id,
        is_active: true,
      });
    }

    // 11) Assign broker role (idempotent)
    await adminClient
      .from("user_roles")
      .upsert({ user_id: userId, role: "broker" }, { onConflict: "user_id,role" });

    // 12) Mark invite as accepted
    await adminClient
      .from("invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    return new Response(
      JSON.stringify({
        success: true,
        tenant_id: invite.tenant_id,
        redirect: "/corretor",
        message: "Convite aceito com sucesso! Bem-vindo à equipe.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("accept-invite error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

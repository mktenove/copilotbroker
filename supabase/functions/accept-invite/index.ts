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
    const { token, name, password } = await req.json();
    if (!token) throw new Error("Token é obrigatório");
    if (!password || password.length < 6) throw new Error("Senha deve ter pelo menos 6 caracteres");

    // Find invite by token
    const { data: invite, error: inviteErr } = await supabase
      .from("invites")
      .select("*")
      .eq("token", token)
      .eq("status", "sent")
      .single();

    if (inviteErr || !invite) throw new Error("Convite inválido ou já utilizado");

    // Check expiration
    if (new Date(invite.expires_at) < new Date()) {
      await supabase
        .from("invites")
        .update({ status: "expired" })
        .eq("id", invite.id);
      throw new Error("Este convite expirou. Solicite um novo convite ao administrador.");
    }

    const inviteEmail = invite.email;
    const tenantId = invite.tenant_id;
    const displayName = name || inviteEmail.split("@")[0];

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u: any) => u.email === inviteEmail);
    let targetUserId: string;

    if (existing) {
      targetUserId = existing.id;

      // Check not already a member
      const { data: existingMembership } = await supabase
        .from("tenant_memberships")
        .select("id")
        .eq("user_id", targetUserId)
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .maybeSingle();

      if (existingMembership) {
        // Mark invite as accepted anyway
        await supabase
          .from("invites")
          .update({ status: "accepted", accepted_at: new Date().toISOString() })
          .eq("id", invite.id);
        throw new Error("Você já é membro desta organização");
      }
    } else {
      // Create user
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email: inviteEmail,
        password,
        email_confirm: true,
      });
      if (createErr) throw new Error(`Erro ao criar conta: ${createErr.message}`);
      targetUserId = newUser.user.id;
    }

    // Check entitlements
    const { data: entitlements } = await supabase
      .from("tenant_entitlements")
      .select("max_users")
      .eq("tenant_id", tenantId)
      .single();

    const { count: currentMembers } = await supabase
      .from("tenant_memberships")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    if (entitlements && currentMembers !== null && currentMembers >= entitlements.max_users) {
      throw new Error("A organização atingiu o limite de usuários. Entre em contato com o administrador.");
    }

    // Create tenant membership
    await supabase
      .from("tenant_memberships")
      .insert({
        user_id: targetUserId,
        tenant_id: tenantId,
        role: "member",
      });

    // Create broker record
    const slug = displayName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    await supabase
      .from("brokers")
      .insert({
        user_id: targetUserId,
        name: displayName,
        email: inviteEmail,
        slug: `${slug}-${Date.now().toString(36)}`,
        tenant_id: tenantId,
        is_active: true,
      });

    // Assign broker role
    await supabase
      .from("user_roles")
      .upsert({ user_id: targetUserId, role: "broker" }, { onConflict: "user_id,role" });

    // Mark invite as accepted
    await supabase
      .from("invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    return new Response(JSON.stringify({ 
      success: true, 
      user_id: targetUserId,
      message: "Conta criada e acesso liberado!" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("accept-invite error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

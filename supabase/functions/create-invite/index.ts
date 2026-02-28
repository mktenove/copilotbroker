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
    const callerId = userData.user.id;

    // Parse body
    const { tenant_id, email, role: inviteRole, message: inviteMessage } = await req.json();
    if (!email) throw new Error("Email é obrigatório");

    const normalizedEmail = email.trim().toLowerCase();
    const finalRole = inviteRole || "broker";

    // Determine tenant_id: from body or from caller's membership
    let tenantId = tenant_id;

    // Check if caller is super admin
    const { data: isSuperAdmin } = await supabase.rpc("is_super_admin");
    
    if (!tenantId) {
      // Get from caller's membership
      const { data: membership } = await supabase
        .from("tenant_memberships")
        .select("tenant_id, role")
        .eq("user_id", callerId)
        .eq("is_active", true)
        .single();

      if (!membership) throw new Error("Você não pertence a nenhuma organização");
      tenantId = membership.tenant_id;
    }

    // Validate caller authorization: super admin OR owner/admin of tenant
    if (!isSuperAdmin) {
      const { data: callerMembership } = await supabase
        .from("tenant_memberships")
        .select("role")
        .eq("user_id", callerId)
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .single();

      if (!callerMembership || !["owner", "admin"].includes(callerMembership.role)) {
        throw new Error("Apenas administradores podem convidar membros");
      }
    }

    // Check entitlements (max_users)
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
      throw new Error(`Limite de ${entitlements.max_users} usuários atingido. Faça upgrade do plano.`);
    }

    // Check if user is already a member
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u: any) => u.email === normalizedEmail);

    if (existing) {
      const { data: existingMembership } = await supabase
        .from("tenant_memberships")
        .select("id")
        .eq("user_id", existing.id)
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .maybeSingle();

      if (existingMembership) {
        throw new Error("Este usuário já é membro da organização");
      }
    }

    // Cancel any existing "sent" invites for same email+tenant
    await supabase
      .from("invites")
      .update({ status: "cancelled" })
      .eq("tenant_id", tenantId)
      .eq("email", normalizedEmail)
      .eq("status", "sent");

    // Generate secure token (32 bytes, hex)
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const inviteToken = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, "0")).join("");

    // Insert invite
    const { data: invite, error: inviteErr } = await supabase
      .from("invites")
      .insert({
        tenant_id: tenantId,
        email: normalizedEmail,
        role: finalRole,
        token: inviteToken,
        invited_by: callerId,
        message: inviteMessage || null,
        status: "sent",
      })
      .select("id, token, expires_at")
      .single();

    if (inviteErr) throw new Error(`Erro ao criar convite: ${inviteErr.message}`);

    // Build accept URL
    const siteUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "") || "";
    // Use the app's published URL
    const acceptUrl = `https://copilotbroker.lovable.app/aceitar-convite?token=${inviteToken}`;

    // Return the invite data — frontend will handle email dispatch
    return new Response(JSON.stringify({
      success: true,
      invite_id: invite.id,
      token: inviteToken,
      accept_url: acceptUrl,
      email: normalizedEmail,
      expires_at: invite.expires_at,
      message: "Convite criado com sucesso. Compartilhe o link com o convidado.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("create-invite error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

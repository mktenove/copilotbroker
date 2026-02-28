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

    // Get caller's tenant (must be owner)
    const { data: membership } = await supabase
      .from("tenant_memberships")
      .select("tenant_id, role")
      .eq("user_id", callerId)
      .eq("is_active", true)
      .single();

    if (!membership || membership.role !== "owner") {
      throw new Error("Apenas o dono da organização pode convidar membros");
    }

    const tenantId = membership.tenant_id;

    // Parse body
    const { email, name, whatsapp } = await req.json();
    if (!email || !name) throw new Error("Email e nome são obrigatórios");

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

    // Check if user already exists by email
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    let targetUserId: string | null = null;
    const existing = existingUsers?.users?.find((u: any) => u.email === email);

    if (existing) {
      targetUserId = existing.id;

      // Check if already a member of this tenant
      const { data: existingMembership } = await supabase
        .from("tenant_memberships")
        .select("id")
        .eq("user_id", targetUserId)
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .maybeSingle();

      if (existingMembership) {
        throw new Error("Este usuário já é membro da organização");
      }
    } else {
      // Create user with a temporary password (they'll reset)
      const tempPassword = crypto.randomUUID().slice(0, 16) + "Aa1!";
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
      });
      if (createErr) throw new Error(`Erro ao criar usuário: ${createErr.message}`);
      targetUserId = newUser.user.id;
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
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const { error: brokerErr } = await supabase
      .from("brokers")
      .insert({
        user_id: targetUserId,
        name,
        email,
        slug: `${slug}-${Date.now().toString(36)}`,
        whatsapp: whatsapp || null,
        tenant_id: tenantId,
        is_active: true,
      });

    if (brokerErr) {
      console.error("Broker insert error:", brokerErr);
      // Don't throw — membership was created, broker might already exist
    }

    // Assign broker role
    await supabase
      .from("user_roles")
      .upsert({ user_id: targetUserId, role: "broker" }, { onConflict: "user_id,role" });

    return new Response(JSON.stringify({ success: true, user_id: targetUserId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("invite-member error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

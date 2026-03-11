import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: any) => {
  console.log(`[CONFIRM-CHECKOUT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Verify user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autenticado");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Não autenticado");

    const { session_id } = await req.json();
    if (!session_id) throw new Error("session_id obrigatório");

    log("Start", { userId: user.id, session_id });

    // Check if user already has an active membership
    const { data: membership } = await supabase
      .from("tenant_memberships")
      .select("tenant_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (membership) {
      log("Membership already exists", { userId: user.id });
      return new Response(JSON.stringify({ ok: true, alreadyExists: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Retrieve the session from Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);
    log("Session retrieved", { status: session.status, customer: session.customer });

    if (session.status !== "complete") {
      throw new Error(`Sessão do Stripe não está completa (status: ${session.status})`);
    }

    const planType = session.metadata?.plan_type;
    const includedUsers = parseInt(session.metadata?.included_users || "1");
    const extraUsers = parseInt(session.metadata?.extra_users || "0");

    if (!planType) throw new Error("Metadados da sessão incompletos (plan_type ausente)");

    const dbPlanType = planType === "imobiliaria" ? "real_estate" : planType;
    const userRole = planType === "imobiliaria" ? "admin" : "broker";

    // Look up existing tenant by stripe subscription (handles partial webhook runs)
    let tenantId: string;
    const { data: existingTenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("stripe_subscription_id", session.subscription as string)
      .maybeSingle();

    if (existingTenant) {
      log("Reusing existing tenant", { tenantId: existingTenant.id });
      tenantId = existingTenant.id;
    } else {
      // Create new tenant
      const slug = `tenant-${Date.now()}`;
      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .insert({
          name: "Minha Empresa",
          slug,
          plan_type: dbPlanType,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          status: "active",
          owner_user_id: user.id,
          included_users: includedUsers,
          extra_users: extraUsers,
        })
        .select("id")
        .single();

      if (tenantError) throw new Error(`Erro ao criar tenant: ${tenantError.message}`);
      log("Tenant created", { tenantId: tenant.id });
      tenantId = tenant.id;
    }

    // Create membership (upsert to handle partial failures)
    const { error: membershipError } = await supabase
      .from("tenant_memberships")
      .upsert(
        { tenant_id: tenantId, user_id: user.id, role: "owner", is_active: true },
        { onConflict: "tenant_id,user_id" }
      );
    if (membershipError) throw new Error(`Erro ao criar membership: ${membershipError.message}`);

    // Create entitlements (upsert)
    await supabase
      .from("tenant_entitlements")
      .upsert(
        { tenant_id: tenantId, max_users: includedUsers + extraUsers, features: { copilot: true, roletas: true, whatsapp: true, campaigns: true } },
        { onConflict: "tenant_id" }
      );

    // Assign user role (upsert)
    await supabase
      .from("user_roles")
      .upsert({ user_id: user.id, role: userRole }, { onConflict: "user_id,role" });

    // Mark as processed (ignore if already exists)
    await supabase.from("billing_events").upsert(
      {
        stripe_event_id: `session_${session_id}`,
        type: "checkout.session.completed.fallback",
        payload: session as any,
        processed: true,
      },
      { onConflict: "stripe_event_id" }
    );

    log("Completed successfully", { userId: user.id, tenantId });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

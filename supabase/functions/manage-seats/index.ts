import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXTRA_USER_PRICE_ID = "price_1T5bfiHq599RjzwdagCCQxOv";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Verify super admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin");
    if (!isAdmin) throw new Error("Forbidden: not a super admin");

    const { action, tenant_id, extra_users } = await req.json();
    if (!tenant_id) throw new Error("tenant_id is required");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get tenant
    const { data: tenant, error: tErr } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", tenant_id)
      .single();
    if (tErr || !tenant) throw new Error("Tenant not found");

    if (action === "sync_from_stripe") {
      // Read extra_user quantity from Stripe subscription
      if (!tenant.stripe_subscription_id) {
        throw new Error("Tenant has no Stripe subscription");
      }

      const subscription = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id);
      let stripeExtraUsers = 0;

      for (const item of subscription.items.data) {
        if (item.price.id === EXTRA_USER_PRICE_ID) {
          stripeExtraUsers = item.quantity || 0;
          break;
        }
      }

      const includedUsers = tenant.included_users || 3;
      const newMaxUsers = includedUsers + stripeExtraUsers;
      const before = { extra_users: tenant.extra_users };

      // Update tenant
      await supabaseAdmin.from("tenants")
        .update({ extra_users: stripeExtraUsers })
        .eq("id", tenant_id);

      // Update entitlements
      await supabaseAdmin.from("tenant_entitlements")
        .update({ max_users: newMaxUsers })
        .eq("tenant_id", tenant_id);

      // Audit log
      await supabaseAdmin.from("audit_logs").insert({
        admin_user_id: userData.user.id,
        action: "sync_seats_from_stripe",
        target_tenant_id: tenant_id,
        before_data: before,
        after_data: { extra_users: stripeExtraUsers, max_users: newMaxUsers },
        metadata: { stripe_subscription_id: tenant.stripe_subscription_id },
      });

      return new Response(JSON.stringify({
        success: true,
        extra_users: stripeExtraUsers,
        max_users: newMaxUsers,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else if (action === "update_stripe_quantity") {
      // Update quantity on Stripe
      if (extra_users === undefined || extra_users === null) {
        throw new Error("extra_users is required for update_stripe_quantity");
      }
      if (!tenant.stripe_subscription_id) {
        throw new Error("Tenant has no Stripe subscription");
      }

      const subscription = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id);
      let extraUserItem = null;

      for (const item of subscription.items.data) {
        if (item.price.id === EXTRA_USER_PRICE_ID) {
          extraUserItem = item;
          break;
        }
      }

      const newExtraUsers = Math.max(0, extra_users);
      const includedUsers = tenant.included_users || 3;
      const newMaxUsers = includedUsers + newExtraUsers;
      const before = { extra_users: tenant.extra_users };

      if (newExtraUsers === 0 && extraUserItem) {
        // Remove the item
        await stripe.subscriptionItems.del(extraUserItem.id, {
          proration_behavior: "create_prorations",
        });
      } else if (newExtraUsers > 0 && extraUserItem) {
        // Update quantity
        await stripe.subscriptionItems.update(extraUserItem.id, {
          quantity: newExtraUsers,
          proration_behavior: "create_prorations",
        });
      } else if (newExtraUsers > 0 && !extraUserItem) {
        // Add new item
        await stripe.subscriptionItems.create({
          subscription: tenant.stripe_subscription_id,
          price: EXTRA_USER_PRICE_ID,
          quantity: newExtraUsers,
          proration_behavior: "create_prorations",
        });
      }

      // Update tenant and entitlements
      await supabaseAdmin.from("tenants")
        .update({ extra_users: newExtraUsers })
        .eq("id", tenant_id);

      await supabaseAdmin.from("tenant_entitlements")
        .update({ max_users: newMaxUsers })
        .eq("tenant_id", tenant_id);

      // Audit log
      await supabaseAdmin.from("audit_logs").insert({
        admin_user_id: userData.user.id,
        action: "update_stripe_seats",
        target_tenant_id: tenant_id,
        before_data: before,
        after_data: { extra_users: newExtraUsers, max_users: newMaxUsers },
        metadata: { stripe_subscription_id: tenant.stripe_subscription_id },
      });

      return new Response(JSON.stringify({
        success: true,
        extra_users: newExtraUsers,
        max_users: newMaxUsers,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else {
      throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[manage-seats]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

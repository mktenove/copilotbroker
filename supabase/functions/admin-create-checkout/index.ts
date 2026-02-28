import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Verify caller is super admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    if (!userData.user) throw new Error("Not authenticated");

    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) throw new Error("Not authorized - super admin only");

    const { owner_email, owner_name, extra_users = 0, tenant_name } = await req.json();
    if (!owner_email || !tenant_name) throw new Error("owner_email and tenant_name are required");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check/create Stripe customer
    const customers = await stripe.customers.list({ email: owner_email, limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: owner_email,
        name: owner_name || tenant_name,
        metadata: { tenant_name, source: "super_admin" },
      });
      customerId = customer.id;
    }

    // Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price: "price_1T5bfKHq599RjzwdDRpGSbdG", // Imobiliária base
        quantity: 1,
      },
    ];

    if (extra_users > 0) {
      lineItems.push({
        price: "price_1T5bfiHq599RjzwdagCCQxOv", // Extra user add-on
        quantity: extra_users,
      });
    }

    const origin = req.headers.get("origin") || "https://copilotbroker.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: lineItems,
      mode: "subscription",
      success_url: `${origin}/super-admin/tenants/real-estate?checkout=success`,
      cancel_url: `${origin}/super-admin/tenants/real-estate?checkout=canceled`,
      metadata: {
        tenant_name,
        owner_email,
        extra_users: String(extra_users),
        created_by: userData.user.id,
      },
    });

    return new Response(
      JSON.stringify({ url: session.url, customer_id: customerId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

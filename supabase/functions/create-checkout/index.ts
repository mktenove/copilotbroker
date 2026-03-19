import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLANS = {
  broker: {
    price_id: "price_1T5bf1Hq599RjzwdlyH7TbSs",
    product_id: "prod_U3j7mhAb9ZYyXm",
    included_users: 1,
  },
  imobiliaria: {
    price_id: "price_1T5bfKHq599RjzwdDRpGSbdG",
    product_id: "prod_U3j7dxfy41mYRI",
    included_users: 3,
  },
};

const EXTRA_USER_PRICE = "price_1T5bfiHq599RjzwdagCCQxOv";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    // Auth is optional — user may not have an account yet (post-checkout signup flow)
    let userEmail: string | undefined;
    let userId: string | undefined;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      if (data.user?.email) {
        userEmail = data.user.email;
        userId = data.user.id;
      }
    }

    const { plan_type, extra_users } = await req.json();
    if (!plan_type || !PLANS[plan_type as keyof typeof PLANS]) {
      throw new Error("Invalid plan_type. Use 'broker' or 'imobiliaria'");
    }

    const plan = PLANS[plan_type as keyof typeof PLANS];
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check existing customer only if we have the user's email
    let customerId: string | undefined;
    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    // Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: plan.price_id, quantity: 1 },
    ];

    // Add extra users for imobiliaria plan
    if (plan_type === "imobiliaria" && extra_users && extra_users > 0) {
      lineItems.push({ price: EXTRA_USER_PRICE, quantity: extra_users });
    }

    const origin = req.headers.get("origin") || "https://copilotbroker.com.br";

    const metadata: Record<string, string> = {
      plan_type,
      included_users: String(plan.included_users),
      extra_users: String(extra_users || 0),
    };
    if (userId) metadata.user_id = userId;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      line_items: lineItems,
      mode: "subscription",
      success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
      metadata,
      subscription_data: { metadata },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

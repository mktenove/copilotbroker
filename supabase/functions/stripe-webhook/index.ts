import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const log = (step: string, details?: any) => {
  console.log(`[STRIPE-WEBHOOK] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    let event: Stripe.Event;

    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      // Fallback: parse without signature verification (dev mode)
      event = JSON.parse(body) as Stripe.Event;
      log("WARNING: No webhook signature verification");
    }

    log("Event received", { type: event.type, id: event.id });

    // Deduplicate
    const { data: existing } = await supabase
      .from("billing_events")
      .select("id")
      .eq("stripe_event_id", event.id)
      .maybeSingle();

    if (existing) {
      log("Duplicate event, skipping", { eventId: event.id });
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // Store event
    await supabase.from("billing_events").insert({
      stripe_event_id: event.id,
      type: event.type,
      payload: event.data.object as any,
      processed: false,
    });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, session);
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(supabase, subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, subscription);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(supabase, invoice);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(supabase, invoice);
        break;
      }
    }

    // Mark processed
    await supabase
      .from("billing_events")
      .update({ processed: true })
      .eq("stripe_event_id", event.id);

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), { status: 400 });
  }
});

async function handleCheckoutCompleted(supabase: any, session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const planType = session.metadata?.plan_type;
  const includedUsers = parseInt(session.metadata?.included_users || "1");
  const extraUsers = parseInt(session.metadata?.extra_users || "0");

  if (!userId || !planType) {
    log("Missing metadata in checkout session", { sessionId: session.id });
    return;
  }

  log("Checkout completed", { userId, planType, includedUsers, extraUsers });

  // Check if user already has a tenant
  const { data: existingMembership } = await supabase
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (existingMembership) {
    // Update existing tenant
    await supabase
      .from("tenants")
      .update({
        plan_type: planType,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        status: "active",
        included_users: includedUsers,
        extra_users: extraUsers,
      })
      .eq("id", existingMembership.tenant_id);

    // Update entitlements
    await supabase
      .from("tenant_entitlements")
      .update({ max_users: includedUsers + extraUsers })
      .eq("tenant_id", existingMembership.tenant_id);

    log("Updated existing tenant", { tenantId: existingMembership.tenant_id });
  } else {
    // Create new tenant (will be completed in onboarding)
    const slug = `tenant-${Date.now()}`;
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({
        name: "Minha Empresa",
        slug,
        plan_type: planType,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        status: "active",
        owner_user_id: userId,
        included_users: includedUsers,
        extra_users: extraUsers,
      })
      .select("id")
      .single();

    if (tenantError) {
      log("Error creating tenant", { error: tenantError.message });
      return;
    }

    // Create membership
    await supabase.from("tenant_memberships").insert({
      tenant_id: tenant.id,
      user_id: userId,
      role: "owner",
      is_active: true,
    });

    // Create entitlements
    await supabase.from("tenant_entitlements").insert({
      tenant_id: tenant.id,
      max_users: includedUsers + extraUsers,
      features: { copilot: true, roletas: true, whatsapp: true, campaigns: true },
    });

    log("Created new tenant", { tenantId: tenant.id });
  }
}

async function handleSubscriptionUpdated(supabase: any, subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  log("Subscription updated", { customerId, status: subscription.status });

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!tenant) return;

  const statusMap: Record<string, string> = {
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    unpaid: "suspended",
    incomplete: "active",
    incomplete_expired: "canceled",
    trialing: "active",
    paused: "suspended",
  };

  const tenantStatus = statusMap[subscription.status] || "active";

  await supabase
    .from("tenants")
    .update({
      status: tenantStatus,
      grace_period_ends_at:
        subscription.status === "past_due"
          ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
          : null,
    })
    .eq("id", tenant.id);

  log("Tenant status updated", { tenantId: tenant.id, status: tenantStatus });
}

async function handleSubscriptionDeleted(supabase: any, subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  log("Subscription deleted", { customerId });

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!tenant) return;

  await supabase
    .from("tenants")
    .update({ status: "canceled" })
    .eq("id", tenant.id);

  log("Tenant canceled", { tenantId: tenant.id });
}

async function handlePaymentFailed(supabase: any, invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  log("Payment failed", { customerId, invoiceId: invoice.id });

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!tenant) return;

  await supabase
    .from("tenants")
    .update({
      status: "past_due",
      grace_period_ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq("id", tenant.id);

  log("Tenant set to past_due", { tenantId: tenant.id });
}

async function handleInvoicePaid(supabase: any, invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  log("Invoice paid", { customerId, invoiceId: invoice.id });

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, status")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!tenant) return;

  // Only update if tenant was in a non-active state
  if (tenant.status !== "active") {
    await supabase
      .from("tenants")
      .update({
        status: "active",
        grace_period_ends_at: null,
      })
      .eq("id", tenant.id);

    log("Tenant reactivated via invoice.paid", { tenantId: tenant.id });
  }
}

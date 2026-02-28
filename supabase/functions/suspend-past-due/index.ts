import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const log = (step: string, details?: any) => {
  console.log(`[SUSPEND-PAST-DUE] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    log("Checking for past_due tenants with expired grace period");

    const now = new Date().toISOString();

    // Find tenants in past_due with grace_period_ends_at in the past
    const { data: tenants, error } = await supabase
      .from("tenants")
      .select("id, name, grace_period_ends_at")
      .eq("status", "past_due")
      .not("grace_period_ends_at", "is", null)
      .lte("grace_period_ends_at", now);

    if (error) {
      log("Error fetching tenants", { error: error.message });
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    if (!tenants || tenants.length === 0) {
      log("No tenants to suspend");
      return new Response(JSON.stringify({ suspended: 0 }), { status: 200 });
    }

    log(`Found ${tenants.length} tenants to suspend`);

    for (const tenant of tenants) {
      const { error: updateError } = await supabase
        .from("tenants")
        .update({ status: "suspended", grace_period_ends_at: null })
        .eq("id", tenant.id);

      if (updateError) {
        log("Error suspending tenant", { tenantId: tenant.id, error: updateError.message });
      } else {
        log("Tenant suspended", { tenantId: tenant.id, name: tenant.name });
      }
    }

    return new Response(JSON.stringify({ suspended: tenants.length }), { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
});

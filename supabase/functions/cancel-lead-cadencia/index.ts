import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/security.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { leadId, cancelAll } = body;

    if (!leadId && !cancelAll) {
      return new Response(JSON.stringify({ error: "leadId or cancelAll required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find all active campaigns (for specific lead or all)
    let query = supabase.from("whatsapp_campaigns").select("id").in("status", ["running", "scheduled"]);
    if (!cancelAll) query = query.eq("lead_id", leadId);
    const { data: campaigns } = await query;

    if (!campaigns || campaigns.length === 0) {
      // Even if no active campaigns, clean up orphaned queue items when cancelAll
      if (cancelAll) {
        const { count: orphanCount } = await supabase
          .from("whatsapp_message_queue")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .in("status", ["scheduled", "queued", "paused_by_system"])
          .select("*", { count: "exact", head: true });
        return new Response(JSON.stringify({ status: "cleaned", queue_items_cancelled: orphanCount ?? 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ status: "no_active_campaigns" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const campaignIds = campaigns.map((c: { id: string }) => c.id);

    // Cancel campaigns
    await supabase
      .from("whatsapp_campaigns")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .in("id", campaignIds);

    // Cancel all pending queue items for these campaigns
    const { count } = await supabase
      .from("whatsapp_message_queue")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .in("campaign_id", campaignIds)
      .in("status", ["scheduled", "queued", "paused_by_system"])
      .select("*", { count: "exact", head: true });

    // If cancelAll: also cancel orphaned queue items (no campaign or campaign not active)
    if (cancelAll) {
      await supabase
        .from("whatsapp_message_queue")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .in("status", ["scheduled", "queued", "paused_by_system"]);
    }

    console.log(`Cancelled ${campaignIds.length} campaign(s) and ~${count} queue items for ${cancelAll ? "ALL leads" : `lead ${leadId}`}`);

    return new Response(JSON.stringify({
      status: "cancelled",
      campaigns_cancelled: campaignIds.length,
      queue_items_cancelled: count ?? 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("cancel-lead-cadencia error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

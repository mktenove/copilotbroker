import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PIXEL_ID = "880409748241568";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get("META_CONVERSIONS_API_TOKEN");
    if (!token) {
      throw new Error("META_CONVERSIONS_API_TOKEN not configured");
    }

    const { event_name, user_data, event_source_url, fbp, fbc, event_id } = await req.json();

    const hashedUserData: Record<string, string> = {};

    // Hash user data fields with SHA-256
    if (user_data?.ph) {
      const phone = user_data.ph.replace(/\D/g, "");
      const phoneWithCountry = phone.startsWith("55") ? phone : `55${phone}`;
      const encoded = new TextEncoder().encode(phoneWithCountry);
      const hash = await crypto.subtle.digest("SHA-256", encoded);
      hashedUserData.ph = [
        ...new Uint8Array(hash),
      ]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }

    if (user_data?.fn) {
      const name = user_data.fn.trim().toLowerCase();
      const encoded = new TextEncoder().encode(name);
      const hash = await crypto.subtle.digest("SHA-256", encoded);
      hashedUserData.fn = [
        ...new Uint8Array(hash),
      ]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }

    if (fbp) hashedUserData.fbp = fbp;
    if (fbc) hashedUserData.fbc = fbc;

    const eventData = {
      data: [
        {
          event_name,
          event_time: Math.floor(Date.now() / 1000),
          event_id: event_id || crypto.randomUUID(),
          event_source_url:
            event_source_url || "https://onovocondominio.com.br/portao/goldenview",
          action_source: "website",
          user_data: hashedUserData,
        },
      ],
    };

    const url = `https://graph.facebook.com/v21.0/${PIXEL_ID}/events?access_token=${token}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventData),
    });

    const result = await response.json();

    console.log("Meta CAPI response:", JSON.stringify(result));

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Meta CAPI error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

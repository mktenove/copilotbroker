import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PIXEL_CONFIGS: Record<string, { tokenEnv: string; defaultUrl: string }> = {
  "880409748241568": {
    tokenEnv: "META_CONVERSIONS_API_TOKEN",
    defaultUrl: "https://onovocondominio.com.br/portao/goldenview",
  },
  "1447260256915517": {
    tokenEnv: "META_CONVERSIONS_API_TOKEN_MC",
    defaultUrl: "https://onovocondominio.com.br/novohamburgo/mauriciocardoso",
  },
};

const DEFAULT_PIXEL_ID = "880409748241568";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { event_name, user_data, event_source_url, fbp, fbc, event_id, pixel_id } = await req.json();

    const resolvedPixelId = pixel_id || DEFAULT_PIXEL_ID;
    const config = PIXEL_CONFIGS[resolvedPixelId];

    if (!config) {
      throw new Error(`Unknown pixel_id: ${resolvedPixelId}`);
    }

    const token = Deno.env.get(config.tokenEnv);
    if (!token) {
      throw new Error(`${config.tokenEnv} not configured`);
    }

    const hashedUserData: Record<string, string> = {};

    if (user_data?.ph) {
      const phone = user_data.ph.replace(/\D/g, "");
      const phoneWithCountry = phone.startsWith("55") ? phone : `55${phone}`;
      const encoded = new TextEncoder().encode(phoneWithCountry);
      const hash = await crypto.subtle.digest("SHA-256", encoded);
      hashedUserData.ph = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }

    if (user_data?.fn) {
      const name = user_data.fn.trim().toLowerCase();
      const encoded = new TextEncoder().encode(name);
      const hash = await crypto.subtle.digest("SHA-256", encoded);
      hashedUserData.fn = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }

    if (fbp) hashedUserData.fbp = fbp;
    if (fbc) hashedUserData.fbc = fbc;

    const eventData = {
      data: [
        {
          event_name,
          event_time: Math.floor(Date.now() / 1000),
          event_id: event_id || crypto.randomUUID(),
          event_source_url: event_source_url || config.defaultUrl,
          action_source: "website",
          user_data: hashedUserData,
        },
      ],
    };

    const url = `https://graph.facebook.com/v21.0/${resolvedPixelId}/events?access_token=${token}`;

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
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

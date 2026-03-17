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
    const userId = userData.user.id;

    // Verify user has broker role
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "broker")
      .maybeSingle();

    if (!roleRow) throw new Error("Acesso negado: apenas corretores podem criar empreendimentos");

    // Get broker record
    const { data: brokerRow } = await supabase
      .from("brokers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!brokerRow) throw new Error("Perfil de corretor não encontrado");

    // Parse body
    const body = await req.json();
    const {
      name, slug, city, city_slug, description, status,
      hero_title, hero_subtitle, webhook_url, tenant_id,
      property_type, address, bedrooms, suites, parking_spots,
      area_m2, price_range, ideal_buyer, differentials, amenities,
      main_image_url, video_url, map_embed_url, scraped_images,
    } = body;

    if (!name || !slug || !city || !city_slug) {
      throw new Error("Campos obrigatórios: name, slug, city, city_slug");
    }

    // Create project — retry with suffix if slug conflicts
    let newProject: { id: string; name: string; slug: string; city: string; city_slug: string } | null = null;
    let finalSlug = slug;
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data, error: projErr } = await supabase
        .from("projects")
        .insert({
          name,
          slug: finalSlug,
          city,
          city_slug,
          description: description || null,
          status: status || "pre_launch",
          hero_title: hero_title || null,
          hero_subtitle: hero_subtitle || null,
          webhook_url: webhook_url || null,
          tenant_id: tenant_id || null,
          property_type: property_type || null,
          address: address || null,
          bedrooms: bedrooms || null,
          suites: suites || null,
          parking_spots: parking_spots || null,
          area_m2: area_m2 || null,
          price_range: price_range || null,
          ideal_buyer: ideal_buyer || null,
          differentials: differentials || null,
          amenities: amenities || null,
          main_image_url: main_image_url || null,
          video_url: video_url || null,
          map_embed_url: map_embed_url || null,
          scraped_images: Array.isArray(scraped_images) ? scraped_images : null,
          is_active: true,
        })
        .select("id, name, slug, city, city_slug")
        .single();

      if (!projErr) {
        newProject = data;
        break;
      }
      if (projErr.code === "23505") {
        // Slug conflict — append random 4-char suffix and retry
        const suffix = Math.random().toString(36).slice(2, 6);
        finalSlug = `${slug}-${suffix}`;
        continue;
      }
      throw new Error(`Erro ao criar empreendimento: ${projErr.message}`);
    }

    if (!newProject) {
      throw new Error("Não foi possível criar o empreendimento. Tente um nome diferente.");
    }

    // Associate with broker
    const { error: assocErr } = await supabase
      .from("broker_projects")
      .insert({
        broker_id: brokerRow.id,
        project_id: newProject.id,
        is_active: true,
        tenant_id: tenant_id || null,
      });

    if (assocErr) throw new Error(`Erro ao associar empreendimento: ${assocErr.message}`);

    // Fetch the broker_project id for optimistic UI update
    const { data: bpRow } = await supabase
      .from("broker_projects")
      .select("id")
      .eq("broker_id", brokerRow.id)
      .eq("project_id", newProject.id)
      .single();

    return new Response(JSON.stringify({ success: true, project: newProject, broker_project_id: bpRow?.id ?? null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("create-broker-project error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

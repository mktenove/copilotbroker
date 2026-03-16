const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── helpers ──────────────────────────────────────────────────────────────────

function rex(html: string, pattern: RegExp): string {
  return html.match(pattern)?.[1]?.trim() ?? "";
}

function ogTag(html: string, prop: string): string {
  return (
    rex(html, new RegExp(`<meta[^>]*property="og:${prop}"[^>]*content="([^"]*)"`, "i")) ||
    rex(html, new RegExp(`<meta[^>]*content="([^"]*)"[^>]*property="og:${prop}"`, "i"))
  );
}

function metaName(html: string, name: string): string {
  return (
    rex(html, new RegExp(`<meta[^>]*name="${name}"[^>]*content="([^"]*)"`, "i")) ||
    rex(html, new RegExp(`<meta[^>]*content="([^"]*)"[^>]*name="${name}"`, "i"))
  );
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&nbsp;/g, " ");
}

function parseJsonLd(html: string): Record<string, unknown> {
  const matches = [
    ...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi),
  ];
  for (const m of matches) {
    try {
      const raw = JSON.parse(m[1]);
      const items: unknown[] = Array.isArray(raw) ? raw : [raw];
      for (const item of items) {
        if (item && typeof item === "object") {
          const t = String((item as Record<string, unknown>)["@type"] ?? "");
          if (
            t.includes("RealEstate") ||
            t.includes("Apartment") ||
            t.includes("House") ||
            t.includes("Residence") ||
            t.includes("Product")
          ) {
            return item as Record<string, unknown>;
          }
        }
      }
      // fallback: first item with name/description
      for (const item of items) {
        if (item && typeof item === "object") {
          const r = item as Record<string, unknown>;
          if (r.name || r.description) return r;
        }
      }
    } catch {
      // ignore
    }
  }
  return {};
}

function extractImages(html: string): string[] {
  const seen = new Set<string>();
  const push = (url: string) => {
    if (!url || seen.has(url)) return;
    if (url.startsWith("http") && /\.(jpg|jpeg|png|webp|gif)/i.test(url.split("?")[0])) {
      seen.add(url);
    }
  };

  // og:image (multiple)
  for (const m of html.matchAll(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/gi)) push(m[1]);
  for (const m of html.matchAll(/<meta[^>]*content="([^"]+)"[^>]*property="og:image"/gi)) push(m[1]);

  // JSON-LD "image"
  for (const m of html.matchAll(/"image"\s*:\s*"(https?:\/\/[^"]+)"/g)) push(m[1]);
  for (const m of html.matchAll(/"url"\s*:\s*"(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi)) push(m[1]);

  // data-src / data-lazy-src on img tags (common in BR real estate sites)
  for (const m of html.matchAll(/data-(?:src|original|lazy-src|full)="(https?:\/\/[^"]+)"/gi)) {
    if (seen.size < 20) push(m[1]);
  }

  // Regular src on img tags
  for (const m of html.matchAll(/<img[^>]+src="(https?:\/\/[^"]+)"/gi)) {
    if (seen.size < 20) push(m[1]);
  }

  return [...seen].slice(0, 20);
}

function extractBRPatterns(html: string) {
  // Strip HTML for text analysis
  const text = decodeEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));

  const bedroomsMatch = text.match(/(\d+)\s*(?:dormitório|quarto|dorm\.)/i);
  const bedrooms = bedroomsMatch ? parseInt(bedroomsMatch[1]) : null;

  const suitesMatch = text.match(/(\d+)\s*suíte/i);
  const suites = suitesMatch ? parseInt(suitesMatch[1]) : null;

  const parkingMatch = text.match(/(\d+)\s*(?:vaga[s]?(?:\s*de\s*garagem)?|garagem)/i);
  const parking = parkingMatch ? parseInt(parkingMatch[1]) : null;

  // Area: "85 m²", "85m²", "85,00 m²", "de 85 a 120 m²" → take first number
  const areaMatch =
    text.match(/(\d+(?:[.,]\d+)?)\s*m[²2]/i) || text.match(/(\d+)\s*metros\s*quadrados/i);
  const area = areaMatch ? parseFloat(areaMatch[1].replace(",", ".")) : null;

  // Price: R$ value
  const priceMatch = text.match(/R\$\s*[\d.,]+(?:\s*(?:mil|milhão|milhões))?/i);
  const price = priceMatch ? priceMatch[0].replace(/\s+/g, " ").trim() : "";

  // City: look after common prepositions
  const cityMatch = text.match(
    /(?:em\s+|localizado em\s+|situado em\s+|cidade de\s+)([A-ZÀ-Ú][a-zA-ZÀ-ú\s]{2,25}?)(?:\s*[,\/\-–|]|\s{2,}|$)/
  );
  const city = cityMatch
    ? cityMatch[1]
        .trim()
        .replace(/\s+/g, " ")
        .split(/\s*[,\/\-–|]/)[0]
        .trim()
    : "";

  // Amenities: look for common words
  const amenityTerms = [
    "piscina",
    "academia",
    "churrasqueira",
    "playground",
    "quadra",
    "sauna",
    "salão de festas",
    "spa",
    "garden",
    "varanda",
    "terraço",
    "rooftop",
    "coworking",
    "pet space",
    "espaço gourmet",
  ];
  const textLower = text.toLowerCase();
  const amenities = amenityTerms
    .filter((a) => textLower.includes(a))
    .map((a) => a.charAt(0).toUpperCase() + a.slice(1));

  return { bedrooms, suites, parking, area, price, city, amenities };
}

// ── main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string" || !url.startsWith("http")) {
      return new Response(JSON.stringify({ error: "URL inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });

    if (!res.ok) throw new Error(`Não foi possível acessar o site (status ${res.status})`);

    const html = await res.text();

    const jsonLd = parseJsonLd(html);
    const br = extractBRPatterns(html);
    const images = extractImages(html);

    // Name — prefer og:title, then JSON-LD, then <title>
    let name =
      ogTag(html, "title") ||
      String(jsonLd["name"] ?? "") ||
      metaName(html, "title") ||
      rex(html, /<title[^>]*>([^<]*)<\/title>/i);
    // Split by separators and take the longest segment (property name is usually longer than site name)
    const nameParts = decodeEntities(name).split(/\s*[|\-–—]\s*/).map((p) => p.trim()).filter(Boolean);
    name = (nameParts.sort((a, b) => b.length - a.length)[0] ?? "").slice(0, 120);

    // Description
    let description =
      ogTag(html, "description") ||
      String(jsonLd["description"] ?? "") ||
      metaName(html, "description");
    description = decodeEntities(description).trim().slice(0, 600);

    const result = {
      name,
      description,
      city: br.city,
      bedrooms: br.bedrooms,
      suites: br.suites,
      parking_spots: br.parking,
      area_m2: br.area,
      price_range: br.price,
      amenities: br.amenities,
      images, // all found image URLs
      main_image_url: images[0] ?? "",
      source_url: url,
    };

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("scrape-property error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

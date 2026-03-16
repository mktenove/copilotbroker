import Anthropic from "npm:@anthropic-ai/sdk@0.27.3";
import OpenAI from "npm:openai@4.67.3";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function getAuthUser(authHeader?: string) {
  if (!authHeader) return { user: null, error: new Error("No auth header") };
  const token = authHeader.replace("Bearer ", "");
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_SERVICE_ROLE_KEY },
  });
  if (!res.ok) return { user: null, error: new Error(`Auth failed: ${res.status}`) };
  const user = await res.json();
  return { user, error: null };
}

// Load AI config from platform_settings, falling back to env vars
async function loadAiConfig() {
  const { data } = await supabase
    .from("platform_settings")
    .select("key, value")
    .in("key", [
      "ai_provider",
      "anthropic_api_key", "anthropic_model",
      "openai_api_key", "openai_model",
      "gemini_api_key", "gemini_model",
    ]);

  const s: Record<string, string> = {};
  (data || []).forEach(({ key, value }: { key: string; value: string }) => { if (value) s[key] = value; });

  return {
    provider: (s["ai_provider"] || "anthropic") as "anthropic" | "openai" | "gemini",
    anthropic: {
      apiKey: s["anthropic_api_key"] || Deno.env.get("ANTHROPIC_API_KEY") || "",
      model: s["anthropic_model"] || "claude-sonnet-4-6",
    },
    openai: {
      apiKey: s["openai_api_key"] || "",
      model: s["openai_model"] || "gpt-4o",
    },
    gemini: {
      apiKey: s["gemini_api_key"] || "",
      model: s["gemini_model"] || "gemini-2.0-flash",
    },
  };
}

// Call the configured AI provider and return raw text
async function callAi(systemPrompt: string, userPrompt: string): Promise<string> {
  const cfg = await loadAiConfig();

  if (cfg.provider === "anthropic") {
    const client = new Anthropic({ apiKey: cfg.anthropic.apiKey });
    const message = await client.messages.create({
      model: cfg.anthropic.model,
      max_tokens: 4096,
      messages: [{ role: "user", content: userPrompt }],
      system: systemPrompt,
    });
    const raw = message.content[0];
    if (raw.type !== "text") throw new Error("Resposta inválida da IA");
    return raw.text;
  }

  if (cfg.provider === "openai") {
    const client = new OpenAI({ apiKey: cfg.openai.apiKey });
    const completion = await client.chat.completions.create({
      model: cfg.openai.model,
      max_tokens: 4096,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    return completion.choices[0].message.content ?? "";
  }

  if (cfg.provider === "gemini") {
    // Gemini exposes an OpenAI-compatible endpoint
    const client = new OpenAI({
      apiKey: cfg.gemini.apiKey,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
    const completion = await client.chat.completions.create({
      model: cfg.gemini.model,
      max_tokens: 4096,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    return completion.choices[0].message.content ?? "";
  }

  throw new Error(`Provedor de IA desconhecido: ${cfg.provider}`);
}

const STATUS_LABELS: Record<string, string> = {
  pre_launch: "Pré-Lançamento",
  launch: "Lançamento",
  selling: "Em Vendas",
  sold_out: "Esgotado",
  renting: "Para Locação",
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: "Apartamento",
  house: "Casa",
  land: "Terreno",
  lot: "Loteamento",
  commercial: "Comercial",
  office: "Sala Comercial",
  penthouse: "Cobertura",
  studio: "Studio",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? undefined;
    const { user, error: authError } = await getAuthUser(authHeader);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { project, chatMessage } = body;

    if (!project) {
      return new Response(JSON.stringify({ error: "Dados do projeto são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build project context string
    const statusLabel = STATUS_LABELS[project.status] || project.status;
    const typeLabel = PROPERTY_TYPE_LABELS[project.property_type] || project.property_type || "Imóvel";

    const projectContext = `
Nome: ${project.name}
Tipo: ${typeLabel}
Status: ${statusLabel}
Cidade: ${project.city}
${project.address ? `Endereço/Bairro: ${project.address}` : ""}
${project.bedrooms ? `Dormitórios: ${project.bedrooms}` : ""}
${project.suites ? `Suítes: ${project.suites}` : ""}
${project.parking_spots ? `Vagas de garagem: ${project.parking_spots}` : ""}
${project.area_m2 ? `Metragem: ${project.area_m2}m²` : ""}
${project.price_range ? `Faixa de preço: ${project.price_range}` : ""}
${project.amenities?.length ? `Área de lazer: ${project.amenities.join(", ")}` : ""}
${project.differentials ? `Diferenciais: ${project.differentials}` : ""}
${project.ideal_buyer ? `Perfil do comprador ideal: ${project.ideal_buyer}` : ""}
${project.description ? `Descrição adicional: ${project.description}` : ""}
`.trim();

    let systemPrompt = `Você é um especialista em marketing imobiliário e copywriting de alta conversão no Brasil.
Você cria landing pages persuasivas e profissionais para imóveis e empreendimentos.

O frontend que renderiza seu JSON usa React + Tailwind CSS com fontes Google Fonts.
Ao escolher o tema visual, siga estas diretrizes:
- primaryColor e accentColor devem ter bom contraste entre si e funcionar sobre o bgColor
- bgColor escuro (ex: #0f0f1a, #12121e) transmite luxo/sofisticação; claro (ex: #f8f7f4, #ffffff) transmite clareza/modernidade
- Para empreendimentos de alto padrão: fontFamily "Playfair Display" ou "Cormorant Garamond"
- Para empreendimentos modernos/urbanos: fontFamily "Inter" ou "Plus Jakarta Sans"
- Para empreendimentos familiares/aconchegantes: fontFamily "Nunito" ou "Poppins"
- Para empreendimentos premium executivos: fontFamily "Montserrat" ou "Raleway"
- heroStyle: prefira "dark-overlay" quando há imagem de fundo; "gradient" para layouts clean

Sempre responda com JSON válido. Não inclua markdown, apenas o JSON puro.`;

    let userPrompt: string;

    if (chatMessage && body.existingData) {
      systemPrompt += `\nO usuário quer ajustar partes da landing page existente. Retorne o JSON completo atualizado.`;
      userPrompt = `
Dados do empreendimento:
${projectContext}

Landing page atual (JSON):
${JSON.stringify(body.existingData, null, 2)}

Pedido do usuário: "${chatMessage}"

Aplique as alterações solicitadas e retorne o JSON completo da landing page com as mesmas chaves, mantendo o que não foi pedido para alterar.
Retorne APENAS o JSON, sem explicações.`;
    } else {
      userPrompt = `
Crie uma landing page completa para o seguinte empreendimento imobiliário:

${projectContext}

Gere um JSON com esta estrutura EXATA:

{
  "theme": {
    "primaryColor": "cor hex adequada para o perfil do imóvel",
    "accentColor": "cor hex de destaque complementar",
    "bgColor": "cor hex do fundo",
    "textColor": "cor hex do texto principal",
    "fontFamily": "nome da fonte Google adequada ao estilo",
    "heroStyle": "dark-overlay ou light-overlay ou gradient"
  },
  "hero": {
    "badge": "badge contextual ao status",
    "title": "título principal forte e conceitual",
    "titleHighlight": "parte do título para destacar (pode ser vazia)",
    "subtitle": "subtítulo contextualizando localização ou proposta de valor",
    "ctaText": "texto do botão CTA principal"
  },
  "location": {
    "title": "título da seção de localização",
    "description": "parágrafo valorizando a localização estratégica",
    "highlights": ["ponto forte 1", "ponto forte 2", "ponto forte 3", "ponto forte 4"]
  },
  "features": [
    {"icon": "emoji", "label": "rótulo do diferencial", "value": "valor/descrição"},
    {"icon": "emoji", "label": "rótulo", "value": "valor"},
    {"icon": "emoji", "label": "rótulo", "value": "valor"},
    {"icon": "emoji", "label": "rótulo", "value": "valor"},
    {"icon": "emoji", "label": "rótulo", "value": "valor"},
    {"icon": "emoji", "label": "rótulo", "value": "valor"}
  ],
  "audience": [
    {"title": "perfil de público 1", "description": "descrição breve"},
    {"title": "perfil de público 2", "description": "descrição breve"},
    {"title": "perfil de público 3", "description": "descrição breve"},
    {"title": "perfil de público 4", "description": "descrição breve"}
  ],
  "urgency": {
    "type": "urgency ou opportunity ou availability",
    "title": "título da seção de urgência/oportunidade",
    "description": "texto persuasivo adaptado ao status do imóvel",
    "highlight": "destaque numérico ou frase de impacto"
  },
  "benefits": [
    {"icon": "emoji", "title": "benefício de se cadastrar 1", "description": "descrição breve"},
    {"icon": "emoji", "title": "benefício 2", "description": "descrição breve"},
    {"icon": "emoji", "title": "benefício 3", "description": "descrição breve"},
    {"icon": "emoji", "title": "benefício 4", "description": "descrição breve"}
  ],
  "cta": {
    "title": "título do bloco CTA final",
    "subtitle": "subtítulo convite para ação",
    "buttonText": "texto do botão"
  },
  "form": {
    "title": "título do formulário",
    "subtitle": "subtítulo do formulário",
    "buttonText": "texto do botão de envio",
    "thankYouTitle": "título da tela de agradecimento",
    "thankYouMessage": "mensagem de agradecimento após envio"
  },
  "floatingButtonText": "texto do botão flutuante mobile",
  "footer": {
    "disclaimer": "disclaimer legal breve"
  }
}

Retorne APENAS o JSON, sem markdown, sem explicações.`;
    }

    let jsonText = (await callAi(systemPrompt, userPrompt)).trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
    }

    const landingPageData = JSON.parse(jsonText);

    if (!chatMessage && project.id) {
      await supabase
        .from("projects")
        .update({
          landing_page_data: landingPageData,
          landing_page_generated_at: new Date().toISOString(),
        })
        .eq("id", project.id);
    }

    return new Response(JSON.stringify({ data: landingPageData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("generate-landing-page error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

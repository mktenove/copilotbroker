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

async function callAi(systemPrompt: string, userPrompt: string): Promise<string> {
  const cfg = await loadAiConfig();

  if (cfg.provider === "anthropic") {
    const client = new Anthropic({ apiKey: cfg.anthropic.apiKey });
    const message = await client.messages.create({
      model: cfg.anthropic.model,
      max_tokens: 8192,
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
      max_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    return completion.choices[0].message.content ?? "";
  }

  if (cfg.provider === "gemini") {
    const client = new OpenAI({
      apiKey: cfg.gemini.apiKey,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
    const completion = await client.chat.completions.create({
      model: cfg.gemini.model,
      max_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    return completion.choices[0].message.content ?? "";
  }

  throw new Error(`Provedor de IA desconhecido: ${cfg.provider}`);
}

// Deep merge: recursively merges source into target (arrays are replaced, not merged)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepMerge(target: any, source: any): any {
  if (typeof source !== "object" || source === null) return source;
  if (Array.isArray(source)) return source;
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      typeof source[key] === "object" &&
      source[key] !== null &&
      !Array.isArray(source[key]) &&
      typeof target?.[key] === "object" &&
      target[key] !== null &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
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

// ─── Shared LP expertise block ────────────────────────────────────────────────
const LP_EXPERTISE = `Você é um diretor criativo + copywriter de conversão + designer de landing pages premium para mercado imobiliário brasileiro.

Sua missão é gerar landing pages únicas, com identidade visual distinta e copy altamente persuasiva — cada geração deve parecer uma peça original, não um template repetido.

OBJETIVO PRINCIPAL
Criar uma landing page que faça o visitante sentir:
1. Desejo imediato pelo imóvel/empreendimento
2. Confiança genuína na oferta
3. Urgência real para agir agora
4. Total clareza sobre o próximo passo

REGRAS ESTRATÉGICAS
- Não escreva como catálogo técnico.
- Não faça blocos frios e sem emoção.
- Não use copy genérica como "realize seu sonho" ou "oportunidade imperdível" sem contexto.
- Toda seção deve ter uma função psicológica clara: atrair, provar, qualificar, reduzir objeção ou converter.
- O texto deve parecer de marca premium/comercial forte, não de IA.
- Sempre escrever em português do Brasil.
- O design deve parecer intencional, sofisticado e memorável.
- Priorize composição editorial com contraste, respiro, ritmo visual e um "hero moment" forte.

IDENTIDADE VISUAL — ESCOLHA COM INTENÇÃO
DARK PREMIUM (luxo, alto padrão, investimento exclusivo):
- "luxury-gold"        → fundo quase preto, dourado quente → Cormorant Garamond ou Playfair Display
- "luxury-copper"      → fundo quase preto, cobre → Cormorant Garamond
- "prestige-white"     → fundo escuro, branco pérola → Montserrat
- "corporate-navy"     → fundo navy escuro, azul elétrico → Plus Jakarta Sans
- "premium-terracotta" → fundo escuro, terracota → Raleway
- "prestige-emerald"   → fundo escuro, verde esmeralda → Montserrat
- "editorial-slate"    → fundo escuro, cinza azulado → DM Sans
- "bold-yellow"        → fundo quase preto, amarelo → Plus Jakarta Sans
- "deep-ocean"         → fundo azul noite profundo, ciano → DM Sans
- "crimson-night"      → fundo quase preto, vermelho vivo → Montserrat
- "violet-dark"        → fundo roxo escuro, lilás → Plus Jakarta Sans

LIGHT EDITORIAL (moderno, familiar, acessível, urbano):
- "pure-light"         → fundo branco, preto/azul → Plus Jakarta Sans ou DM Sans → heroStyle: light-overlay
- "warm-paper"         → fundo creme, cobre escuro → Nunito ou Poppins → heroStyle: light-overlay
- "fresh-sage"         → fundo quase branco, verde → Nunito → heroStyle: light-overlay
- "modern-slate"       → fundo gelo, navy escuro → DM Sans → heroStyle: light-overlay
- "azure-clean"        → fundo azul claro, azul royal → Plus Jakarta Sans → heroStyle: light-overlay
- "coral-energy"       → fundo pêssego, laranja → Poppins → heroStyle: light-overlay
- "rose-luxury"        → fundo rosa claro, bordô → Cormorant Garamond → heroStyle: light-overlay
- "forest-premium"     → fundo verde-claro, verde escuro → Raleway → heroStyle: light-overlay

REGRA DO heroStyle: temas dark = "dark-overlay"; temas light = "light-overlay"; sem imagem = "gradient"

ÍCONES LUCIDE (use SEMPRE nomes exatos, NUNCA emojis):
Cômodos: BedDouble, Bath, ShowerHead, Car, Sofa, Maximize2, LayoutDashboard, Building2, Home, Layers
Lazer: Waves, Dumbbell, Bike, Trees, Coffee, UtensilsCrossed, Wine, Gamepad2, Music2
Localização: MapPin, Navigation, Globe, Train, Bus, ShoppingBag, School, Hospital, TreePine
Qualidade: Shield, Star, Award, Crown, Gem, CheckCircle2, BadgeCheck, Sparkles, TrendingUp, Zap
Contato/Negócio: Phone, MessageCircle, Mail, CalendarCheck, Clock, Bell, DollarSign, Key, FileText

Para o campo "theme", use APENAS: preset, fontFamily, heroStyle. NÃO inclua primaryColor, accentColor, bgColor, textColor.

PROIBIDO INVENTAR:
- ❌ NÃO mencione pré-lançamento, obras, entrega prevista a não ser que esteja nos dados
- ❌ NÃO invente unidades restantes, vagas ou prazos
- ❌ NÃO cite preços a não ser que estejam nos dados
- ❌ NÃO mencione "exclusividade" ou "últimas unidades" sem base nos dados
- Se os dados não informam o estágio, trate como imóvel pronto/disponível

COPY RULES:
- Transformar atributo em impacto: "157 m²" → "157 m² para viver sem limitação"
- Headline comercial memorável — NÃO o nome do empreendimento, NÃO lista de atributos
- Frases curtas, seguras, específicas
- O visitante precisa sentir que perder essa oportunidade custa algo`;

// ─── Full LP JSON schema example ─────────────────────────────────────────────
const LP_SCHEMA = `{
  "theme": { "preset": "nome-do-preset", "fontFamily": "Fonte Google", "heroStyle": "dark-overlay|light-overlay|gradient" },
  "hero": { "badge": "...", "title": "...", "titleHighlight": "...", "subtitle": "...", "ctaText": "..." },
  "location": { "title": "...", "description": "...", "highlights": ["...", "...", "...", "..."] },
  "features": [{ "icon": "NomeLucide", "label": "...", "value": "..." }],
  "audience": [{ "title": "...", "description": "..." }],
  "urgency": { "type": "urgency|opportunity|availability", "title": "...", "description": "...", "highlight": "..." },
  "benefits": [{ "icon": "NomeLucide", "title": "...", "description": "..." }],
  "cta": { "title": "...", "subtitle": "...", "buttonText": "..." },
  "form": { "title": "...", "subtitle": "...", "buttonText": "...", "thankYouTitle": "...", "thankYouMessage": "..." },
  "floatingButtonText": "...",
  "footer": { "disclaimer": "..." }
}`;

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
    const { project, chatMessage, existingData, chatHistory } = body;

    if (!project) {
      return new Response(JSON.stringify({ error: "Dados do projeto são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const statusLabel = STATUS_LABELS[project.status] || project.status;
    const typeLabel = PROPERTY_TYPE_LABELS[project.property_type] || project.property_type || "Imóvel";
    const scrapedImagesForContext: string[] = project.scraped_images || [];

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
${scrapedImagesForContext.length > 0
  ? `Imagens disponíveis: ${scrapedImagesForContext.length} fotos`
  : ""}
${project.description && project.description.length > 200
  ? `Referência factual (APENAS fatos brutos — NÃO copie nem parafraseie):\n${project.description.slice(0, 3000)}`
  : project.description ? `Contexto: ${project.description}` : ""}
`.trim();

    let systemPrompt: string;
    let userPrompt: string;
    let isChatMode = false;

    // ── MODO CHAT (edição inteligente) ───────────────────────────────────────
    if (chatMessage && existingData) {
      isChatMode = true;

      const currentPreset = existingData?.theme?.preset || "desconhecido";
      const currentHeroStyle = existingData?.theme?.heroStyle || "desconhecido";

      systemPrompt = `${LP_EXPERTISE}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODO EDITOR INTELIGENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Você é o editor inteligente da landing page. Recebe a LP atual, histórico de conversa e um novo pedido.

PASSO 1 — CLASSIFICAR A INTENÇÃO:

→ "patch" (edição cirúrgica): o usuário quer ajuste pontual sem reformular o todo
   PATCH quando: "muda o título", "deixa o CTA mais urgente", "reescreve os benefícios",
   "troca a fonte", "muda a cor do tema", "deixa o badge diferente", "adiciona urgência",
   "deixa mais curto", "foco em família", "foco em investidor", "ajusta o subtítulo",
   "muda só o hero", "muda só a seção X"

→ "full" (novo layout): o usuário quer identidade visual, narrativa e copy completamente novos
   FULL quando: "altera a estrutura", "muda o layout", "reorganiza a página", "cria outro layout",
   "versão diferente", "refaz do zero", "muda tudo", "gera um novo", "outra abordagem",
   "quero outro estilo", "mais luxuoso", "mais moderno", "tema completamente diferente",
   "parece muito parecido", "tenta de novo diferente", "não gostei, faz outro"

PASSO 2 — AGIR:

SE "patch":
  Retorne APENAS os campos que mudaram, em formato nested. NÃO repita campos inalterados.
  {
    "type": "patch",
    "changes": { /* somente o que mudou, ex: {"hero": {"title": "novo título"}} */ },
    "message": "O que você fez, específico, 1-2 frases"
  }

SE "full" — REGRAS OBRIGATÓRIAS DE REDIAGRAMAÇÃO COMPLETA:
  ❶ TEMA: escolha um preset DIFERENTE de "${currentPreset}". Mude também a família tipográfica.
  ❷ heroStyle: se o tema atual é "${currentHeroStyle}", use o oposto sempre que possível.
     Light themes (pure-light, warm-paper, fresh-sage, modern-slate, azure-clean, coral-energy, rose-luxury, forest-premium) = SEMPRE "light-overlay"
     Dark themes (luxury-gold, luxury-copper, prestige-white, corporate-navy, premium-terracotta, prestige-emerald, editorial-slate, bold-yellow, deep-ocean, crimson-night, violet-dark) = SEMPRE "dark-overlay"
  ❸ HEADLINE: ângulo completamente diferente — se o atual foca em localização, foque em lifestyle; se foca em espaço, foque em exclusividade; etc.
  ❹ NARRATIVA: mude o posicionamento de vendas — outro perfil de comprador como protagonista, outra promessa central
  ❺ COPY TONE: se o atual é direto/objetivo, seja mais emocional; se é emocional, seja mais editorial/frio
  ❻ BADGE e URGENCY: ângulo diferente do atual
  NÃO é aceitável entregar apenas mudança de cor com o mesmo texto/estrutura narrativa.

  {
    "type": "full",
    "data": { /* LP completa seguindo o schema */ },
    "message": "Descreva o que mudou: novo tema, nova direção criativa, novo posicionamento — 2-3 frases"
  }

SCHEMA COMPLETO (para "full"):
${LP_SCHEMA}

CONTRASTE — REGRA ABSOLUTA:
- Temas DARK (fundo escuro): textos primários são claros/brancos pelo sistema. NÃO defina cores explícitas.
- Temas LIGHT (fundo claro): textos primários são escuros pelo sistema. NÃO defina cores explícitas.
- O heroStyle correto garante o contraste do hero automaticamente. Sempre defina heroStyle correto.
- Galeria de imagens é preservada pelo sistema — NÃO inclua "gallery" nem "hero.bgImage" na resposta.
- Retorne APENAS o JSON. Sem markdown. Sem explicações fora do campo "message".`;

      // Build conversation history context
      const historyLines: string[] = (chatHistory || []).map(
        (m: { role: string; content: string }) =>
          `${m.role === "user" ? "Usuário" : "IA"}: ${m.content}`
      );
      const historyBlock = historyLines.length > 0
        ? `\nHistórico da conversa:\n${historyLines.join("\n")}\n`
        : "";

      userPrompt = `Empreendimento:
${projectContext}

Landing page atual:
${JSON.stringify(existingData, null, 2)}
${historyBlock}
Novo pedido: "${chatMessage}"`;
    }

    // ── MODO GERAÇÃO INICIAL ─────────────────────────────────────────────────
    else {
      systemPrompt = `${LP_EXPERTISE}

Sempre responda com JSON válido seguindo o schema exato. Não inclua markdown, apenas o JSON puro.`;

      userPrompt = `Crie a landing page para o seguinte empreendimento imobiliário. Aplique toda a sua expertise de diretor criativo + copywriter de conversão + designer premium.

DADOS DO EMPREENDIMENTO:
${projectContext}

ORIENTAÇÃO CRIATIVA:
- Escolha o posicionamento correto (luxo, premium, médio-alto, família, investimento) com base nos dados
- O theme deve refletir o posicionamento com cores, tipografia e estilo coerentes
- hero.title: headline comercial forte, específica e memorável — NÃO o nome do empreendimento
- hero.titleHighlight: palavra-chave mais impactante do título (ou string vazia)
- hero.subtitle: frase densa — localização + proposta de valor + quem é o imóvel
- location.highlights: pontos reais e concretos (ex: "A 500m do metrô Butantã", não "Bem localizado")
- features: APENAS atributos nos dados (área, dormitórios, vagas, suítes, amenidades confirmadas)
- audience: perfis específicos — fazer o lead se reconhecer
- urgency: elegante, sem spam, baseada no status real
- benefits: por que deixar o contato, não atributos do imóvel
- cta.title: fecha a narrativa com força, sem clichê
- form.subtitle: segurança + próximo passo

Gere o JSON com esta estrutura EXATA:
${LP_SCHEMA}

Retorne APENAS o JSON. Sem markdown. Sem explicações.`;
    }

    let rawText = (await callAi(systemPrompt, userPrompt)).trim();
    if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(rawText);

    // Light themes require heroStyle = "light-overlay" for correct text contrast
    const LIGHT_PRESETS = new Set([
      "pure-light", "warm-paper", "fresh-sage", "modern-slate",
      "azure-clean", "coral-energy", "rose-luxury", "forest-premium",
    ]);

    function fixHeroStyle(data: Record<string, unknown>) {
      const theme = data.theme as Record<string, unknown> | undefined;
      if (!theme) return;
      const preset = theme.preset as string | undefined;
      if (!preset) return;
      if (LIGHT_PRESETS.has(preset)) {
        theme.heroStyle = "light-overlay";
      } else if (theme.heroStyle === "light-overlay") {
        // Dark theme mistakenly set to light — correct it
        theme.heroStyle = "dark-overlay";
      }
    }

    let landingPageData: Record<string, unknown>;
    let aiMessage = "";
    let responseType = "full";

    if (isChatMode) {
      responseType = parsed.type || "full";

      if (parsed.type === "patch" && parsed.changes) {
        // Surgical merge — only changed fields; preserve elementStyles
        landingPageData = deepMerge(existingData, parsed.changes);
        landingPageData.gallery = existingData.gallery;
        if (existingData.hero?.bgImage) {
          (landingPageData.hero as Record<string, unknown>).bgImage = existingData.hero.bgImage;
        }
        fixHeroStyle(landingPageData);
      } else {
        // Full regen — take new data, wipe elementStyles so no stale color overrides
        landingPageData = parsed.data || parsed;
        delete landingPageData.elementStyles; // clear old per-element overrides
        if (existingData?.gallery?.length > 0) {
          landingPageData.gallery = existingData.gallery;
          if (!landingPageData.hero) landingPageData.hero = {};
          if (existingData.hero?.bgImage) {
            (landingPageData.hero as Record<string, unknown>).bgImage = existingData.hero.bgImage;
          }
        }
        fixHeroStyle(landingPageData);
      }

      aiMessage = parsed.message || (parsed.type === "patch" ? "Edição aplicada." : "Nova versão criada.");
    } else {
      // Initial generation
      landingPageData = parsed;
      fixHeroStyle(landingPageData);
      const scrapedImages: string[] = scrapedImagesForContext;
      if (scrapedImages.length > 0) {
        landingPageData.gallery = scrapedImages;
        if (!landingPageData.hero) landingPageData.hero = {};
        if (!(landingPageData.hero as Record<string, unknown>).bgImage && scrapedImages[0]) {
          (landingPageData.hero as Record<string, unknown>).bgImage = scrapedImages[0];
        }
      }
    }

    landingPageData.layout = "flow-A";

    if (project.id) {
      await supabase
        .from("projects")
        .update({
          landing_page_data: landingPageData,
          landing_page_status: "published",
          landing_page_generated_at: new Date().toISOString(),
          ...(scrapedImagesForContext.length > 0 && !isChatMode ? { scraped_images: scrapedImagesForContext } : {}),
        })
        .eq("id", project.id);
    }

    return new Response(JSON.stringify({ data: landingPageData, message: aiMessage, type: responseType }), {
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

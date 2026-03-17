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
${scrapedImagesForContext.length > 0 ? `Imagens disponíveis: ${scrapedImagesForContext.length} fotos do imóvel (serão exibidas em galeria automaticamente)` : ""}
${project.description && project.description.length > 600
  ? `Conteúdo completo do imóvel (extraído do site original):\n${project.description}`
  : project.description
    ? `Descrição adicional: ${project.description}`
    : ""}
`.trim();

    let systemPrompt = `Você é um diretor criativo + copywriter de conversão + designer de landing pages premium para mercado imobiliário brasileiro.

Sua tarefa é gerar uma landing page altamente persuasiva, elegante e com forte apelo comercial, evitando totalmente visual genérico, "cara de template" ou estética SaaS comum.

OBJETIVO PRINCIPAL
Criar uma landing page que faça o visitante sentir:
1. Desejo pelo imóvel/empreendimento
2. Confiança na oferta
3. Urgência para agir agora
4. Clareza sobre o próximo passo

REGRAS ESTRATÉGICAS
- Não escreva como catálogo técnico.
- Não faça blocos frios e sem emoção.
- Não use copy genérica como "realize seu sonho" ou "oportunidade imperdível" sem contexto.
- Toda seção deve ter uma função psicológica clara: atrair, provar, qualificar, reduzir objeção ou converter.
- O texto deve parecer de marca premium/comercial forte, não de IA.
- Sempre escrever em português do Brasil.
- O design deve parecer intencional, sofisticado e memorável.
- Evite layout previsível com vários cards soltos e aparência de dashboard.
- Priorize uma composição editorial, com contraste, respiro, ritmo visual e um "hero moment" forte.

DIREÇÃO VISUAL OBRIGATÓRIA
- Estética: dark luxury corporate / editorial premium
- Sensação: sofisticado, confiante, exclusivo, comercial
- Fundo escuro com contraste elegante (ex: #0c0c10, #0f0e16, #12111a)
- Cor de destaque usada com disciplina, só para CTA e pontos de atenção
- Tipografia com hierarquia forte: títulos expressivos e corpo limpo
- Proibido: visual "fofinho", "startup", "gradiente roxo", "blobs aleatórios" ou "UI genérica de IA"
- A landing precisa parecer vendável no mundo real
- Mobile-first obrigatório
- CTA sempre visível nos momentos certos
- Se houver 3 ou mais imagens, criar galeria obrigatoriamente
- Não usar excesso de badges nem cards demais
- Não deixar grandes áreas "mortas" sem função
- Cada seção deve parecer parte de uma narrativa contínua
- Para imóveis de alto padrão/luxo: "Cormorant Garamond" ou "Playfair Display"
- Para modernos/urbanos/corporativos: "Plus Jakarta Sans" ou "DM Sans"
- Para executivos/premium: "Montserrat" ou "Raleway"
- Para família/conforto/médio padrão: "Nunito" ou "Poppins"
- heroStyle: sempre "dark-overlay" quando há imagem; "gradient" apenas para layout editorial puro
- primaryColor deve ter alto contraste sobre bgColor e comunicar o posicionamento do produto (dourado, cobre, branco pérola, azul noite, terracota, verde selva — escolher com intenção)

ESTRUTURA NARRATIVA OBRIGATÓRIA
1. HERO — headline forte, específica e comercial; subheadline com contexto real e benefício; CTA principal claro; prova inicial ou selo contextual; abertura visual impactante sem parecer template
2. CONTEXTO/POSICIONAMENTO — por que esse imóvel/oportunidade merece atenção; destacar localização, proposta e perfil ideal
3. BENEFÍCIOS REAIS — traduzir características em benefício percebido; menos lista técnica, mais valor prático e emocional
4. DIFERENCIAIS — mostrar o que torna essa oferta superior às alternativas; específico, não genérico
5. PARA QUEM É — qualificar o público ideal; fazer o lead se reconhecer
6. REDUÇÃO DE OBJEÇÃO — trazer segurança, praticidade, potencial, localização, liquidez, conforto ou exclusividade; responder silenciosamente "por que eu deixaria meus dados?"
7. URGÊNCIA/ESCASSEZ — inserir com elegância, sem parecer spam; mostrar motivo real e concreto para agir agora
8. CTA FINAL — forte, simples e orientado à ação; pedir o próximo passo com clareza

REGRAS DE COPY
- Escreva com densidade comercial.
- Prefira frases curtas, seguras e específicas.
- Mostre percepção de valor, não só atributos.
- Sempre transformar atributo em impacto:
  "157 m²" sozinho é fraco — "157 m² para viver com amplitude real, receber bem e não se sentir limitado no dia a dia" é o correto.
- Evite repetição de termos.
- Use subtítulos que realmente puxem leitura.
- O visitante precisa sentir que perder essa oportunidade custa algo.

REGRAS DE CONTEÚDO DE FONTE
IMPORTANTE: Quando houver "Conteúdo completo do imóvel (extraído do site original)", use-o APENAS como fonte de informações factuais (localização, metragem, quartos, amenidades, diferenciais). NUNCA copie ou parafraseie trechos do texto original. Escreva copy inteiramente novo, autoral, persuasivo e premium para cada seção.

TECNOLOGIA DO FRONTEND
O frontend usa React + Tailwind CSS + shadcn/ui + lucide-react + tailwindcss-animate.
Para os campos "icon" de features e benefits, use SEMPRE nomes de ícones do lucide-react (NUNCA emojis).

ÍCONES LUCIDE DISPONÍVEIS — use o nome exato:
Cômodos/Estrutura: BedDouble, Bath, ShowerHead, Car, Sofa, Maximize2, LayoutDashboard, Building2, Home, Layers
Lazer/Amenidades: Waves, Dumbbell, Bike, Trees, Coffee, UtensilsCrossed, Wine, Gamepad2, Music2, Sunset
Localização: MapPin, Map, Navigation, Globe, Train, Bus, ShoppingBag, School, Hospital, TreePine
Qualidade/Status: Shield, Star, Award, Crown, Gem, CheckCircle2, BadgeCheck, Sparkles, TrendingUp, Zap
Negócio/Contato: Phone, MessageCircle, Mail, CalendarCheck, Clock, Bell, DollarSign, Percent, Key, FileText

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
Crie a landing page para o seguinte empreendimento imobiliário. Aplique toda a sua expertise de diretor criativo + copywriter de conversão + designer premium.

DADOS DO EMPREENDIMENTO:
${projectContext}

ORIENTAÇÃO CRIATIVA:
- Escolha o posicionamento correto (luxo, premium, médio-alto, família, investimento) com base nos dados acima
- O theme deve refletir o posicionamento com cores, tipografia e estilo coerentes
- O hero.title deve ser uma headline comercial forte, específica e memorável — não o nome do empreendimento simplesmente
- hero.titleHighlight deve destacar a palavra-chave mais impactante do título (pode ser vazia se não aplicável)
- hero.subtitle deve contextualizar localização e proposta de valor com uma frase densa e persuasiva
- location.description deve valorizar a localização de forma específica, não genérica
- location.highlights devem ser pontos reais e concretos sobre a localização (ex: "A 500m do metrô Butantã", não só "Bem localizado")
- features: traduzir cada atributo em valor percebido (área, dormitórios, vagas, amenidades)
- audience: descrever perfis de comprador com especificidade — fazer o lead se reconhecer
- urgency: inserir com elegância, baseada no status real do imóvel, sem parecer spam
- benefits: focar em por que deixar o contato, não nos atributos do imóvel
- cta.title: headline final que fecha a narrativa com força e clareza
- form.subtitle: criar senso de segurança e facilidade — reduzir última objeção antes do envio
- form.thankYouMessage: mensagem calorosa, profissional e que define o próximo passo

Gere um JSON com esta estrutura EXATA:

{
  "theme": {
    "primaryColor": "cor hex de destaque principal — escolher com intenção (dourado, cobre, terracota, verde, azul noite etc)",
    "accentColor": "cor hex complementar ao primary",
    "bgColor": "cor hex do fundo — preferencialmente escuro premium",
    "textColor": "cor hex do texto principal",
    "fontFamily": "fonte Google que melhor representa o posicionamento",
    "heroStyle": "dark-overlay (padrão com imagem) ou gradient (layout editorial)"
  },
  "hero": {
    "badge": "selo contextual e específico ao status (ex: 'Últimas unidades · Lançamento 2025')",
    "title": "headline comercial forte, específica e memorável",
    "titleHighlight": "palavra-chave mais impactante do título, para destacar em cor de acento (ou string vazia)",
    "subtitle": "frase densa: contextualiza localização + proposta de valor + quem é o imóvel",
    "ctaText": "verbo de ação + benefício imediato (ex: 'Quero conhecer este imóvel')"
  },
  "location": {
    "title": "título editorial sobre a localização — não 'Localização Privilegiada'",
    "description": "parágrafo de 2-3 frases valorizando a localização com argumentos concretos e específicos",
    "highlights": ["ponto concreto 1", "ponto concreto 2", "ponto concreto 3", "ponto concreto 4"]
  },
  "features": [
    {"icon": "NomeLucide", "label": "rótulo do atributo", "value": "atributo traduzido em benefício ou valor real"},
    {"icon": "NomeLucide", "label": "rótulo", "value": "valor"},
    {"icon": "NomeLucide", "label": "rótulo", "value": "valor"},
    {"icon": "NomeLucide", "label": "rótulo", "value": "valor"},
    {"icon": "NomeLucide", "label": "rótulo", "value": "valor"},
    {"icon": "NomeLucide", "label": "rótulo", "value": "valor"}
  ],
  "audience": [
    {"title": "perfil específico 1 — fazer o lead se reconhecer", "description": "por que esse imóvel é perfeito para esse perfil"},
    {"title": "perfil específico 2", "description": "por que esse imóvel é perfeito para esse perfil"},
    {"title": "perfil específico 3", "description": "por que esse imóvel é perfeito para esse perfil"},
    {"title": "perfil específico 4", "description": "por que esse imóvel é perfeito para esse perfil"}
  ],
  "urgency": {
    "type": "urgency ou opportunity ou availability",
    "title": "título que provoca urgência legítima e elegante",
    "description": "texto persuasivo que justifica a urgência com argumento concreto, sem tom de spam",
    "highlight": "frase de impacto curta ou dado numérico (ex: '12 unidades restantes')"
  },
  "benefits": [
    {"icon": "NomeLucide", "title": "motivo concreto para deixar o contato 1", "description": "descrição de 1 frase que reduz objeção"},
    {"icon": "NomeLucide", "title": "motivo 2", "description": "descrição breve"},
    {"icon": "NomeLucide", "title": "motivo 3", "description": "descrição breve"},
    {"icon": "NomeLucide", "title": "motivo 4", "description": "descrição breve"}
  ],
  "cta": {
    "title": "headline final que fecha a narrativa com força — sem clichê",
    "subtitle": "frase que define o próximo passo e reduz última objeção",
    "buttonText": "texto de ação claro e direto"
  },
  "form": {
    "title": "título do formulário — curto e orientado ao benefício",
    "subtitle": "frase que cria segurança e define o que acontece após o envio",
    "buttonText": "texto do botão — verbo de ação",
    "thankYouTitle": "título da confirmação — caloroso e profissional",
    "thankYouMessage": "mensagem que confirma o recebimento, cria expectativa positiva e define próximo passo"
  },
  "floatingButtonText": "texto curto do botão flutuante mobile — ação + benefício",
  "footer": {
    "disclaimer": "disclaimer legal breve e profissional"
  }
}

Retorne APENAS o JSON. Sem markdown. Sem explicações. Sem comentários.`;
    }

    let jsonText = (await callAi(systemPrompt, userPrompt)).trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
    }

    const landingPageData = JSON.parse(jsonText);

    // Inject scraped images as gallery (AI doesn't select images, we pass them directly)
    const scrapedImages: string[] = project.scraped_images || [];
    if (scrapedImages.length > 0) {
      landingPageData.gallery = scrapedImages;
    }

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

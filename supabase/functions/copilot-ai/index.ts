import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, conversation_id, lead_context, messages, copilot_config } = await req.json();

    // Build system prompt based on copilot config
    const config = copilot_config || {};
    const personalityMap: Record<string, string> = {
      formal: "Seja formal, profissional e direto ao ponto.",
      consultivo: "Seja consultivo, empático e estratégico. Guie o cliente com perguntas inteligentes.",
      agressivo: "Seja persuasivo e orientado ao fechamento. Use gatilhos mentais de urgência e escassez.",
      tecnico: "Seja técnico e informativo. Apresente dados e especificações com precisão.",
      premium: "Seja sofisticado e exclusivo. Transmita luxo e exclusividade em cada palavra.",
    };

    const personality = personalityMap[config.personality] || personalityMap.consultivo;
    const emojiRule = config.allow_emojis !== false ? "Use emojis com moderação para humanizar." : "Não use emojis.";
    const persuasionLevel = config.persuasion_level || 50;

    let systemPrompt = `Você é um Copiloto de vendas imobiliárias inteligente.
${personality}
${emojiRule}
Nível de persuasão: ${persuasionLevel}/100.

REGRAS:
- Responda SEMPRE em português do Brasil
- Seja conciso (máximo 3 parágrafos)
- Foque em avançar o lead no funil de vendas
- Considere o contexto do lead e histórico de conversa
- Sugira próximos passos estratégicos
- Se o lead demonstrar objeção, trate com empatia e argumente com valor
- NUNCA invente dados sobre o empreendimento que não foram fornecidos`;

    if (lead_context) {
      systemPrompt += `\n\nCONTEXTO DO LEAD:
- Nome: ${lead_context.name || "Não informado"}
- Status no funil: ${lead_context.status || "Não informado"}
- Empreendimento: ${lead_context.project || "Não informado"}
- Origem: ${lead_context.origin || "Não informado"}
- Última interação: ${lead_context.last_interaction || "Não informado"}
- Notas: ${lead_context.notes || "Nenhuma"}`;
    }

    if (action === "suggest_response") {
      systemPrompt += `\n\nSua tarefa: Sugira UMA resposta estratégica para enviar ao lead baseado no histórico da conversa. A resposta deve ser natural, como se fosse o corretor falando diretamente com o cliente via WhatsApp.`;
    } else if (action === "analyze_risk") {
      systemPrompt += `\n\nSua tarefa: Analise o risco de perder este lead. Avalie: tempo sem interação, tom das respostas, objeções não tratadas. Responda em formato JSON com campos: risk_level (baixo/medio/alto), reason (string), suggested_action (string), suggested_message (string).`;
    } else if (action === "suggest_next_step") {
      systemPrompt += `\n\nSua tarefa: Sugira o próximo passo estratégico para este lead. Considere: avançar etapa no funil, agendar visita, enviar proposta, ou reengajar. Seja específico e acionável.`;
    }

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...(messages || []),
    ];

    if (action === "analyze_risk") {
      // Non-streaming for structured output
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: aiMessages,
          stream: false,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em instantes." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      // Track suggestion count
      if (conversation_id) {
        try { await supabase.rpc("increment_copilot_count", { _conversation_id: conversation_id }); } catch (_) { /* ignore */ }
      }

      return new Response(JSON.stringify({ suggestion: content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Streaming for suggest_response and suggest_next_step
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    // Track suggestion count
    if (conversation_id) {
      Promise.resolve(supabase.rpc("increment_copilot_count", { _conversation_id: conversation_id })).catch(() => {});
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("copilot-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

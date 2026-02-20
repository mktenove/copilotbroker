

# Mover 50 leads da campanha para "Atendimento"

## Contexto
A campanha "Acao Agenda Pessoal" do Edinardo enviou o step 1 para diversos leads, mas como a correcao no edge function foi feita depois, esses 50 leads ainda estao com status `new` (Pre Atendimento) em vez de `info_sent` (Atendimento).

## Solucao

Criar uma edge function temporaria (`fix-campaign-leads`) que:

1. Busca os leads que receberam step 1 da campanha `40f66fd1-ebae-4758-b2e9-7cb9b896d2b0` e ainda estao com status `new`
2. Atualiza cada um para `info_sent` com `status_distribuicao = atendimento_iniciado`
3. Registra uma interacao na timeline de cada lead

### Arquivo: `supabase/functions/fix-campaign-leads/index.ts`

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const campaignId = "40f66fd1-ebae-4758-b2e9-7cb9b896d2b0";
  const brokerId = "b3a4d137-028f-4816-b7d4-d2d65b1904f8";

  const { data: queueItems } = await supabase
    .from("whatsapp_message_queue")
    .select("lead_id")
    .eq("campaign_id", campaignId)
    .eq("step_number", 1)
    .eq("status", "sent");

  const leadIds = [...new Set(queueItems?.map(q => q.lead_id).filter(Boolean))];

  const { data: newLeads } = await supabase
    .from("leads")
    .select("id, name")
    .in("id", leadIds)
    .eq("status", "new");

  if (!newLeads || newLeads.length === 0) {
    return new Response(JSON.stringify({ message: "Nenhum lead para atualizar" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = new Date().toISOString();
  let updated = 0;

  for (const lead of newLeads) {
    const { error } = await supabase
      .from("leads")
      .update({
        status: "info_sent",
        status_distribuicao: "atendimento_iniciado",
        atendimento_iniciado_em: now,
        reserva_expira_em: null,
        updated_at: now,
      })
      .eq("id", lead.id);

    if (!error) {
      await supabase.from("lead_interactions").insert({
        lead_id: lead.id,
        broker_id: brokerId,
        interaction_type: "status_change",
        old_status: "new",
        new_status: "info_sent",
        notes: "Lead movido para Atendimento automaticamente (correcao campanha)",
      });
      updated++;
    }
  }

  return new Response(
    JSON.stringify({ updated, total: newLeads.length, leads: newLeads.map(l => l.name) }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
```

## Passos

1. Criar a edge function `fix-campaign-leads`
2. Fazer deploy
3. Chamar a funcao via POST para executar a correcao
4. Verificar o resultado (50 leads movidos)
5. Deletar a edge function apos uso (funcao temporaria)

## Resultado esperado

- 50 leads moverao de "Pre Atendimento" para "Atendimento" no Kanban
- Cada lead tera uma entrada na timeline registrando a mudanca
- A correcao anterior no `whatsapp-message-sender` garante que campanhas futuras ja movam automaticamente


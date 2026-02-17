

# Enriquecer Linha do Tempo - Corretor no Atendimento + Etapas da Cadencia

## Resumo

Duas melhorias principais na timeline, alem de sugestoes adicionais de enriquecimento.

## Alteracoes

### 1. Mostrar nome do corretor no "Atendimento Iniciado"

**Problema atual**: A interacao `atendimento_iniciado` registra apenas "Atendimento iniciado pelo corretor" sem informar qual corretor.

**Arquivos afetados**:

- `src/hooks/use-kanban-leads.ts` (linha ~310-316): Ao inserir a interacao, buscar o nome do corretor logado e incluir na nota.
  - De: `notes: "Atendimento iniciado pelo corretor"`
  - Para: `notes: "Atendimento iniciado por [Nome do Corretor]"`
  - Buscar o broker_id do usuario logado e preencher tambem o campo `broker_id` na interacao

- `src/pages/LeadPage.tsx` (linha ~454-460): Na funcao de iniciar atendimento inline, apos chamar `iniciarAtendimento`, a interacao ja e registrada pelo hook. Garantir que o nome do corretor aparece tambem na interacao `whatsapp_manual` que ja registra a mensagem.

- `src/components/crm/CadenciaSheet.tsx` (linha ~272-279): Quando a cadencia ativa o atendimento, incluir o nome do corretor na nota.
  - De: `notes: "Lead movido para Atendimento ao ativar Cadência 10D"`
  - Para: `notes: "Lead movido para Atendimento ao ativar Cadência 10D por [Nome do Corretor]"`

- `src/components/crm/LeadTimeline.tsx`: Na renderizacao do item `atendimento_iniciado`, exibir o nome do corretor extraido do campo `notes` com destaque visual (texto em emerald).

### 2. Mostrar cada mensagem da cadencia na timeline

**Problema atual**: Quando o `whatsapp-message-sender` envia cada etapa, ele registra como `contact_attempt` generico com nota "Mensagem enviada via WhatsApp". Nao indica qual etapa da cadencia foi enviada.

**Arquivo afetado**:

- `supabase/functions/whatsapp-message-sender/index.ts` (linhas ~507-523): Melhorar o log de envio para diferenciar mensagens de cadencia:
  - Quando `campaign_id` existir e `step_number` existir, registrar como:
    - `notes`: `"📤 Cadência 10D — Etapa {step_number} enviada\n\n{mensagem}"`
  - Quando for 1a mensagem automatica (sem campaign_id):
    - Manter o prefixo atual `"✅ 1ª mensagem automática enviada com sucesso"`

- `src/components/crm/LeadTimeline.tsx`: Detectar no texto da nota o padrao "Cadencia 10D" e exibir com visual diferenciado (icone Zap, cor emerald, badge "Cadencia").

### 3. Sugestoes adicionais de enriquecimento

Alem dos dois pontos solicitados, posso implementar no mesmo pacote:

- **Tempo relativo entre eventos**: Mostrar entre cada item da timeline o intervalo decorrido (ex: "3h depois", "2 dias depois") para dar nocao de ritmo de atendimento.
- **Agrupamento de automacoes**: Colapsar automaticamente sequencias de eventos automaticos (roleta_atribuicao + notificacao + auto-first-message) em um bloco "Automacao inicial" expansivel, reduzindo ruido visual.
- **Indicador de quem executou cada acao**: Para interacoes que possuem `created_by`, buscar o nome do usuario e exibir ao lado da data (ex: "por Joao · 15/02 14:30").

## Detalhes Tecnicos

### Alteracao no hook use-kanban-leads.ts

```text
// Linha ~295-316
const iniciarAtendimento = useCallback(async (leadId: string) => {
  const user = (await supabase.auth.getUser()).data.user;
  const { data: brokerData } = await supabase
    .from("brokers").select("id, name").eq("user_id", user?.id).single();

  // ... update lead ...

  await supabase.from("lead_interactions").insert({
    lead_id: leadId,
    interaction_type: "atendimento_iniciado",
    broker_id: brokerData?.id,
    notes: `Atendimento iniciado por ${brokerData?.name || "corretor"}`,
    created_by: user?.id,
  });
});
```

### Alteracao no whatsapp-message-sender/index.ts

```text
// Linhas ~507-523
if (queueMsg.lead_id) {
  const isAutoFirstMessage = !queueMsg.campaign_id;
  const isCadenciaStep = !!queueMsg.campaign_id && !!stepNumber;

  let notePrefix: string;
  if (isAutoFirstMessage) {
    notePrefix = "✅ 1ª mensagem automática enviada com sucesso";
  } else if (isCadenciaStep) {
    notePrefix = `📤 Cadência 10D — Etapa ${stepNumber} enviada`;
  } else {
    notePrefix = "✅ Mensagem enviada via WhatsApp";
  }

  await supabase.from("lead_interactions").insert({
    lead_id: queueMsg.lead_id,
    broker_id: instance.broker_id,
    interaction_type: "contact_attempt",
    channel: "whatsapp",
    notes: `${notePrefix}\n\n${queueMsg.message}`
  });
}
```

### Alteracao no LeadTimeline.tsx

- Detectar notas que iniciam com "📤 Cadência" e aplicar estilo especial (badge "Cadência", icone Zap, cor emerald)
- Para `atendimento_iniciado`, exibir o nome do corretor da nota com destaque
- Adicionar indicador de tempo relativo entre eventos adjacentes (intervalo > 1h)


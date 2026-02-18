

# Corrigir contagens e enriquecer historico da Fila de Envio

## Problema 1: Divergencia nas contagens

### Diagnostico

A aba **Campanhas** exibe `campaign.reply_count` direto da tabela `whatsapp_campaigns`, que e atualizado pelo webhook a cada resposta recebida. Ja a aba **Fila** conta respostas consultando a tabela `whatsapp_lead_replies` com `COUNT(*)`. Sao fontes de dados diferentes que podem divergir se o webhook falhar em atualizar uma delas.

Alem disso, os contadores de "Enviados" e "Falhas" na aba Fila sao calculados **apenas sobre as ultimas 100 mensagens** (`.limit(100)` na query), o que subestima os totais reais.

### Solucao

Unificar a fonte de verdade usando contagens diretas no banco via queries agregadas:

- **Respostas**: consultar `whatsapp_lead_replies` com `count: "exact"` (ja feito corretamente na Fila). O problema esta nas Campanhas, onde `reply_count` pode ficar dessincronizado. Nao alteraremos as campanhas, mas **na Fila** vamos buscar enviados/falhas tambem via query agregada em vez de contar sobre o `.limit(100)`.
- **Enviados/Falhas na Fila**: usar queries separadas com `count: "exact"` e `head: true` para cada status, sem limite de rows.

### Alteracoes

**`src/hooks/use-whatsapp-queue.ts`**:
- Adicionar 3 queries agregadas separadas para contar `sent`, `failed` e `queued+scheduled` usando `.select("*", { count: "exact", head: true })` filtradas por `broker_id` e `status`.
- Manter a query principal com `.limit(100)` apenas para exibicao da lista.
- Os `stats` passarao a usar esses contadores agregados em vez de filtrar o array local.

---

## Problema 2: Historico da Fila com informacoes insuficientes

### Diagnostico atual

O card de historico (`HistoryMessageCard`) exibe:
- Icone de status
- Nome do lead (truncado a 120px)
- Mensagem truncada a 40 caracteres
- Horario (apenas `HH:mm`, sem data)
- Badge de status
- Erro (somente se falhou, ao expandir)

### Melhorias propostas

Ao expandir um item do historico, exibir:

1. **Data e hora completas** do envio (ex: "15/02/2026 14:32") em vez de apenas a hora
2. **Mensagem completa** sem truncamento (ja existe ao expandir, manter)
3. **Telefone do destinatario** formatado
4. **Nome da campanha** vinculada (se houver)
5. **Etapa da sequencia** (step_number, ex: "Etapa 2 de 5")
6. **Numero de tentativas** (attempts/max_attempts)
7. **Data de agendamento original** (scheduled_at)
8. **Codigo de erro** (error_code, alem do error_message ja exibido)

### Alteracoes

**`src/hooks/use-whatsapp-queue.ts`**:
- Expandir o select da query principal para incluir `step_number`, `attempts`, `max_attempts`, `error_code`.
- Esses campos ja existem na tabela `whatsapp_message_queue`, so nao estao sendo consultados explicitamente (o `*` ja os traz, mas precisamos garantir que o tipo os reflita).

**`src/components/whatsapp/QueueTab.tsx`**:
- No `HistoryMessageCard`: alterar `format(new Date(message.sent_at), "HH:mm")` para `format(new Date(message.sent_at), "dd/MM/yyyy HH:mm")`.
- No `PendingMessageCard`: alterar tambem para incluir a data no `scheduled_at`.
- Ao expandir, adicionar uma secao de detalhes com: telefone, campanha, etapa, tentativas, agendamento original, e codigo de erro.

---

## Resumo das alteracoes por arquivo

| Arquivo | Alteracao |
|---|---|
| `src/hooks/use-whatsapp-queue.ts` | Adicionar queries agregadas para stats reais (sent/failed/queued count via head:true). Manter query principal para lista. |
| `src/components/whatsapp/QueueTab.tsx` | Datas completas (dd/MM/yyyy HH:mm). Secao expandida enriquecida com telefone, campanha, etapa, tentativas, erro detalhado. |


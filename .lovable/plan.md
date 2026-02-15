

# Reestruturar Etapas do Kanban

## Resumo das alteracoes

O Kanban passara de 4 para 5 colunas, com nomes atualizados e um botao de retroceder status (seta para a esquerda).

### Mapeamento de etapas

| Posicao | Status (banco) | Nome antigo | Nome novo |
|---------|---------------|-------------|-----------|
| 1 | `new` | Novos Leads | Pre Atendimento |
| 2 | `info_sent` | Informacoes Enviadas | Atendimento |
| 3 | `scheduling` | *(nova)* | Agendamento |
| 4 | `docs_received` | Dados Recebidos | Proposta |
| 5 | `registered` | Cadastrado no Abaco | Vendido |

### Botao de retroceder
Sera adicionado um botao com icone `ChevronLeft` ao lado do botao de avancar (`ChevronRight`) nos cards do Kanban. Ele so aparece quando o lead NAO esta na primeira etapa.

---

## Detalhes tecnicos

### 1. Migracao de banco de dados
Adicionar o valor `scheduling` ao enum `lead_status` do Postgres:
```sql
ALTER TYPE lead_status ADD VALUE 'scheduling' BEFORE 'docs_received';
```

### 2. `src/types/crm.ts`
- Atualizar o tipo `LeadStatus` para incluir `'scheduling'`
- Atualizar `STATUS_CONFIG` com os novos nomes:
  - `new` -> "Pre Atendimento"
  - `info_sent` -> "Atendimento"
  - `scheduling` -> "Agendamento" (novo, cor laranja)
  - `docs_received` -> "Proposta"
  - `registered` -> "Vendido"

### 3. `src/components/crm/KanbanBoard.tsx`
- Atualizar `STATUSES` para 5 colunas: `['new', 'info_sent', 'scheduling', 'docs_received', 'registered']`
- Atualizar `VALID_STATUSES` e `STATUS_ORDER` no `handleAdvanceStatus` e `handleDragEnd`
- Adicionar handler `handleRegressStatus` para retroceder etapa

### 4. `src/components/crm/KanbanCard.tsx`
- Atualizar `STATUS_ORDER` para incluir `scheduling`
- Atualizar `STATUS_PROGRESS` com 5 niveis (10%, 30%, 50%, 75%, 100%)
- Atualizar `PROGRESS_COLORS` com cor para `scheduling`
- Adicionar funcoes `getPrevStatus` e `getPrevStatusLabel`
- Adicionar prop `onRegressStatus` e renderizar botao `ChevronLeft` quando nao estiver na primeira etapa
- O botao aparecera a esquerda do botao de avancar, com cor amarela/laranja para diferenciar

### 5. `src/components/crm/KanbanColumn.tsx`
- Atualizar `STATUS_SQUARE_COLORS` para incluir `scheduling` (cor laranja)
- Adicionar prop `onRegressStatus` e passa-la para os `KanbanCard`

### 6. `src/components/whatsapp/NewCampaignSheet.tsx`
- Atualizar `ACTIVE_STATUSES` para incluir `scheduling`

### 7. `src/hooks/use-kanban-leads.ts`
- Nenhuma alteracao necessaria (ja trata qualquer status valido)


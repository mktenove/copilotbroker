

# Correcao do Kanban: Remover `awaiting_docs` do Fluxo de 4 Colunas

## Problema

O Kanban deve ter apenas 4 colunas (`new` -> `info_sent` -> `docs_received` -> `registered`), mas a logica de avanco de status inclui `awaiting_docs` como etapa intermediaria. Quando um lead avanca de `info_sent`, ele vai para `awaiting_docs` -- um status sem coluna visivel -- e desaparece.

Existem **4 leads presos** no status `awaiting_docs` que estao invisiveis:
- Jonathan
- Teste (x2)
- Maicon Jackson

## Solucao

### 1. Migrar leads presos (SQL)

Mover os 4 leads com status `awaiting_docs` para `info_sent` para que voltem a aparecer no Kanban.

### 2. Arquivo: `src/components/crm/KanbanBoard.tsx`

**Linha 140** - Remover `awaiting_docs` dos status validos no drag-and-drop:
```
De: ['new', 'info_sent', 'awaiting_docs', 'docs_received', 'registered', 'inactive']
Para: ['new', 'info_sent', 'docs_received', 'registered', 'inactive']
```

**Linha 203** - Remover `awaiting_docs` da ordem de avanco:
```
De: ['new', 'info_sent', 'awaiting_docs', 'docs_received', 'registered']
Para: ['new', 'info_sent', 'docs_received', 'registered']
```

### 3. Arquivo: `src/components/crm/KanbanCard.tsx`

**Linha 33** - Remover `awaiting_docs` da ordem de status no card:
```
De: ['new', 'info_sent', 'awaiting_docs', 'docs_received', 'registered']
Para: ['new', 'info_sent', 'docs_received', 'registered']
```

**Linha 60** - Remover `awaiting_docs` do mapa de progresso e ajustar percentuais para 4 etapas:
```
new: 10 -> 15
info_sent: 35 -> 40
docs_received: 80 -> 70
registered: 100 (sem mudanca)
```

**Linha 70** - Remover `awaiting_docs` do mapa de cores de progresso (manter so as 4 colunas + inactive).

### 4. Arquivo: `src/components/crm/LeadDetailSheet.tsx`

**Linhas 152-158** - O botao "Solicitar Documentos" avanca para `awaiting_docs`. Alterar para avancar para `docs_received` ou remover o avanco automatico (manter apenas como nota/interacao).

**Linhas 395 e 421** - Condicoes que verificam `lead.status === "awaiting_docs"` para exibir o checklist de documentos. Ajustar para funcionar sem esse status.

### 5. Arquivos que mantem `awaiting_docs` (sem alteracao necessaria)

- `src/types/crm.ts` - O tipo `LeadStatus` e o `STATUS_CONFIG` devem manter `awaiting_docs` pois existe como enum no banco. Nao quebra nada.
- `src/components/crm/KanbanColumn.tsx` - O `STATUS_SQUARE_COLORS` pode manter a entrada (nunca sera renderizada, mas nao causa erro).
- `src/components/admin/LeadsAdvancedFilters.tsx` e `AnalyticsDashboard.tsx` - Mantem para filtros e analytics historicos.
- `src/components/whatsapp/NewCampaignSheet.tsx` - Mantem para campanhas WhatsApp.

## Resultado Esperado

- Kanban com 4 colunas: **Novos** | **Info Enviadas** | **Dados Recebidos** | **Cadastrado**
- Avanco de status pula direto de `info_sent` para `docs_received`
- Drag-and-drop funciona corretamente entre as 4 colunas
- Os 4 leads presos voltam a aparecer
- O checklist de documentos continua funcionando na coluna `docs_received`

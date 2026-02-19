
# Corrigir botoes contextuais do Kanban na etapa Agendamento

## Problemas

1. **Apos confirmar comparecimento**: O botao continua exibindo "Comparecimento" quando deveria mudar para "Fazer Proposta", pois o proximo passo logico e registrar uma proposta.

2. **Apos confirmar nao comparecimento**: O sistema abre automaticamente o modal de reagendamento. O comportamento correto e apenas trocar o botao para "Reagendar", deixando o usuario decidir quando reagendar.

## Causa raiz

O `ACTION_CONFIG` no `KanbanCard.tsx` e um mapa estatico baseado apenas no `status` do lead. Ele nao considera o campo `comparecimento` (true/false/null) para decidir qual botao exibir na etapa `scheduling`.

## Solucao

### 1. `src/components/crm/KanbanCard.tsx`

Tornar o botao de acao dinamico para a etapa `scheduling`:

- `comparecimento === null` (sem registro ainda): exibir "Comparecimento"
- `comparecimento === true`: exibir "Fazer Proposta"
- `comparecimento === false` (nao compareceu): exibir "Reagendar"

Isso sera feito substituindo o uso estatico de `ACTION_CONFIG[lead.status]` por uma logica que verifica `lead.comparecimento` quando o status e `scheduling`.

O `handleAction` tambem sera atualizado para chamar a funcao correta:
- `comparecimento === true` -> `onOpenProposta(leadId)` (novo callback)
- `comparecimento === false` -> `onOpenReagendamento(leadId)` (novo callback)

Novos props necessarios no KanbanCard:
- `onOpenProposta?: (leadId: string) => void`
- `onOpenReagendamento?: (leadId: string) => void`

### 2. `src/components/crm/KanbanColumn.tsx`

Passar os novos props `onOpenProposta` e `onOpenReagendamento` para o `KanbanCard`.

### 3. `src/components/crm/KanbanBoard.tsx`

- **Remover** a abertura automatica do `AgendamentoModal` dentro do `onNaoCompareceu` do `ComparecimentoModal`.
- Adicionar handler `handleOpenProposta` que abre o `PropostaModal`.
- Adicionar handler `handleOpenReagendamento` que abre o `AgendamentoModal` com `isReagendamento: true`.
- Passar ambos handlers para as colunas.

## Resumo das mudancas

| Arquivo | Alteracao |
|---------|-----------|
| `KanbanCard.tsx` | Logica dinamica de botao para status `scheduling` + novos props |
| `KanbanColumn.tsx` | Repassar novos props ao KanbanCard |
| `KanbanBoard.tsx` | Novos handlers + remover auto-abertura do reagendamento |

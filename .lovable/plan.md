
# Corrigir botoes "Adicionar Lead" nas etapas do Kanban

## Problema

Os botoes "+" no cabecalho de cada coluna e o link "+ Adicionar" (quando a coluna esta vazia) no `KanbanColumn` nao possuem nenhum `onClick` — sao apenas elementos visuais sem acao.

## Solucao

Propagar um callback `onAddLead` desde as paginas (`BrokerAdmin` e `Admin`) ate o `KanbanColumn`, passando pelo `KanbanBoard`.

## Alteracoes

### 1. `src/components/crm/KanbanColumn.tsx`
- Adicionar prop `onAddLead?: () => void` na interface `KanbanColumnProps`.
- Conectar o `onClick` do botao "+" (linha 55) e do link "+ Adicionar" (linha 110) ao callback `onAddLead`.

### 2. `src/components/crm/KanbanBoard.tsx`
- Adicionar prop `onAddLead?: () => void` na interface `KanbanBoardProps`.
- Repassar `onAddLead` para cada `KanbanColumn`.

### 3. `src/pages/BrokerAdmin.tsx`
- Passar `onAddLead={() => setIsAddLeadOpen(true)}` no componente `KanbanBoard`.

### 4. `src/pages/Admin.tsx`
- Passar `onAddLead={() => setIsAddLeadOpen(true)}` no componente `KanbanBoard`.

## Resultado

Clicar no "+" de qualquer coluna ou no "+ Adicionar" de uma coluna vazia abrira o modal de adicionar lead, o mesmo que ja funciona pelo botao principal do cabecalho.

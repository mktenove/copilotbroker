

# Correcao: Proposta via Kanban nao salva e nao puxa empreendimento

## Problema identificado

Dois bugs ao criar proposta pelo botao do Kanban:

1. **Empreendimento nao pre-preenche**: O `PropostaModal` no KanbanBoard e aberto sem as props `leadProjectId`, `leadBrokerId` e `projects`, entao o campo de empreendimento fica vazio.

2. **Proposta nao aparece na pagina do Lead**: O `onConfirm` do KanbanBoard chama `registrarProposta()` do hook `use-kanban-leads`, que apenas atualiza campos no lead (`valor_proposta`, `status`) mas **nunca insere um registro na tabela `propostas`**. Por isso, na pagina do Lead (que usa `usePropostas` para buscar da tabela `propostas`), nada aparece.

## Solucao

### Arquivo: `src/components/crm/KanbanBoard.tsx`

**1. Passar dados do lead para o PropostaModal**

Alterar o estado `propostaModal` para incluir `leadProjectId`, `leadBrokerId` e passar a lista de `projects` ao componente:

```text
propostaModal: { open, leadId, leadProjectId, leadBrokerId }
```

Ao abrir o modal (via `onOpenProposta`), buscar o lead nos dados locais para extrair `project_id` e `broker_id`.

**2. Usar `criarProposta` do hook `usePropostas` em vez de `registrarProposta`**

Importar e usar `usePropostas` no KanbanBoard para que o `onConfirm` do modal chame `criarProposta()`, que:
- Insere o registro na tabela `propostas` com todas as parcelas
- Atualiza o status do lead para `docs_received`
- Registra a interacao no timeline

Como `usePropostas` precisa de um `leadId` fixo, sera instanciado com o `leadId` do modal aberto.

### Arquivo: `src/hooks/use-kanban-leads.ts`

Nenhuma alteracao necessaria neste hook. A funcao `registrarProposta` existente continua disponivel para outros usos legados, mas o fluxo do modal passara a usar `criarProposta`.

## Resultado esperado

- Ao abrir proposta pelo Kanban, o empreendimento do lead ja vem selecionado
- Ao salvar, a proposta e gravada na tabela `propostas` com parcelas
- A proposta aparece imediatamente na pagina do Lead
- O lead muda para a coluna "Proposta" no Kanban

## Detalhes tecnicos

- O `usePropostas` sera chamado condicionalmente com `propostaModal.leadId || ""` para evitar queries desnecessarias quando o modal esta fechado
- Apos o `criarProposta` retornar `true`, o estado local dos leads no Kanban sera atualizado via `setLocalLeads` para refletir o novo status `docs_received`
- A lista de `projects` ja esta disponivel no estado do KanbanBoard e sera passada diretamente ao modal

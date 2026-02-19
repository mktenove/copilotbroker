

# Remover abertura automatica do formulario de proposta apos comparecimento

## O que muda

No Kanban, ao confirmar o comparecimento do cliente, o sistema deixa de abrir automaticamente o modal de proposta. O corretor pode adicionar a proposta manualmente quando desejar, pela pagina do lead ou pelos botoes de acao do card.

## Alteracao

### `src/components/crm/KanbanBoard.tsx`

Remover a linha 551 que abre o `PropostaModal` automaticamente apos o comparecimento:

```diff
 onCompareceu={async () => {
   if (!comparecimentoModal.leadId) return;
   const success = await registrarComparecimento(comparecimentoModal.leadId);
   if (success) {
     toast.success("Comparecimento registrado!");
-    // Open proposta modal automatically
-    setPropostaModal({ open: true, leadId: comparecimentoModal.leadId });
   }
 }}
```

Nenhum outro arquivo precisa ser alterado.


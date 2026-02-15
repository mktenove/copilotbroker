
# Remover botão Atualizar do Kanban

## Contexto
O Kanban já utiliza Supabase Realtime (configurado no hook `use-kanban-leads.ts`) para atualizar os leads automaticamente. O botão "Atualizar" é redundante.

## Alterações

**Arquivo:** `src/components/crm/KanbanBoard.tsx`

1. **Remover o botão mobile "Atualizar"** (bloco com `md:hidden` no início do return, linhas ~195-204).

2. **Remover o botão desktop "Atualizar"** (ícone RefreshCw dentro do toolbar de filtros, linhas ~207-215).

3. **Limpar imports não utilizados**: remover `RefreshCw` do import de `lucide-react` (caso não seja usado em outro lugar do componente).

Nenhuma outra alteração necessária -- o Realtime já está funcionando no hook e continuará atualizando os cards automaticamente.

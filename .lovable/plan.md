

## Corrigir Cores do Filtro de Origem no Kanban

### Problema
O filtro de origem no Kanban usa tokens genericos do tema (`hover:bg-accent`, fundo padrao do Popover) que resultam em tons "quentes" inconsistentes com a paleta premium do projeto. O padrao correto usa valores hex fixos: `#0f0f12`, `#1e1e22`, `#2a2a2e`.

### O que muda

**Arquivo: `src/components/crm/KanbanBoard.tsx`**

1. **Botao trigger (linha 306)**: trocar `hover:bg-accent` por `hover:bg-[#2a2a2e]`
2. **PopoverContent (linha 321)**: adicionar `className="w-56 p-2 bg-[#1e1e22] border-[#2a2a2e]"`
3. **Labels dos checkboxes (linhas 323, 335, 348)**: trocar `hover:bg-accent` por `hover:bg-[#2a2a2e]`
4. **Texto do trigger**: garantir que use `text-slate-400 hover:text-slate-200` em vez de `text-muted-foreground hover:text-foreground`

Isso alinha o filtro de origem com o mesmo padrao visual usado nos filtros de Empreendimento, Corretor e nos filtros avancados da tabela de leads.


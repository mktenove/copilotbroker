
## Corrigir Scroll em Listas de Popovers e Dropdowns

### Problema
Varios popovers e listas no projeto nao permitem rolar quando o conteudo excede a area visivel. Isso acontece por dois motivos:

1. **ScrollArea com `max-h` em vez de `h` fixo**: O componente `ScrollArea` do Radix precisa de uma altura fixa (`h-[Xpx]`) no container para ativar a barra de rolagem. Usar `max-h` sozinho nao funciona com o Radix ScrollArea.
2. **Uso de `overflow-y-auto` nativo sem restricao de altura efetiva**: Alguns popovers usam `overflow-y-auto` diretamente no `PopoverContent`, mas o popover nao tem restricao de altura que force o overflow.

### Locais afetados e correcoes

**1. KanbanBoard.tsx -- Filtro de Origem (linha 322)**
- Atual: `<div className="flex flex-col gap-1 max-h-64 overflow-y-auto">`
- Corrigir: Envolver com `<ScrollArea className="h-[256px]">` e remover `max-h-64 overflow-y-auto` do div interno

**2. NewCampaignSheet.tsx -- Filtro de Origem (linha 376)**
- Atual: `<ScrollArea className="max-h-48">`
- Corrigir: Trocar para `<ScrollArea className="h-[192px]">` (equivalente a max-h-48 = 12rem = 192px)

**3. LeadsAdvancedFilters.tsx -- Filtro de Origem (linha 226)**
- Atual: `<PopoverContent className="w-[240px] p-2 max-h-[300px] overflow-y-auto">`
- Corrigir: Remover `max-h-[300px] overflow-y-auto` do PopoverContent, envolver o conteudo interno com `<ScrollArea className="h-[280px]">`

**4. LeadsAdvancedFilters.tsx -- Filtro de Status (linha 159)**
- Atual: `<PopoverContent className="w-[220px] p-2">` sem scroll
- Nao critico (apenas 5 opcoes), mas adicionar scroll preventivo: `<ScrollArea className="max-h-[250px]">` por consistencia

### Resumo das alteracoes

| Arquivo | Local | Problema | Correcao |
|---------|-------|----------|----------|
| KanbanBoard.tsx | Filtro origem (L322) | `max-h + overflow-y-auto` nativo | ScrollArea com `h-[256px]` |
| NewCampaignSheet.tsx | Filtro origem (L376) | ScrollArea com `max-h-48` | ScrollArea com `h-[192px]` |
| LeadsAdvancedFilters.tsx | Filtro origem (L226) | `overflow-y-auto` no PopoverContent | ScrollArea com `h-[280px]` dentro |
| LeadsAdvancedFilters.tsx | Filtro status (L159) | Sem scroll (5 itens ok) | Sem alteracao |

### Detalhes tecnicos

- Importar `ScrollArea` nos arquivos que ainda nao o importam (KanbanBoard.tsx, LeadsAdvancedFilters.tsx)
- O componente `ScrollArea` do Radix funciona renderizando um viewport interno; ele precisa de uma altura definida (nao max-height) para calcular se o conteudo excede a area e mostrar o thumb da scrollbar
- Os `SelectContent` do Radix ja tem scroll nativo embutido, entao nao precisam de correcao

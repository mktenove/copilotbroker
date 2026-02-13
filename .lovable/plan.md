

## Filtro de Origem Multi-Select no Kanban

### O que muda
O filtro de origem atual permite selecionar apenas uma origem por vez. Sera transformado em um multi-select usando Popover + Checkboxes, permitindo filtrar por varias origens simultaneamente (ex: "Meta Ads" + "Google Ads" + "Indicacao").

### Como vai funcionar
- Clicar no filtro abre um popover com checkboxes para cada origem
- O usuario pode marcar/desmarcar varias origens
- O texto do botao mostra "Todas origens" quando nenhum filtro esta ativo, ou "2 origens" / "3 origens" quando ha selecao
- Inclui opcao "Sem origem" para leads sem origem atribuida
- Botao "Limpar" para resetar a selecao

### Detalhes tecnicos

**Arquivo: `src/components/crm/KanbanBoard.tsx`**

1. Trocar o estado de `selectedOrigin: string` para `selectedOrigins: string[]` (array vazio = todas)
2. Substituir o componente `Select` por `Popover` + lista de `Checkbox` items
3. Atualizar a logica de `matchesOrigin`:
   - Array vazio = mostra tudo (equivalente ao "all" anterior)
   - Array com "sem_origem" = inclui leads sem origem
   - Array com valores especificos = filtra por `lead.lead_origin` estar no array
4. Importar `Popover`, `PopoverTrigger`, `PopoverContent` e `Checkbox`
5. Funcao toggle para adicionar/remover origens do array
6. Label do trigger mostra contagem quando ha selecao ativa


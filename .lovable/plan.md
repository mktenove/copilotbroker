

## Adicionar Filtro por Origem no Kanban

### O que muda
Um novo seletor de filtro "Origem" sera adicionado na barra de ferramentas do Kanban, seguindo o mesmo padrao visual dos filtros de Empreendimento e Corretor ja existentes. O usuario podera filtrar os leads por qualquer origem (pre-definida ou personalizada).

### Detalhes tecnicos

**Arquivo: `src/components/crm/KanbanBoard.tsx`**

1. Importar o hook `useCustomOrigins` e as constantes `LEAD_ORIGINS` e `getOriginDisplayLabel` de `@/types/crm`
2. Importar o icone `MapPin` (ou `Target`) do lucide-react
3. Adicionar estado `selectedOrigin` (string, default `"all"`)
4. Construir a lista de opcoes do filtro combinando:
   - Origens pre-definidas de `LEAD_ORIGINS` (excluindo "outro")
   - Origens customizadas vindas de `useCustomOrigins()`
   - Origens dinamicas (do analytics/UTM) encontradas nos leads carregados mas que nao estao nas duas listas anteriores
5. Adicionar um novo `Select` na toolbar, posicionado entre o filtro de Empreendimento e o filtro de Corretor, com icone e estilo identicos
6. Atualizar a logica de `filteredLeads` para incluir a condicao `matchesOrigin`:
   - `"all"` mostra tudo
   - `"sem_origem"` mostra leads com `lead_origin` nulo
   - Qualquer outro valor compara com `lead.lead_origin`

Nenhuma alteracao no banco de dados. Apenas filtragem local dos leads ja carregados.

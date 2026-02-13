

## Seletor Avancado de Leads para Campanhas

### Problema atual
O formulario de criacao de campanha permite apenas filtrar por status e empreendimento, mostrando somente um numero ("12 leads"). O corretor nao ve quem sao esses leads, nao pode desmarcar nenhum, e nao tem filtros adicionais como origem ou corretor.

### Nova experiencia

O fluxo de selecao de leads sera dividido em 2 etapas visuais dentro do mesmo Sheet:

**Etapa 1 - Filtros (barra superior colapsavel)**
- Status (multi-select com checkboxes, como hoje)
- Empreendimento (select)
- Origem (multi-select com checkboxes, reaproveitando o padrao do Kanban)
- Corretor (select, visivel apenas para admin)

**Etapa 2 - Lista de leads com selecao individual**
- Tabela/lista compacta mostrando: nome, whatsapp, empreendimento, origem, status
- Checkbox "Selecionar todos" no header
- Checkbox individual em cada lead para marcar/desmarcar
- Contador em tempo real: "23 de 45 leads selecionados"
- ScrollArea com altura limitada (~300px) para nao estourar o sheet
- Busca rapida por nome/telefone dentro dos leads filtrados

### Detalhes tecnicos

**Arquivo: `src/components/whatsapp/NewCampaignSheet.tsx`**

1. Adicionar estados:
   - `selectedOrigins: string[]` (filtro de origem)
   - `brokerId: string` (filtro de corretor, admin only)
   - `searchQuery: string` (busca local na lista)
   - `fetchedLeads: CRMLead[]` (leads retornados pelos filtros)
   - `excludedLeadIds: Set<string>` (leads desmarcados manualmente)

2. Substituir o `fetchLeadsByStatus` atual por uma busca mais completa que tambem filtra por origem e corretor (novo metodo no hook ou filtragem local)

3. Renderizar a lista de leads dentro de um `ScrollArea` com checkboxes individuais

4. O contador de leads passa a refletir `fetchedLeads.length - excludedLeadIds.size`

5. Importar `useCustomOrigins`, `LEAD_ORIGINS`, `getOriginDisplayLabel` e `ScrollArea`

**Arquivo: `src/hooks/use-whatsapp-campaigns.ts`**

6. Expandir `fetchLeadsByStatus` para aceitar filtros opcionais de origem (`origins?: string[]`) e aplicar `.in("lead_origin", origins)` quando fornecido

7. Expandir `CreateCampaignData` para aceitar `excludedLeadIds?: string[]` e filtrar esses leads antes de enfileirar mensagens

**Fluxo de dados**

Os filtros (status, projeto, origem, corretor) disparam uma busca no banco. Os resultados populam a lista visual. O usuario pode desmarcar leads individuais. Ao clicar "Iniciar Campanha", apenas os leads nao excluidos sao enfileirados.

### UI / Layout no Sheet

```text
+------------------------------------+
| Nova Campanha                      |
+------------------------------------+
| Nome: [___________________]        |
|                                    |
| -- FILTROS --                      |
| Status:  [x]Novos [x]Info Enviada  |
| Empreen: [Todos            v]      |
| Origem:  [Todas origens    v]      |
| Corretor:[Todos            v] admin|
|                                    |
| -- LEADS SELECIONADOS --           |
| [Buscar por nome/telefone___]      |
| 23 de 45 selecionados  [Todos][x] |
| +--------------------------------+ |
| | [x] Joao Silva  (51)9999 Meta  | |
| | [x] Maria Santos (51)8888 Goo  | |
| | [ ] Pedro Lima   (51)7777 Ind  | |
| | ...scroll...                   | |
| +--------------------------------+ |
|                                    |
| 23 leads x 2 etapas = 46 msgs     |
|                                    |
| -- SEQUENCIA DE MENSAGENS --       |
| (etapas como hoje)                 |
+------------------------------------+
| [Cancelar]  [Iniciar Campanha]     |
+------------------------------------+
```

### O que NAO muda
- Sequencia de mensagens (steps) permanece identica
- Logica de opt-out, formatacao de telefone e intervalos aleatorios nao mudam
- Templates e preview continuam funcionando igual
- Nenhuma alteracao no banco de dados


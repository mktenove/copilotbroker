
# Dashboard de Inteligencia Comercial

## Visao Geral

Substituir o componente `AnalyticsDashboard` atual (844 linhas, aba unica) por um modulo completo com 7 abas, filtros globais e metricas avancadas calculadas a partir dos dados ja existentes no banco (`leads`, `lead_interactions`, `roletas_log`, `propostas`, `page_views`, `brokers`, `roletas`, `roletas_membros`).

Todos os campos necessarios ja existem no banco de dados. Nenhuma migracao de schema e necessaria.

## Estrutura de Arquivos

Criar um diretorio dedicado `src/components/admin/intelligence/` com os seguintes arquivos:

```text
src/components/admin/intelligence/
  IntelligenceDashboard.tsx       -- Container principal com filtros globais e abas
  filters/GlobalFilters.tsx       -- Filtros: periodo, empreendimento, roleta, corretor, origem, campanha
  tabs/OverviewTab.tsx            -- Aba 1: KPIs executivos + graficos diarios
  tabs/CorretoresTab.tsx          -- Aba 2: Ranking e score de performance
  tabs/RoletasTab.tsx             -- Aba 3: Saude e equilibrio das roletas
  tabs/FunilTab.tsx               -- Aba 4: Funil visual com gargalos
  tabs/LandingPagesTab.tsx        -- Aba 5: Performance por origem/landing
  tabs/SLATab.tsx                 -- Aba 6: Disciplina e heatmap de atendimento
  tabs/PerdasTab.tsx              -- Aba 7: Analise de perdas
  hooks/useIntelligenceData.ts    -- Hook centralizado para fetch e calculo de metricas
  utils/calculations.ts           -- Funcoes puras de calculo (score, SLA, taxas)
  components/MetricCard.tsx       -- Card reutilizavel de metrica com variacao
  components/HealthIndicator.tsx  -- Indicador verde/amarelo/vermelho
```

## Detalhamento Tecnico

### Hook Central: `useIntelligenceData`

Recebe os filtros globais (periodo, projeto, roleta, corretor, origem, campanha) e faz queries paralelas:

1. `leads` -- com joins para broker e project, filtrado por periodo/projeto
2. `lead_interactions` -- para calculos de tempo entre etapas
3. `roletas_log` -- para contagem de timeouts e fallbacks
4. `roletas` + `roletas_membros` -- para analise de roletas
5. `propostas` -- para VGV e ticket medio
6. `page_views` -- para dados de landing pages
7. `brokers` -- lista de corretores ativos

Retorna dados pre-processados para cada aba, evitando recalculos.

Para comparacao com periodo anterior: faz uma segunda query com o periodo equivalente anterior (ex: se 30 dias, busca 60-31 dias atras) e calcula a variacao percentual.

### Aba 1 -- Overview Executivo

**KPIs em cards (2 linhas de 6):**
- Total de Leads | Leads distribuidos por roleta | Leads em fallback
- Tempo medio primeiro atendimento | % dentro do SLA (< 10min)
- Propostas enviadas | Vendas | Taxa conversao | VGV total | Ticket medio | Leads perdidos | Taxa de perda

Cada card mostra valor atual + variacao vs periodo anterior (seta verde/vermelha + %).

**Graficos:**
- Linha: Leads por dia + Vendas por dia (eixo duplo)
- Barras: VGV por dia

**Calculos:**
- Tempo primeiro atendimento = `atendimento_iniciado_em - atribuido_em` (quando ambos existem)
- VGV = soma de `valor_final_venda` dos leads com `data_fechamento`
- Ticket medio = VGV / numero de vendas
- Taxa conversao = vendas / leads distribuidos
- Fallback = leads com `motivo_atribuicao` contendo "fallback"
- SLA = % de leads onde tempo primeiro atendimento < `roleta.tempo_reserva_minutos`

### Aba 2 -- Performance por Corretor

**Tabela-ranking com colunas:**
Corretor | Leads | Tempo medio 1o atend. | % SLA | Timeouts | % perda por timeout | Agendamentos | Propostas | Vendas | Conversao | VGV | Ticket medio | Tempo medio ate venda | Score

**Score de Performance (0-100):**
```
score = (
  30 * clamp(1 - tempoResposta/60, 0, 1) +   // 30% tempo resposta (ideal < 10min)
  30 * taxaConversao +                          // 30% conversao
  20 * clamp(1 - timeoutRate, 0, 1) +           // 20% disciplina
  20 * min(vgv / metaVGV, 1)                    // 20% VGV vs meta (meta default = media do time)
)
```

**Grafico:** Barras agrupadas mostrando evolucao mensal dos top 5 corretores (leads vs vendas).

**Dados de timeout por corretor:** query em `roletas_log` onde `acao = 'timeout_reassinado'` agrupado por `de_corretor_id`.

### Aba 3 -- Analise de Roletas

Para cada roleta:
- Leads distribuidos (contagem em `roletas_log` onde `acao = 'atribuicao_inicial'`)
- Media tempo atendimento
- % timeout (timeouts / total distribuidos)
- Fallbacks para lider
- Conversao e VGV por membro

**Indicador de saude:**
- Verde: timeout < 10%, atendimento medio < 10min
- Amarelo: timeout 10-25% ou atendimento 10-30min
- Vermelho: timeout > 25% ou atendimento > 30min

**Grafico:** Barras comparativas mostrando distribuicao de leads entre membros (equilibrio).

### Aba 4 -- Funil Completo

**Funil visual horizontal/vertical:**
Pre Atendimento -> Atendimento -> Agendamento -> Proposta -> Vendido

Para cada etapa:
- N de leads atualmente naquela etapa
- Conversao etapa-a-etapa (% que avanca)
- Tempo medio na etapa (calculado via `lead_interactions` timestamps de mudanca de status)
- Taxa de abandono (% que sai para inativo naquela etapa)

**Destaque de gargalo:** A transicao com maior queda percentual recebe um badge vermelho "Gargalo".

### Aba 5 -- Landing Pages

Para cada `lead_origin` (agrupado):
- Leads gerados
- % SLA cumprido
- Taxa agendamento, proposta, venda
- VGV gerado

**Tabela cruzada:** Origem X Corretor mostrando quem converte melhor cada canal.

Nota: campos de custo (CPL, ROI) nao existem no banco atualmente. Serao exibidos como "--" com tooltip explicando que o campo sera implementado futuramente.

### Aba 6 -- SLA e Disciplina

**Distribuicao de tempo ate atendimento:**
Barras empilhadas: 0-2min | 2-5min | 5-10min | +10min

**Heatmap:** Matriz dia da semana (seg-dom) x hora (8h-22h) mostrando volume de leads recebidos, colorido por % de SLA cumprido naquele slot.

**Ranking de disciplina:** Corretores ordenados por menor taxa de timeout.

### Aba 7 -- Analise de Perdas

- Total de leads perdidos (status = 'inactive')
- Taxa de perda por etapa (`etapa_perda`)
- Motivo de perda (`inactivation_reason`) em ranking
- Perdas por corretor, por origem, por empreendimento

**Grafico:** Pizza para distribuicao por motivo + Barras para perdas por etapa.

## Filtros Globais

Barra fixa no topo do dashboard com:

| Filtro | Componente | Dados |
|--------|-----------|-------|
| Periodo | Select com presets + DateRangePicker para personalizado | hoje, 7d, 30d (padrao), 60d, 90d, personalizado |
| Empreendimento | Select multi | tabela `projects` |
| Roleta | Select | tabela `roletas` |
| Corretor | Select | tabela `brokers` |
| Origem | Select multi | valores distintos de `lead_origin` |
| Campanha | Select | valores distintos de `lead_origin_detail` |

Os filtros sao passados ao hook `useIntelligenceData` que refaz as queries.

## Integracao com Admin.tsx

- Substituir a importacao de `AnalyticsDashboard` por `IntelligenceDashboard`
- Renomear o item na sidebar de "Analytics" para "Inteligencia" com icone `Brain` (lucide)
- O arquivo original `AnalyticsDashboard.tsx` sera mantido mas nao mais referenciado

## Permissao

O dashboard ja esta dentro da rota `/admin` que so e acessivel por admins. Para leaders, eles acessam via `/corretor/admin` -- sera necessario adicionar a aba "Inteligencia" tambem no `BrokerAdmin.tsx` condicionada a `isLeader === true`.

## Performance

- Todas as queries usam filtro de periodo (`gte`/`lte` em `created_at`)
- Queries sao executadas em paralelo via `Promise.all`
- Dados sao memorizados com `useMemo` para evitar recalculos
- Limite de 1000 rows por query do Supabase: para tabelas grandes (leads, interactions), paginar ou usar `.limit()` adequado
- Indices recomendados (migracao opcional futura): `created_at`, `project_id`, `broker_id`, `roleta_id`, `lead_origin`

## Visual

- Manter o tema dark atual (`bg-[#0f0f12]`, `bg-[#1e1e22]`, `border-[#2a2a2e]`)
- Cor de destaque: `#FFFF00` (amarelo Enove)
- Abas via componente `Tabs` do shadcn/ui
- Cards com cantos arredondados, sombras sutis
- Graficos via Recharts (ja instalado)
- Layout responsivo: 1 coluna no mobile, grid no desktop

## Resumo de Arquivos

| Acao | Arquivo |
|------|---------|
| Criar | `src/components/admin/intelligence/IntelligenceDashboard.tsx` |
| Criar | `src/components/admin/intelligence/filters/GlobalFilters.tsx` |
| Criar | `src/components/admin/intelligence/tabs/OverviewTab.tsx` |
| Criar | `src/components/admin/intelligence/tabs/CorretoresTab.tsx` |
| Criar | `src/components/admin/intelligence/tabs/RoletasTab.tsx` |
| Criar | `src/components/admin/intelligence/tabs/FunilTab.tsx` |
| Criar | `src/components/admin/intelligence/tabs/LandingPagesTab.tsx` |
| Criar | `src/components/admin/intelligence/tabs/SLATab.tsx` |
| Criar | `src/components/admin/intelligence/tabs/PerdasTab.tsx` |
| Criar | `src/components/admin/intelligence/hooks/useIntelligenceData.ts` |
| Criar | `src/components/admin/intelligence/utils/calculations.ts` |
| Criar | `src/components/admin/intelligence/components/MetricCard.tsx` |
| Criar | `src/components/admin/intelligence/components/HealthIndicator.tsx` |
| Editar | `src/pages/Admin.tsx` -- trocar import de AnalyticsDashboard para IntelligenceDashboard |
| Editar | `src/components/admin/AdminSidebar.tsx` -- renomear "Analytics" para "Inteligencia", icone Brain |
| Editar | `src/components/admin/MobileBottomNav.tsx` -- atualizar label/icone |

Nota: Devido ao volume de codigo (~15 arquivos novos), a implementacao sera feita em etapas dentro da mesma execucao, priorizando o hook de dados, os filtros globais, e as abas na ordem 1-7.

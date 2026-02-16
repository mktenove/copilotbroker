

# Reformulacao do Dashboard de Inteligencia Comercial

## Problema Atual
- 12 KPI cards amontoados em grid 6 colunas, sem hierarquia visual
- Graficos "Leads por Dia" e "VGV por Dia" removidos (nao fazem sentido no negocio)
- Tabela de corretores e muito densa, sem destaque visual
- Falta contexto nos numeros (o que e bom? o que precisa atencao?)
- Nao ha "alertas" ou insights automaticos para tomada de decisao

## Melhorias Propostas

### 1. Overview -- Reorganizar com hierarquia visual clara

**Secao "Resultado" (destaque principal):** 3 cards grandes em linha
- Vendas (quantidade + variacao)
- VGV Total (valor + variacao)
- Conversao Geral (% + variacao)

**Secao "Pipeline" (cards medios):** 4 cards
- Total de Leads | Distribuidos | Em Atendimento | Propostas Ativas

**Secao "Saude Operacional" (cards menores):** 4 cards
- Tempo medio 1o Atendimento | % SLA | Fallbacks | Taxa de Perda

**Secao "Alertas Estrategicos" (novo):** Cards condicionais que so aparecem quando ha problemas:
- Alerta se SLA < 70%
- Alerta se taxa de perda > 30%
- Alerta se algum corretor tem 0 vendas no periodo
- Alerta se alguma roleta esta "vermelha"

**Secao "Top Performers" (novo):** Mini ranking horizontal dos 3 melhores corretores por score, e os 3 com mais oportunidades de melhoria.

Remover completamente: graficos "Leads & Vendas por Dia" e "VGV por Dia".

### 2. Corretores -- Cards individuais ao inves de tabela densa

Substituir a tabela unica por **cards individuais** para cada corretor:
- Score em destaque (badge grande colorido)
- Barra de progresso visual para SLA
- Micro-metricas organizadas em 2 colunas
- Indicador visual de tendencia (seta para cima/baixo)
- Manter opcao de "ver como tabela" via toggle para quem preferir

### 3. Funil -- Adicionar tempos medios entre etapas

- Calcular tempo medio entre etapas usando timestamps de `lead_interactions`
- Exibir entre cada barra do funil: "Tempo medio: X dias"
- Melhorar o visual do badge de gargalo

### 4. Overview: Substituir graficos removidos por mini-funil horizontal

No lugar dos graficos diarios, colocar um **mini-funil horizontal** mostrando a conversao resumida: Leads -> Atendimento -> Agendamento -> Proposta -> Venda, com as taxas de conversao entre cada etapa.

### 5. Melhorias visuais gerais

- Adicionar secao de titulo em cada grupo de cards ("Resultado", "Pipeline", "Saude")
- Usar separadores sutis entre secoes
- MetricCard: adicionar indicador de cor de fundo sutil (verde para bom, vermelho para atencao)
- Aumentar contraste nos numeros principais

## Detalhamento Tecnico

### Arquivos a editar:

**`src/components/admin/intelligence/tabs/OverviewTab.tsx`** -- Reescrever completamente:
- Remover graficos LineChart e BarChart
- Criar 3 secoes hierarquicas de KPIs com titulos
- Adicionar secao de Alertas Estrategicos (condicional)
- Adicionar mini ranking de Top Performers
- Adicionar mini-funil horizontal resumido

**`src/components/admin/intelligence/hooks/useIntelligenceData.ts`** -- Adicionar dados:
- Novos campos em `OverviewData`: `leadsInProgress` (em atendimento), `activeProposals` (propostas ativas sem fechamento), `alerts` (lista de alertas estrategicos), `topPerformers` e `needsAttention` (arrays de nomes/scores dos corretores)
- Calcular alertas: SLA < 70%, perda > 30%, corretores com 0 vendas, roletas vermelhas

**`src/components/admin/intelligence/tabs/CorretoresTab.tsx`** -- Adicionar toggle tabela/cards:
- Manter tabela como esta (modo compacto)
- Adicionar modo "cards" como visualizacao padrao
- Cada card com score em destaque, barra de SLA, mini metricas

**`src/components/admin/intelligence/components/MetricCard.tsx`** -- Suportar tamanhos:
- Adicionar prop `size?: "sm" | "md" | "lg"` para hierarquia visual
- Size "lg": texto 3xl, padding maior, fundo com borda de cor
- Size "md": texto 2xl (atual)
- Size "sm": texto lg, mais compacto

**`src/components/admin/intelligence/components/AlertCard.tsx`** -- Novo componente:
- Card de alerta com icone, titulo, descricao e severidade
- Cor de fundo baseada em severidade (amarelo para warning, vermelho para critical)

### Dados necessarios (todos ja disponiveis no hook):
- `leadsInProgress`: leads com status `info_sent` ou `awaiting_docs`
- `activeProposals`: propostas sem `data_fechamento` e sem `data_perda`
- Alertas: calculados comparando metricas ja existentes com thresholds fixos
- Top performers: ja ordenados por score no `brokerPerformance`

### Sem alteracao de banco de dados
Todos os dados necessarios ja existem. Nenhuma migracao e necessaria.


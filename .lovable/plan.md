
# Aba "Conexao Global" com Painel de Saude e Estatisticas

## Objetivo

Transformar a aba "Conexao Global" de uma simples tela de status/QR Code em um painel completo de saude da instancia, incluindo metricas de mensagens enviadas, taxa de sucesso, historico diario e erros recentes.

## Fonte de Dados

A instancia global envia notificacoes de novos leads via a funcao `notify-new-lead`, que registra cada envio na tabela `lead_interactions` com:
- `interaction_type = 'notification'`
- `channel = 'whatsapp'`
- `notes` contendo "Notificacao enviada" (sucesso) ou "Falha" / "Erro" (falha)

Hoje existem 14 registros reais (9 sucessos, 5 falhas). Usaremos esses dados para construir as metricas.

## Mudancas

### 1. Novo hook: `src/hooks/use-global-whatsapp-stats.ts`

Hook dedicado que consulta `lead_interactions` filtrando por `channel = 'whatsapp'` e `interaction_type = 'notification'`, e agrega:

- **Totais gerais**: total enviados com sucesso, total com falha, total geral
- **Estatisticas diarias (ultimos 7 dias)**: agrupadas por `DATE(created_at)` para alimentar o grafico
- **Erros recentes**: ultimos 5 registros com falha, para exibir no painel de logs

Usa `@tanstack/react-query` para cache e atualizacao automatica.

### 2. Redesenho do componente: `src/components/whatsapp/GlobalConnectionTab.tsx`

Layout expandido com 3 secoes quando a instancia esta conectada:

```text
+--------------------------------------------------+
| Cards de Metricas (grid 3 ou 4 colunas)          |
| [Total Enviadas] [Sucesso] [Falhas] [Taxa %]    |
+--------------------------------------------------+

+------------------------+-------------------------+
| Status da Conexao      | Score de Saude           |
| (card existente)       | (circulo + barra)        |
| - ConnectionStatusCard | - Score baseado na taxa  |
| - Numero / Verificacao |   de sucesso             |
| - Botoes de acao       | - Progresso visual       |
+------------------------+-------------------------+

+------------------------+-------------------------+
| Grafico 7 Dias         | Erros Recentes           |
| (BarChart com          | (Lista dos ultimos       |
|  enviados vs falhas)   |  5 erros com data)       |
+------------------------+-------------------------+
```

**Cards de Metricas (topo)**:
- Total de notificacoes enviadas (todas)
- Enviadas com sucesso
- Falhas
- Taxa de sucesso (%)

**Score de Saude**:
- Calculado como `(sucessos / total) * 100`
- Faixas: >= 80 Excelente (verde), >= 60 Bom (emerald), >= 40 Regular (amarelo), < 40 Critico (vermelho)
- Visual circular similar ao `HealthScoreCard` existente

**Grafico de Barras (7 dias)**:
- Reutiliza o estilo visual do `DailyStatsChart` ja existente no projeto
- Barras verdes (sucesso) e vermelhas (falhas) por dia

**Erros Recentes**:
- Lista dos ultimos 5 envios com falha
- Mostra o lead associado, a mensagem de erro e ha quanto tempo ocorreu

Quando a instancia NAO esta conectada ou precisa de QR Code, o layout atual e mantido (QR Code + status card).

### 3. Sem mudancas no banco de dados

Todos os dados necessarios ja existem na tabela `lead_interactions`. Nao e necessario criar tabelas, colunas ou migracoes.

### 4. Sem mudancas nas Edge Functions

A funcao `notify-new-lead` ja registra sucesso e falha corretamente. Nenhuma alteracao necessaria.

## Detalhes Tecnicos

### Hook `use-global-whatsapp-stats.ts`

```typescript
// Consulta lead_interactions com filtros:
// - channel = 'whatsapp'
// - interaction_type = 'notification'
// Retorna:
// - totals: { total, sent, failed, successRate }
// - dailyStats: Array<{ date, sent, failed }>
// - recentErrors: Array<{ id, notes, created_at, lead_name }>
```

A query de estatisticas diarias usa `created_at >= 7 dias atras` e agrupa por data no frontend (pois a funcao `.select()` do Supabase nao suporta `GROUP BY` diretamente).

### Calculo do Score de Saude

```typescript
const successRate = totals.total > 0 
  ? Math.round((totals.sent / totals.total) * 100) 
  : 100; // Se nao tem envios, assume 100
```

### Paleta Visual

Segue a paleta neutra fria ja padronizada:
- Cards: `bg-[#1a1a1d] border-[#2a2a2e]`
- Fundo profundo: `#0f0f12`
- Textos: `text-white`, `text-slate-400`, `text-slate-500`

## Resultado Esperado

- A aba "Conexao Global" se torna um painel completo de monitoramento
- O admin visualiza de imediato quantas notificacoes foram enviadas e a taxa de sucesso
- Erros recentes ficam visiveis para diagnostico rapido
- O grafico mostra a tendencia dos ultimos 7 dias
- A funcionalidade de conexao (QR Code, reiniciar, desconectar, limpar sessao) permanece intacta

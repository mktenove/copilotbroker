
# Filtrar corretores sem equipe do sistema de Inteligencia

## Contexto

Atualmente, o Dashboard de Inteligencia Comercial considera **todos os corretores ativos** ao calcular metricas de performance, rankings e alertas. Corretores sem equipe vinculada (sem participacao em nenhuma roleta) usam o CRM esporadicamente e distorcem os dados.

## Solucao

Filtrar os corretores para considerar apenas aqueles que sao membros ativos de pelo menos uma roleta. Isso afeta o calculo de `brokerPerformance` e, consequentemente, todas as metricas derivadas (overview alerts, top performers, needs attention, perdas por corretor, etc.).

## Alteracao

### Arquivo: `src/components/admin/intelligence/hooks/useIntelligenceData.ts`

No bloco `brokerPerformance` (useMemo, linha ~229), antes de iterar sobre `brokers`, criar um Set com os IDs dos corretores que tem pelo menos uma membresa ativa em `roletasMembros`, e filtrar a lista de brokers:

```typescript
// Dentro do useMemo de brokerPerformance
const brokerIdsWithTeam = new Set(
  roletasMembros
    .filter((m: any) => m.ativo)
    .map((m: any) => m.corretor_id)
);
const activeBrokers = brokers.filter((b: any) => brokerIdsWithTeam.has(b.id));

return activeBrokers.map((b: any) => {
  // ... resto do calculo existente
```

Essa unica alteracao propaga automaticamente para:
- Overview: alertas de "corretores sem vendas" so contam corretores com equipe
- Top Performers e Needs Attention: so consideram corretores com equipe
- Perdas por corretor: so aparecem corretores com equipe

Nenhum outro arquivo precisa ser alterado.

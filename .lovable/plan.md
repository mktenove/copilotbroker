
# Mover Aquecimento acima das Regras Anti-Spam

## O que sera feito

Reordenar os blocos na aba Seguranca para que a secao "Aquecimento" fique imediatamente acima de "Regras Anti-Spam Ativas", em vez de ficar logo abaixo do grid de limites.

## Nova ordem dos blocos

1. Grid Limites (3/4) + Emergencia (1/4)
2. DailyStatsChart
3. OptoutsList
4. ErrorLogsCard
5. **Aquecimento** (movido para ca)
6. Regras Anti-Spam Ativas

## Arquivo a modificar

| Arquivo | Acao |
|---------|------|
| `src/components/whatsapp/SecurityTab.tsx` | Mover o bloco Warmup (linhas 128-149) para depois do ErrorLogsCard (linha 158) e antes do card de Regras (linha 160) |

## Detalhe tecnico

Apenas reordenacao de blocos JSX, sem alteracao de conteudo ou estilo.

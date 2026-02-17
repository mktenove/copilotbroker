

# Reorganizar topo da aba Seguranca

## O que sera feito

Mover a secao de Limites de Envio (sliders + horario) para o topo da pagina, ocupando 3/4 da largura, e colocar o Botao de Emergencia no 1/4 restante ao lado. O card do Kill Switch atual sera removido e substituido por uma versao compacta que ocupa apenas a coluna direita.

## Nova estrutura do topo

```text
+---------------------------------------------+---------------+
|  Limites de Envio (3/4)                      | Emergencia    |
|  - Slider limite por hora                    | (1/4)         |
|  - Slider limite por dia                     |               |
|  - Horario de envio (inicio/fim)             | [Botao]       |
|  - Botao Salvar                              |               |
+---------------------------------------------+---------------+
```

- Desktop: `grid grid-cols-4 gap-4` -- limites em `col-span-3`, emergencia em `col-span-1`
- Mobile: stack vertical normal (grid-cols-1)

## O que muda na ordem dos blocos

1. **Topo**: Grid com Limites (3/4) + Kill Switch (1/4)
2. Aquecimento (warmup card -- mantido como esta)
3. DailyStatsChart
4. OptoutsList
5. ErrorLogsCard
6. Regras Anti-Spam

## Arquivo a modificar

| Arquivo | Acao |
|---------|------|
| `src/components/whatsapp/SecurityTab.tsx` | Reorganizar blocos: mover limites para cima, criar grid 3/4 + 1/4 com kill switch |

## Detalhes tecnicos

- Wrapper do topo: `div` com `grid grid-cols-1 lg:grid-cols-4 gap-4`
- Coluna limites: `div className="lg:col-span-3"` contendo o Card de Limites de Envio atual (sem alteracoes internas)
- Coluna emergencia: `div className="lg:col-span-1"` contendo o Card do Kill Switch, ajustado para layout vertical compacto (botao ocupa largura total, texto menor)
- O restante da pagina permanece inalterado na ordem: warmup, chart, optouts, errors, regras


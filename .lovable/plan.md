

# Redesign Aba Seguranca - Layout 1 Coluna

## Visao geral

Redesign completo da aba Seguranca em layout vertical de coluna unica, com secoes bem separadas por divisores finos, seguindo uma hierarquia visual de cima para baixo: status, controles, monitoramento, regras, opt-outs.

## Nova estrutura (coluna unica, top-down)

### 1. Status Header (mantido)
Barra compacta com indicador pulsante + warmup + kill switch -- igual ao atual, funciona bem.

### 2. Controles de Limites
Sliders lado a lado (hora e dia na mesma linha usando flex) para economizar espaco vertical. Horario de envio na linha seguinte. Botao salvar alinhado a direita, compacto.

### 3. Grafico de 7 dias
DailyStatsChart em largura total -- ocupa melhor o espaco em 1 coluna.

### 4. Erros recentes
ErrorLogsCard em largura total logo abaixo.

### 5. Regras ativas (pills)
Mantido como esta -- ja funciona bem em 1 coluna.

### 6. Opt-outs (collapsible)
Mantido no final.

## Diferencas visuais em relacao ao layout anterior

- Remover o `grid grid-cols-1 lg:grid-cols-2` -- tudo em stack vertical simples
- Sliders de hora e dia lado a lado em `flex gap-6` para compactar a area de controles
- Botao salvar alinhado a direita (`flex justify-end`) em vez de largura total
- Grafico e erros ocupam 100% da largura, ficam mais legíveis

## Arquivo a modificar

| Arquivo | Acao |
|---------|------|
| `src/components/whatsapp/SecurityTab.tsx` | Refazer layout para 1 coluna com sliders inline |

## Detalhes tecnicos

- Substituir `grid grid-cols-1 lg:grid-cols-2 gap-6` por `space-y-6` simples
- Sliders hora/dia: `div className="flex gap-6"` com dois `div className="flex-1 space-y-3"` lado a lado
- Botao salvar: `div className="flex justify-end"` + `Button` sem `w-full`
- DailyStatsChart e ErrorLogsCard sem wrapper, direto no fluxo vertical
- Manter todo o restante (status header, pills, collapsible opt-outs) inalterado


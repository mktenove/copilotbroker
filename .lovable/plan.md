
# Redesign Completo - Aba Seguranca (1 coluna, Opt-outs visiveis)

## Visao geral

Reescrever o SecurityTab com um layout de coluna unica organizado em secoes claras separadas por titulos discretos, com todas as informacoes visiveis sem necessidade de clicar -- incluindo os Opt-outs sempre abertos.

## Estrutura final (de cima para baixo)

### 1. Status Bar
Barra compacta horizontal com:
- Indicador pulsante verde/vermelho + "Protegido" ou "Pausado"
- Warmup inline (Dia X/14)
- Botao Kill Switch discreto a direita

### 2. Secao "Controles"
Label "Limites de envio" em `text-sm font-medium text-slate-300`, seguido de:
- Sliders hora/dia lado a lado (`flex gap-6`)
- Horario de envio com inputs de time
- Botao "Salvar" alinhado a direita
- Tudo separado por bordas finas `border-[#2a2a2e]`

### 3. Secao "Regras anti-spam"
Linha de pills/badges horizontais com as regras ativas -- visual discreto em slate

### 4. Secao "Estatisticas"
DailyStatsChart em largura total

### 5. Secao "Erros recentes"
ErrorLogsCard em largura total

### 6. Secao "Opt-outs" (SEMPRE VISIVEL)
OptoutsList renderizado diretamente, sem collapsible, sem necessidade de clicar para abrir. Aparece como secao natural do fluxo.

## Mudancas em relacao ao layout atual

| Antes | Depois |
|-------|--------|
| Opt-outs escondido em Collapsible | Opt-outs sempre visivel como secao propria |
| Regras ativas ficam abaixo do monitoramento | Regras ativas sobem para logo depois dos controles |
| Collapsible + ChevronDown import | Removidos (nao necessarios mais) |

## Arquivo a modificar

| Arquivo | Acao |
|---------|------|
| `src/components/whatsapp/SecurityTab.tsx` | Reescrever layout completo |

## Detalhes tecnicos

- Remover imports de `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger`, `ChevronDown`
- Remover estado `optoutsOpen`
- Reordenar secoes: Status > Controles > Regras > Grafico > Erros > Opt-outs
- OptoutsList renderizado diretamente: `<OptoutsList />` sem wrapper collapsible
- Manter toda a logica de estado (sliders, save, kill switch) inalterada
- Manter sub-componentes (DailyStatsChart, ErrorLogsCard, OptoutsList) sem modificacao

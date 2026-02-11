
# Reduzir espaco entre secoes da pagina inicial

## Problema
Todas as 6 secoes da pagina Home usam `py-20 sm:py-28` (80px / 112px de padding vertical), criando espacos excessivos entre elas, especialmente em mobile.

## Solucao
Reduzir o padding vertical de todas as secoes para `py-12 sm:py-16` (48px / 64px), mantendo a hierarquia visual mas com um layout mais compacto e fluido.

## Alteracoes

| Arquivo | De | Para |
|---------|-----|------|
| `src/components/home/HomeHero.tsx` | `py-20 sm:py-28` | `py-12 sm:py-20` |
| `src/components/home/HomePositioning.tsx` | `py-20 sm:py-28` | `py-12 sm:py-16` |
| `src/components/home/HomeDifferentials.tsx` | `py-20 sm:py-28` | `py-12 sm:py-16` |
| `src/components/home/HomeProcess.tsx` | `py-20 sm:py-28` | `py-12 sm:py-16` |
| `src/components/home/HomePartnership.tsx` | `py-20 sm:py-28` | `py-12 sm:py-16` |
| `src/components/home/HomeCTA.tsx` | `py-20 sm:py-28` | `py-12 sm:py-16` |

Tambem reduzir o `mb-10` dos `divider-gold` para `mb-6` nas secoes HomePositioning, HomeDifferentials, HomeProcess, HomePartnership e HomeCTA, pois o separador dourado adiciona espaco extra no topo de cada secao.

Totalizando, o espaco entre secoes passara de ~224px para ~128px, eliminando o vazio visual mostrado nas capturas.

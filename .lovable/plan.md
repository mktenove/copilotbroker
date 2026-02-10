

# Correcoes na Pagina Teaser Estancia Velha

## Problemas Identificados

1. **Frase duplicada**: Na linha 107-110, "Nao fique de fora" aparece duas vezes com markup quebrado -- uma vez como texto direto e outra dentro das aspas decorativas.
2. **Espacamento excessivo**: `space-y-10` (2.5rem entre cada secao) + `mt-16` (4rem antes do formulario) + `py-12 md:py-20` no main criam gaps muito grandes, fazendo o formulario ficar "escondido" abaixo da dobra.

## Alteracoes

### 1. `src/pages/EstanciaVelhaTeaser.tsx`

- **Corrigir a frase duplicada** (linhas 107-110): Manter apenas uma instancia com as aspas decorativas corretas
- **Reduzir espacamentos**:
  - `space-y-10` para `space-y-6` (entre elementos do hero)
  - `mt-16` para `mt-10` (antes do formulario)
  - `py-12 md:py-20` para `py-8 md:py-12` (padding do main)

### 2. `src/pages/EstanciaVelhaBrokerTeaser.tsx`

- Aplicar as mesmas reducoes de espacamento para manter consistencia visual
- A frase neste arquivo ja esta correta (sem duplicacao)

## Resultado Esperado

- Frase "Nao fique de fora." aparece uma unica vez com aspas douradas
- Formulario fica visivel mais rapidamente na tela, sem necessidade de scroll excessivo
- Layout mais compacto e coeso, mantendo a elegancia premium


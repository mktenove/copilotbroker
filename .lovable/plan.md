
# Alterar cor da frase "Esses ja foram vendidos"

## O que sera feito

No arquivo `src/components/goldenview/GVUrgencySection.tsx`, a frase "Esses ja foram vendidos." atualmente usa a cor `text-destructive` (vermelho) com fundo `bg-destructive/10` e borda `border-destructive/30`.

Sera alterada para usar a paleta dourada (gold/primary), mantendo coerencia com o restante da landing page.

## Alteracao

| Arquivo | De | Para |
|---------|-----|------|
| `src/components/goldenview/GVUrgencySection.tsx` | `bg-destructive/10 border-destructive/30` | `bg-primary/10 border-primary/30` |
| (mesmo arquivo) | `text-destructive` no texto | `text-primary` |

Apenas 1 arquivo alterado, 3 classes substituidas.

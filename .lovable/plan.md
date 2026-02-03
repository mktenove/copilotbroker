
# Plano: Remover Travessões do Texto da Landing Page Mauricio Cardoso

## Problema Identificado

Os travessões (—) são um padrão muito comum em textos gerados por IA e denunciam a origem artificial do conteúdo. Encontrei travessões nos seguintes arquivos:

| Arquivo | Linha | Texto com Travessão |
|---------|-------|---------------------|
| `MCTargetSection.tsx` | 54 | "que escolhem com critério — e não por impulso" |
| `MCApartmentsSection.tsx` | 81 | "do casal contemporâneo à família que busca conforto" (sem travessão, ok) |

## Solução

Substituir o travessão por construção mais natural e humana.

### Arquivo: `MCTargetSection.tsx`

**Antes (linha 54):**
```tsx
que escolhem com critério — e não por impulso.
```

**Depois:**
```tsx
que escolhem com critério, nunca por impulso.
```

## Mudança Única

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/components/mauriciocardoso/MCTargetSection.tsx` | Modificar | Remover travessão da frase final |

## Observação

Fiz uma varredura completa em todos os componentes da landing page:
- `MCLocationSection.tsx` - sem travessões ✓
- `MCConceptSection.tsx` - sem travessões ✓  
- `MCApartmentsSection.tsx` - sem travessões ✓
- `MCWellnessSection.tsx` - sem travessões ✓
- `MCInvestmentSection.tsx` - sem travessões ✓
- `MCBenefitsSection.tsx` - sem travessões ✓
- `MCFormSection.tsx` - sem travessões ✓
- `MCFooter.tsx` - sem travessões ✓
- `MCTargetSection.tsx` - **1 travessão encontrado** (linha 54)

A alteração é simples e direta: apenas remover o travessão da seção "Para Quem".

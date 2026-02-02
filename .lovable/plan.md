
# Plano: Correção Definitiva de Contraste - Mauricio Cardoso

## Diagnóstico do Problema

A página está sendo renderizada em **dark mode** do sistema, e as variáveis CSS no dark mode estão configuradas assim:

| Variável | Valor Dark Mode | Resultado |
|----------|-----------------|-----------|
| `--mc-cream` | `40 20% 8%` | Fundo quase preto (8% luminosidade) |
| `--mc-stone` | `40 15% 15%` | Fundo escuro (15% luminosidade) |
| `--mc-charcoal` | `30 15% 12%` | Texto escuro (12% luminosidade) |
| `--mc-forest` | `158 55% 15%` | Texto verde escuro (15% luminosidade) |
| `--mc-earth` | `30 15% 75%` | Texto claro (75% luminosidade) - OK |

**Resultado**: Texto escuro (`mc-charcoal`, `mc-forest`) sobre fundo escuro (`mc-cream`, `mc-stone`) = ilegível!

## Solução: Forçar Light Mode na Landing Page

A melhor solução é **forçar a landing page Mauricio Cardoso a usar light mode**, ignorando a preferência do sistema. Isso garante que as cores sejam sempre as definidas no `:root` (light mode).

### Benefícios desta abordagem:
1. Mantém a identidade visual "Botanical Luxury" com fundos claros
2. Garante contraste consistente em todos os dispositivos
3. Não requer duplicar todas as classes de cor com variantes dark

## Arquivos a Modificar

### 1. `src/pages/mauriciocardoso/MauricioCardosoLandingPage.tsx`
- Adicionar classe `light` no container principal para forçar light mode
- Usar atributo `data-theme="light"` como fallback

**Antes:**
```tsx
<div className="min-h-screen bg-[hsl(var(--mc-cream))]">
```

**Depois:**
```tsx
<div className="min-h-screen bg-[hsl(var(--mc-cream))] light" data-theme="light">
```

### 2. `src/index.css`
- Adicionar seletores que forçam as cores light quando a classe `.light` está presente
- Criar regra específica para garantir que `.light` sobrescreva o dark mode

**Adicionar regra CSS:**
```css
/* Force light mode for Mauricio Cardoso landing page */
.light,
[data-theme="light"] {
  --mc-sage: 152 45% 32%;
  --mc-sage-light: 148 35% 45%;
  --mc-sage-dark: 155 50% 22%;
  --mc-stone: 40 20% 94%;
  --mc-earth: 30 25% 25%;
  --mc-cream: 45 15% 98%;
  --mc-forest: 158 55% 15%;
  --mc-charcoal: 30 15% 12%;
}
```

### 3. `src/pages/mauriciocardoso/TermosMauricioCardoso.tsx`
- Aplicar a mesma solução para a página de termos

### 4. `src/pages/mauriciocardoso/MauricioCardosoBrokerLandingPage.tsx`
- Aplicar a mesma solução para a versão broker da landing page

## Verificação de Contraste

Após a correção, as combinações de cor serão:

| Elemento | Fundo | Texto | Contraste |
|----------|-------|-------|-----------|
| Títulos | `--mc-cream` (98% lum) | `--mc-charcoal` (12% lum) | Excelente ✓ |
| Labels | `--mc-cream` (98% lum) | `--mc-forest` (15% lum) | Bom ✓ |
| Corpo | `--mc-stone` (94% lum) | `--mc-earth` (25% lum) | Bom ✓ |
| Itálicos | `--mc-cream` (98% lum) | `--mc-forest` (15% lum) | Bom ✓ |

## Resultado Esperado

1. **MCLocationSection**: Título "O Endereço Fala Por Si" visível em charcoal sobre cream
2. **MCTargetSection**: Lista de critérios legível em charcoal sobre cream
3. **MCInvestmentSection**: Stats (20%, 71x, INCC) visíveis em forest sobre stone
4. **MCBenefitsSection**: Todo texto legível com bom contraste

## Ordem de Implementação

1. Atualizar `src/index.css` com regra `.light`
2. Atualizar `MauricioCardosoLandingPage.tsx`
3. Atualizar `MauricioCardosoBrokerLandingPage.tsx`
4. Atualizar `TermosMauricioCardoso.tsx`

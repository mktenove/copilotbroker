

# Reestruturar Mauricio Cardoso com identidade visual e fluxo comercial do GoldenView

## Resumo

Transformar a landing page do Mauricio Cardoso para usar a mesma identidade visual do GoldenView (tema escuro luxo com dourado, animacoes de scroll, classes utilitarias como `card-luxury`, `btn-primary`, `text-gold-gradient`, `floating-cta`) e a mesma ordem comercial de secoes, mantendo todo o conteudo textual e informacoes do MC.

## Mudanca visual principal

A pagina atualmente usa um tema claro botanico (fundo creme, verde floresta, tons terrosos). Sera convertida para o tema escuro do GoldenView:
- Fundo escuro (`bg-background text-foreground` no dark mode)
- Acentos dourados (`text-gold-gradient`, `text-primary`, `btn-primary`)
- Cards com `card-luxury` (vidro fosco com borda dourada no hover)
- CTA flutuante com `floating-cta` dourado
- Todas as secoes com IntersectionObserver para animacoes de entrada

## Ordem das secoes (igual GoldenView)

1. **MCHeader** - Adaptar para tema escuro (fundo transparente → charcoal com blur)
2. **MCHeroSection** - Manter imagem do predio, trocar overlay verde por overlay preto, usar `text-gold-gradient` no destaque, `btn-primary` dourado
3. **MCPartnersSection** (renomear MCLocationSection) - Credenciais do endereco como cards animados estilo GVPartnersSection
4. **MCFeaturesSection** (nova) - Unificar Conceito + Apartamentos + Wellness como diferenciais com icones, imagem da piscina, estilo GVFeaturesSection
5. **MCTargetSection** - Transformar criterios em cards com icones estilo GVTargetAudienceSection
6. **MCUrgencySection** (nova) - Alert de urgencia + prioridades estilo GVUrgencySection
7. **MCBenefitsSection** - Cards com check icons estilo GVBenefitsSection
8. **MCCallToActionSection** (nova) - CTA final com pills + quote + botao, estilo GVCallToActionSection, incluindo dados de investimento (20%, 71x, Dez/2031)
9. **MCFormSection** - Converter para tema escuro com `card-luxury`, inputs com borda dourada
10. **MCFooter** - Manter estrutura, adaptar para `bg-card border-t border-border`
11. **MCFloatingCTA** - Usar classe `floating-cta` dourada + botao scroll-to-top

## Detalhes tecnicos

### Remocao do tema light forcado
- Na pagina `MauricioCardosoLandingPage.tsx`, remover `data-theme="light"` e classe `light`
- Usar `className="min-h-screen bg-background text-foreground"` (igual GV)
- Remover `bg-[hsl(var(--mc-*))]` de todos os componentes, usar tokens do tema escuro (`bg-background`, `bg-card`, `text-foreground`, `text-primary`, `text-muted-foreground`)

### Componentes a criar (3)
- `MCFeaturesSection.tsx` - Diferenciais unificados (conceito + aptos + wellness) com IntersectionObserver
- `MCUrgencySection.tsx` - Secao de urgencia com alert e grid de prioridades
- `MCCallToActionSection.tsx` - CTA final com pills de features e dados de investimento

### Componentes a editar (8)
- `MCHeader.tsx` - Trocar paleta MC por tokens do tema (charcoal/backdrop-blur, text-foreground, btn-primary)
- `MCHeroSection.tsx` - Overlay escuro, text-gold-gradient, btn-primary
- `MCLocationSection.tsx` - Renomear para MCPartnersSection, adicionar IntersectionObserver, cards com card-luxury
- `MCTargetSection.tsx` - Cards com icones e card-luxury, IntersectionObserver
- `MCBenefitsSection.tsx` - Grid de cards com icones e IntersectionObserver
- `MCFormSection.tsx` - card-luxury, inputs com estilo do GV, btn-primary
- `MCFloatingCTA.tsx` - Usar floating-cta + scroll-to-top
- `MCFooter.tsx` - bg-card, border-border, divider-gold

### Componentes que serao removidos como separados
- `MCConceptSection.tsx` (conteudo migra para MCFeaturesSection)
- `MCApartmentsSection.tsx` (conteudo migra para MCFeaturesSection)
- `MCWellnessSection.tsx` (conteudo migra para MCFeaturesSection)
- `MCInvestmentSection.tsx` (conteudo migra para MCCallToActionSection)

### Arquivos de pagina a editar
- `MauricioCardosoLandingPage.tsx` - Nova ordem de secoes, remover tema light
- `MauricioCardosoBrokerLandingPage.tsx` - Mesma nova ordem de secoes
- `mauriciocardoso/index.ts` - Atualizar exports

### O que NAO muda
- Todo o conteudo textual do Mauricio Cardoso
- SEO (meta tags, schemas, canonical URLs, pixel, clarity)
- Logica de formulario e submissao de leads
- Fluxo /obrigado
- Logica de broker na pagina broker
- Imagem do predio (hero) e imagem da piscina (features)




# Plano: Atualizar URLs para Domínio Personalizado

## Objetivo

Atualizar todas as referências de `onovocondominio.lovable.app` para `onovocondominio.com.br` em todo o projeto, garantindo que o SEO seja consolidado no domínio principal.

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `public/sitemap.xml` | Atualizar todas as URLs para `.com.br` |
| `public/robots.txt` | Atualizar URL do sitemap |
| `index.html` | Atualizar canonical, og:url, twitter:url e schemas |
| `src/pages/mauriciocardoso/MauricioCardosoLandingPage.tsx` | Atualizar canonical, og:url, schemas |
| `src/pages/goldenview/GoldenViewLandingPage.tsx` | Atualizar canonical, og:url, schemas |
| `src/pages/EstanciaVelha.tsx` | Atualizar canonical, og:url, schemas |

## Detalhes das Mudanças

### 1. `public/sitemap.xml`
```xml
<!-- De -->
<loc>https://onovocondominio.lovable.app/portao/goldenview</loc>
<!-- Para -->
<loc>https://onovocondominio.com.br/portao/goldenview</loc>
```

### 2. `public/robots.txt`
```text
Sitemap: https://onovocondominio.com.br/sitemap.xml
```

### 3. `index.html`
- Canonical URL
- og:url e og:image
- twitter:url e twitter:image
- JSON-LD schema URL

### 4. Landing Pages (MauricioCardoso, GoldenView, EstanciaVelha)
- `canonicalUrl` variable
- `ogImageUrl` variable
- Todos os JSON-LD schemas (Residence, FAQ, Breadcrumb)

## Resultado Esperado

- Google indexará apenas o domínio `.com.br`
- Sem duplicação de conteúdo entre domínios
- Social sharing exibirá URLs corretas
- Rich snippets apontarão para o domínio principal


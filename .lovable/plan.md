
# Análise de SEO e Plano de Melhorias para Altíssima Relevância no Google

## Análise Atual por Página

### 1. GoldenView (`/portao/goldenview`) - Nota: 8.5/10

**Pontos Fortes:**
- Meta tags completos (title, description, keywords)
- Open Graph e Twitter Cards implementados
- JSON-LD Schema estruturado (RealEstateAgent)
- Canonical URL definida
- Imagem OG dedicada (`goldenview-og.jpg`)
- Skip-to-content para acessibilidade
- Tag `robots` otimizada

**Pontos a Melhorar:**
- Schema JSON-LD pode ser mais rico (usar `Residence` em vez de `RealEstateAgent`)
- Falta `geo` coordinates no schema
- Não tem FAQ Schema (oportunidade de rich snippets)
- H1 é genérico ("O LANÇAMENTO QUE PORTÃO ESPERAVA")
- Imagens internas sem atributos `alt` otimizados

---

### 2. Mauricio Cardoso (`/novohamburgo/mauriciocardoso`) - Nota: 5.5/10

**Pontos Fortes:**
- Title e description bem escritos
- JSON-LD básico (RealEstateListing)
- Canonical URL presente

**Pontos Críticos a Corrigir:**
- **Canonical URL incorreta**: usa `onovocondominio.com.br` (domínio errado!)
- Falta meta `keywords`
- Falta meta `robots`
- Falta Open Graph `og:image`
- Falta Open Graph `og:url`
- Falta Twitter Cards completos
- Falta meta `name="title"`
- JSON-LD muito básico (sem telefone, sem geo, sem amenities)
- Falta skip-to-content para acessibilidade
- H2 usado como título principal em vez de H1 em algumas seções

---

### 3. Estância Velha (`/estanciavelha`) - Nota: 8/10

**Pontos Fortes:**
- Meta tags bem completos
- Open Graph e Twitter Cards
- JSON-LD Schema (RealEstateAgent)
- Canonical URL correta
- Skip-to-content implementado
- Imagens com `alt` descritivos
- Semantic HTML com `aria-labelledby`

**Pontos a Melhorar:**
- JSON-LD pode incluir mais detalhes (amenidades, preços)
- Não tem FAQ Schema
- Falta breadcrumb schema

---

## Problemas Gerais Identificados

| Problema | Impacto SEO | Páginas Afetadas |
|----------|-------------|------------------|
| Canonical URL errada | **CRÍTICO** | Mauricio Cardoso |
| Falta og:image | Alto | Mauricio Cardoso |
| Schema JSON-LD básico | Médio | Todas |
| Sem FAQ Schema | Médio | Todas |
| Sem Breadcrumb Schema | Baixo | Todas |
| Headers `<h2>` antes de `<h1>` em seções | Médio | Mauricio Cardoso |
| Falta GeoCoordinates | Médio | Todas |
| Imagens sem width/height | Baixo (CLS) | GoldenView |

---

## Plano de Melhorias

### 1. Correção Crítica: Mauricio Cardoso SEO Completo

**Arquivo:** `src/pages/mauriciocardoso/MauricioCardosoLandingPage.tsx`

Adicionar todas as meta tags ausentes:

```tsx
const canonicalUrl = "https://onovocondominio.lovable.app/novohamburgo/mauriciocardoso";
const ogImageUrl = "https://onovocondominio.lovable.app/mauriciocardoso-og.jpg";

<Helmet>
  {/* Primary Meta Tags */}
  <title>Mauricio Cardoso | Apartamentos de Alto Padrão em Novo Hamburgo</title>
  <meta name="title" content="Mauricio Cardoso | Apartamentos de Alto Padrão em Novo Hamburgo" />
  <meta name="description" content="Empreendimento residencial na Rua Maurício Cardoso, o endereço mais icônico de Novo Hamburgo. Apartamentos de 95 a 125m², 2 e 3 dormitórios. 1.800m² de lazer e wellness." />
  <meta name="keywords" content="apartamentos Novo Hamburgo, Rua Maurício Cardoso, alto padrão Novo Hamburgo RS, apartamentos 3 dormitórios, wellness residencial, lançamento imobiliário 2026" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href={canonicalUrl} />

  {/* Open Graph */}
  <meta property="og:type" content="website" />
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:site_name" content="Enove Imobiliária" />
  <meta property="og:title" content="Mauricio Cardoso | Alto Padrão em Novo Hamburgo" />
  <meta property="og:description" content="Na Rua Maurício Cardoso, o endereço mais icônico de Novo Hamburgo, surge um empreendimento que redefine o morar contemporâneo." />
  <meta property="og:locale" content="pt_BR" />
  <meta property="og:image" content={ogImageUrl} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="Mauricio Cardoso - Apartamentos de alto padrão em Novo Hamburgo" />

  {/* Twitter */}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content={canonicalUrl} />
  <meta name="twitter:title" content="Mauricio Cardoso | Alto Padrão em Novo Hamburgo" />
  <meta name="twitter:description" content="Apartamentos de 95 a 125m² na Rua Maurício Cardoso." />
  <meta name="twitter:image" content={ogImageUrl} />
</Helmet>
```

---

### 2. Enriquecer JSON-LD Schema (Todas as Páginas)

Usar schemas mais específicos com dados estruturados ricos:

**Exemplo para GoldenView:**

```json
{
  "@context": "https://schema.org",
  "@type": "Residence",
  "@id": "https://onovocondominio.lovable.app/portao/goldenview#residence",
  "name": "GoldenView Residencial",
  "description": "Condomínio fechado de alto padrão em Portão - RS com vista panorâmica",
  "url": "https://onovocondominio.lovable.app/portao/goldenview",
  "image": "https://onovocondominio.lovable.app/goldenview-og.jpg",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Portão",
    "addressRegion": "RS",
    "addressCountry": "BR",
    "postalCode": "93180-000"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "-29.5489",
    "longitude": "-51.1639"
  },
  "amenityFeature": [
    { "@type": "LocationFeatureSpecification", "name": "Vista panorâmica", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Segurança 24h", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Piscina", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Clube", "value": true }
  ],
  "numberOfRooms": "Lotes de 300m² a 600m²",
  "petsAllowed": true,
  "tourBookingPage": "https://onovocondominio.lovable.app/portao/goldenview#cadastro"
}
```

---

### 3. Adicionar FAQ Schema (Rich Snippets)

Adicionar perguntas frequentes que aparecem nos resultados do Google:

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Qual o tamanho dos lotes no GoldenView?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Os lotes variam de 300m² a 600m², todos com vista panorâmica."
      }
    },
    {
      "@type": "Question",
      "name": "O condomínio tem segurança 24h?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sim, o GoldenView conta com portaria 24h e sistema de segurança completo."
      }
    }
  ]
}
```

---

### 4. Adicionar BreadcrumbList Schema

Para melhor navegação nos resultados:

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Início", "item": "https://onovocondominio.lovable.app" },
    { "@type": "ListItem", "position": 2, "name": "Portão", "item": "https://onovocondominio.lovable.app/portao" },
    { "@type": "ListItem", "position": 3, "name": "GoldenView", "item": "https://onovocondominio.lovable.app/portao/goldenview" }
  ]
}
```

---

### 5. Melhorar Acessibilidade e Semântica HTML

**Mauricio Cardoso - Hero Section:**
- Adicionar `aria-labelledby` na section
- Garantir hierarquia correta de headings

**Todas as páginas:**
- Adicionar `role="main"` em `<main>`
- Usar `<article>` para conteúdo principal
- Garantir `alt` descritivos em todas imagens

---

## Arquivos a Modificar

| Arquivo | Prioridade | Mudanças |
|---------|------------|----------|
| `src/pages/mauriciocardoso/MauricioCardosoLandingPage.tsx` | **CRÍTICA** | Corrigir canonical, adicionar OG/Twitter, enriquecer schema |
| `src/pages/goldenview/GoldenViewLandingPage.tsx` | Alta | Enriquecer schema (Residence, FAQ, Breadcrumb, Geo) |
| `src/pages/EstanciaVelha.tsx` | Alta | Adicionar FAQ schema, Breadcrumb, enriquecer dados |
| `src/components/mauriciocardoso/MCHeroSection.tsx` | Média | Adicionar acessibilidade (aria-labelledby) |

---

## Checklist de SEO Técnico

| Item | GoldenView | Mauricio Cardoso | Estância Velha |
|------|------------|------------------|----------------|
| Title otimizado | ✅ | ✅ | ✅ |
| Meta description | ✅ | ✅ | ✅ |
| Meta keywords | ✅ | ❌ → Adicionar | ✅ |
| Canonical URL | ✅ | ❌ → Corrigir | ✅ |
| OG:image | ✅ | ❌ → Adicionar | ✅ |
| Twitter Cards | ✅ | ❌ → Adicionar | ✅ |
| JSON-LD rico | 🟡 → Melhorar | ❌ → Adicionar | 🟡 → Melhorar |
| FAQ Schema | ❌ → Adicionar | ❌ → Adicionar | ❌ → Adicionar |
| Breadcrumb Schema | ❌ → Adicionar | ❌ → Adicionar | ❌ → Adicionar |
| Geo Coordinates | ❌ → Adicionar | ❌ → Adicionar | ❌ → Adicionar |
| Skip-to-content | ✅ | ❌ → Adicionar | ✅ |

---

## Resultado Esperado

1. **Mauricio Cardoso**: Indexação correta com canonical URL corrigida
2. **Rich Snippets**: FAQs aparecendo nos resultados de busca
3. **Knowledge Graph**: Informações completas sobre localização e amenidades
4. **Breadcrumbs**: Navegação visível nos resultados do Google
5. **Social Sharing**: Previews corretos no WhatsApp, Facebook, LinkedIn


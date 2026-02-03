

# Plano: Corrigir OG Tags e Atualizar Texto de Estância Velha

## Diagnóstico do Problema

As tags `og:image:width` e `og:image:height` **já existem** nos arquivos React. O problema é que:

1. O React Helmet injeta as tags dinamicamente via JavaScript
2. Crawlers como Facebook/WhatsApp podem não executar JavaScript completamente
3. As tags no `index.html` (fallback estático) podem estar sendo lidas em vez das dinâmicas

## Solução

### 1. Garantir Fallback Estático no index.html

O `index.html` já tem tags OG genéricas que são sobrescritas pelo React Helmet. Precisamos verificar se estão corretas.

### 2. Atualizar Texto do Estância Velha

| Tag | Texto Atual | Novo Texto |
|-----|-------------|------------|
| **og:title** | `Novo Condomínio em Estância Velha \| Lançamento 2025` | **Manter** |
| **og:description** | `Cadastre-se para acesso antecipado ao maior lançamento imobiliário de Estância Velha...` | `O novo condomínio de Estância Velha. Terrenos em Condomínio Fechado. Abaco Incorporadora.` |
| **twitter:description** | `Cadastre-se para acesso antecipado. 350 lotes exclusivos a partir de 500m².` | `O novo condomínio de Estância Velha. Terrenos em Condomínio Fechado. Abaco Incorporadora.` |

### 3. Verificar Imagem OG

A imagem `mauriciocardoso-og.jpg` foi criada mas precisa ser **publicada** para que o Facebook/WhatsApp possam acessá-la via HTTPS.

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/EstanciaVelha.tsx` | Atualizar `og:description` e `twitter:description` |

## Passos Pós-Implementação

Após publicar as alterações:

1. Acesse o [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
2. Cole a URL: `https://onovocondominio.com.br/novohamburgo/mauriciocardoso`
3. Clique em "Fetch new information" para limpar o cache
4. Repita para as outras páginas


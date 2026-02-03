
# Plano: Criar Sitemap para Indexação no Google

## Objetivo

Criar um arquivo `sitemap.xml` no diretório `public/` para indexar as páginas dos empreendimentos no Google, excluindo:
- Página raiz (`/`)
- Páginas de corretores (`/:brokerSlug`)
- Páginas administrativas (`/admin`, `/corretor/*`, `/auth`)

## URLs a Indexar

| Empreendimento | URL | Prioridade |
|----------------|-----|------------|
| GoldenView | `/portao/goldenview` | 1.0 |
| Mauricio Cardoso | `/novohamburgo/mauriciocardoso` | 1.0 |
| Estância Velha | `/estanciavelha` | 1.0 |

## Arquivo a Criar

### `public/sitemap.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://onovocondominio.lovable.app/portao/goldenview</loc>
    <lastmod>2026-02-03</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://onovocondominio.lovable.app/novohamburgo/mauriciocardoso</loc>
    <lastmod>2026-02-03</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://onovocondominio.lovable.app/estanciavelha</loc>
    <lastmod>2026-02-03</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

## Atualizar `robots.txt`

Adicionar referência ao sitemap no arquivo `robots.txt`:

```text
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

User-agent: *
Allow: /

Sitemap: https://onovocondominio.lovable.app/sitemap.xml
```

## Arquivos a Modificar

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `public/sitemap.xml` | Criar | Sitemap com URLs dos empreendimentos |
| `public/robots.txt` | Modificar | Adicionar referência ao sitemap |

## Considerações Técnicas

- **Domínio**: Usar `onovocondominio.lovable.app` (Published URL)
- **lastmod**: Data atual (será atualizado manualmente quando houver mudanças)
- **changefreq**: `weekly` - páginas de empreendimentos são atualizadas regularmente
- **priority**: `1.0` - máxima prioridade pois são as páginas principais

## Resultado Esperado

1. Google conseguirá descobrir todas as páginas de empreendimentos
2. Páginas de corretores e admin não serão indexadas
3. Melhor posicionamento nos resultados de busca



# Auditoria SEO das Landing Pages - Problemas e Melhorias

## Problemas Identificados

### 1. SPA sem Pre-rendering (CRITICO)
O problema principal: o site e uma Single Page Application (SPA) em React. Quando o Google acessa `onovocondominio.com.br/estanciavelha`, ele recebe o `index.html` generico com o titulo "Enove Imobiliaria | Condominios de Alto Padrao no RS" e a descricao generica. Os meta tags especificos de cada pagina so sao injetados pelo React Helmet **apos** o JavaScript executar no navegador.

Embora o Googlebot consiga renderizar JavaScript, ele tem limitacoes:
- O conteudo renderizado por JS tem menor prioridade de indexacao
- O titulo e descricao do `index.html` base podem ser indexados no lugar dos especificos
- O conteudo dinamico (carregado do banco de dados) pode nao estar disponivel no momento do crawl

### 2. Titulo do index.html generico demais
O `index.html` tem como titulo padrao "Enove Imobiliaria | Condominios de Alto Padrao no RS". Se o Google nao executar o JS corretamente, esse titulo generico sera indexado para TODAS as paginas, diluindo a relevancia.

### 3. Pagina Home compete com Estancia Velha
A rota `/` (Home) menciona explicitamente "Estancia Velha" no seu conteudo:
```
"A cidade de Estancia Velha recebera um novo condominio..."
```
Isso cria **canibalizacao de keywords** - duas paginas do mesmo dominio competindo pela mesma busca "condominio estancia velha".

### 4. A Home (`/`) nao esta no sitemap
A pagina raiz nao esta incluida no `sitemap.xml`, entao o Google pode nao saber que ela existe ou qual sua relacao com as outras paginas.

### 5. Falta `<h1>` semantico consistente
Na pagina Estancia Velha, o `<h1>` e "O Maior Lancamento Imobiliario de Estancia Velha Esta Prestes a Ser Revelado" - bom para copywriting mas fraco para SEO. Nao contem termos como "condominio", "terrenos" ou "lotes" que sao os termos de busca.

### 6. Data de lancamento desatualizada
Os meta tags e keywords ainda referenciam "lancamento imobiliario **2025**" quando ja estamos em 2026. Isso afeta a relevancia temporal.

### 7. OG Title inconsistente com Title
- Title: "Condominio Alto Padrao Estancia Velha | 350 Lotes a partir de 500m2"
- OG Title: "Novo Condominio em Estancia Velha | Lancamento 2025"
- O Google pode usar qualquer um deles, e o OG ainda diz 2025.

---

## Plano de Melhorias

### Passo 1: Corrigir canibalizacao Home vs Estancia Velha
Remover a mencao explicita a "Estancia Velha" da Home, tornando-a uma pagina institucional generica da Enove que lista todos os empreendimentos.

### Passo 2: Otimizar `<h1>` da Estancia Velha para SEO
Alterar o H1 do HeroSection para incluir termos de busca relevantes. Exemplo:
```
"O Novo Condominio de Estancia Velha" (h1)
"350 Lotes a partir de 500m2" (subtitulo)
```

### Passo 3: Atualizar datas de 2025 para 2026
Corrigir todas as referencias a "2025" nos meta tags, keywords e OG tags das 3 landing pages.

### Passo 4: Alinhar OG Title com Title
Garantir que `og:title` e `<title>` sejam consistentes em todas as paginas.

### Passo 5: Adicionar Home ao sitemap
Incluir `https://onovocondominio.com.br/` no sitemap com prioridade menor (0.5).

### Passo 6: Melhorar conteudo semantico rastreavel
Adicionar textos semanticos mais ricos nas secoes das landing pages, com as palavras-chave naturais que as pessoas buscam.

---

## Secao Tecnica - Arquivos Modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Home.tsx` | Remover mencao especifica a "Estancia Velha", tornar institucional |
| `src/components/HeroSection.tsx` | Otimizar H1 para incluir "condominio" e termos de busca |
| `src/pages/EstanciaVelha.tsx` | Atualizar "2025" para "2026" nos meta tags, alinhar og:title com title |
| `src/pages/goldenview/GoldenViewLandingPage.tsx` | Revisar keywords e datas |
| `src/pages/mauriciocardoso/MauricioCardosoLandingPage.tsx` | Revisar keywords e datas |
| `public/sitemap.xml` | Adicionar URL da Home, atualizar lastmod para 2026-02-10 |

## Observacao sobre Pre-rendering
A solucao definitiva para o problema de SPA seria implementar pre-rendering (SSR/SSG), mas isso requer mudanca de framework (ex: Next.js) que nao e suportado pelo Lovable. As melhorias propostas acima maximizam o SEO dentro das limitacoes atuais da stack React + Vite.




# Criar paginas /prontos e /prontos/:brokerSlug para captacao de leads de imoveis prontos

## Contexto

A Enove trabalha com lancamentos e pre-lancamentos, mas tambem precisa captar leads interessados em imoveis prontos (usados ou ja construidos). Essas paginas serao independentes dos empreendimentos existentes e terao identidade visual propria.

## Etapas

### 1. Criar o projeto "prontos" no banco de dados

Inserir um registro na tabela `projects` com slug `prontos` para que os leads possam ser vinculados a ele. Isso permite segmentar leads de imoveis prontos no CRM e na Inteligencia Comercial.

### 2. Criar pagina `/prontos` (publica)

Nova pagina `src/pages/Prontos.tsx` com:
- Design premium escuro (mesmo padrao visual dos teasers existentes)
- Messaging diferenciado: foco em "imoveis prontos para morar", sem mencao a lancamentos
- Badge "Imoveis Prontos"
- Titulo e subtitulo contextualizados
- Formulario de captacao (nome + WhatsApp + termos)
- Insercao do lead no banco com `source: "landing_page"` e `project_id` do projeto "prontos"
- Triggers automaticos (auto-first-message, auto-cadencia)
- Attribution tracking (UTM)
- SEO basico com Helmet

### 3. Criar pagina `/prontos/:brokerSlug` (link do corretor)

Nova pagina `src/pages/ProntosBrokerPage.tsx` com:
- Mesmo layout da pagina publica
- Carrega o corretor pelo slug da URL
- Se corretor nao encontrado, redireciona para `/prontos`
- Meta tag `noindex, nofollow` (link personalizado nao deve ser indexado)
- Lead inserido com `broker_id` e `source: "broker_landing"`

### 4. Registrar rotas no App.tsx

Adicionar as duas rotas **antes** das rotas dinamicas `/:citySlug/:projectSlug`:
```
/prontos
/prontos/:brokerSlug
```

### 5. Pagina de termos

Os leads de imoveis prontos usarao a pagina de termos generica existente (`/termos`).

## Detalhes tecnicos

### Arquivos novos
| Arquivo | Descricao |
|---|---|
| `src/pages/Prontos.tsx` | Pagina publica com formulario |
| `src/pages/ProntosBrokerPage.tsx` | Pagina com link do corretor |

### Arquivos editados
| Arquivo | Alteracao |
|---|---|
| `src/App.tsx` | Adicionar 2 rotas |

### Banco de dados
- INSERT de um registro na tabela `projects` com slug `prontos`, city `Vale dos Sinos`, city_slug `prontos`, status `selling`, is_active `true`

### Fluxo do lead
1. Visitante preenche nome + WhatsApp + aceita termos
2. Lead inserido na tabela `leads` com `project_id` do projeto "prontos"
3. Attribution salva em `lead_attribution`
4. Dispara `auto-first-message` e `auto-cadencia-10d`
5. Toast de sucesso e reset do formulario

### Identidade visual
- Fundo escuro com gradiente (padrao Enove)
- Animacoes staggered de entrada (mesmo padrao dos teasers)
- Badge dourado "Imoveis Prontos"
- Copy focado em "seu imovel pronto para morar" / "sem espera, sem obra"

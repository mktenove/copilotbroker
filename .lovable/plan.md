

# Pagina Teaser "Em Breve" para Estancia Velha

## Objetivo

Criar duas paginas teaser para `/estanciavelha` e `/estanciavelha/:brokerSlug` com o conteudo "Novidade Chegando / Em Breve", mantendo os arquivos originais (`EstanciaVelha.tsx` e `BrokerLandingPage.tsx`) intactos como backup para reativacao futura.

## Arquivos a criar

### 1. `src/pages/EstanciaVelhaTeaser.tsx`

Pagina teaser elegante no estilo dark luxury contendo:
- Logo Enove centralizado no topo
- Badge "Novidade Chegando" com ponto pulsante dourado
- Titulo "Em Breve" em destaque (font-serif)
- Texto: "Novos empreendimentos de alto padrao estao chegando ao Vale dos Sinos. Cadastre-se e seja o primeiro a saber."
- Frase dourada: "Nao fique de fora."
- Componente `FormSection` com `allowBrokerSelection={true}` e `projectSlug="estanciavelha"`
- Busca o `projectId` do banco para atribuicao correta dos leads
- Footer simples
- SEO basico via Helmet (titulo, descricao, canonical)

### 2. `src/pages/EstanciaVelhaBrokerTeaser.tsx`

Mesma estrutura visual, porem:
- Busca o corretor pelo `:brokerSlug` da URL
- Passa `brokerId` e `brokerSlug` ao `FormSection` (sem seletor de corretor)
- Redireciona para `/estanciavelha` se corretor nao encontrado ou inativo

## Arquivo a alterar

### 3. `src/App.tsx`

- Substituir os dois redirects atuais (linhas 56-57) pelas novas rotas:
  - `/estanciavelha` aponta para `EstanciaVelhaTeaser`
  - `/estanciavelha/:brokerSlug` aponta para `EstanciaVelhaBrokerTeaser`
- Manter os imports comentados de `EstanciaVelha` e `BrokerLandingPage` como referencia de backup

## Backup

Os arquivos originais permanecem no projeto sem alteracao:
- `src/pages/EstanciaVelha.tsx` -- landing page completa com todas as secoes e schemas SEO
- `src/pages/BrokerLandingPage.tsx` -- landing page do corretor

Para reativar futuramente, basta trocar as rotas no `App.tsx` de volta para esses componentes.

## Detalhes tecnicos

- Reutiliza o `FormSection` existente (logica de salvar lead, webhook, notificacao WhatsApp, atribuicao)
- Animacao suave de entrada com Intersection Observer
- Layout centralizado, minimalista, responsivo
- Microsoft Clarity tag de Estancia Velha (vbso39eiiq) incluida via Helmet


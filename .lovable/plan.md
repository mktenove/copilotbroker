

# Nova Home Institucional B2B -- Plataforma de Lancamentos Enove

## Visao Geral

Substituir a Home atual (pagina simples "Em Breve" com formulario de leads) por uma pagina institucional completa voltada para incorporadoras (B2B). A pagina posiciona a Enove como plataforma de vendas de lancamentos, nao apenas uma imobiliaria.

A pagina tera 6 secoes conforme o briefing, sem formulario de captura de leads -- o CTA final sera um link direto para WhatsApp.

## Estrutura de Arquivos

O conteudo sera dividido em componentes para manter o padrao do projeto:

```text
src/pages/Home.tsx                          -- Pagina principal (orquestra as secoes)
src/components/home/HomeHero.tsx            -- Hero / primeira dobra
src/components/home/HomePositioning.tsx     -- Secao "Posicionamento"
src/components/home/HomeDifferentials.tsx   -- Secao "Diferencial Estrutural" (3 cards)
src/components/home/HomeProcess.tsx         -- Secao "Modelo de Atuacao" (3 etapas)
src/components/home/HomePartnership.tsx     -- Secao "Filosofia de Parceria"
src/components/home/HomeCTA.tsx             -- Secao "Call to Action" com link WhatsApp
src/components/home/index.ts               -- Barrel export
```

## Design e Estetica

Seguira o design system existente (dark luxury):
- Fundo escuro (background), tipografia serif para titulos (font-serif), sans para corpo
- Cor primaria dourada para destaques e CTAs (classe `text-primary`, `btn-primary`)
- Animacoes suaves de entrada (`animate-fade-up`, transicoes com `isVisible`)
- Divisores dourados (`divider-gold`)
- Cards com `card-luxury` para os diferenciais
- Espacamento generoso entre secoes
- Layout responsivo mobile-first

## Detalhamento por Secao

### 1. HomeHero
- Badge "Plataforma de Lancamentos" com ponto pulsante
- H1: "O parceiro estrategico para lancamentos imobiliarios no RS"
- Subtitulo e paragrafo descritivo
- Botao CTA "Quero Lancar com a Enove" que rola ate a secao de contato
- Background sutil com gradiente (sem imagem, para manter leveza institucional)

### 2. HomePositioning
- Titulo: "Lancamentos exigem metodo, nao improviso"
- Texto corrido + lista de 5 itens com icones minimalistas (lucide-react)
- Frase de destaque ao final

### 3. HomeDifferentials
- Titulo: "Muito alem da intermediacao"
- 3 cards lado a lado (responsivos, empilham em mobile):
  - Marketing proprio (com sub-lista)
  - Corretores de alta performance (com sub-lista)
  - LGPD (com sub-lista)
- Cada card usa o estilo `card-luxury`

### 4. HomeProcess
- Titulo: "Participamos de todo o ciclo do lancamento"
- 3 etapas (Pre-lancamento, Lancamento, Pos-lancamento)
- Layout em timeline vertical ou cards numerados
- Cada etapa com titulo, descricao e sub-lista

### 5. HomePartnership
- Secao mais simples, texto centrado
- Titulo: "Parcerias de longo prazo sao o nosso foco"
- Texto corrido com frase de destaque final em dourado

### 6. HomeCTA
- Titulo: "Vamos lancar juntos?"
- Subtitulo
- Botao "Entrar em Contato" como link externo para WhatsApp:
  `https://wa.me/5551997010323`

## Alteracoes em Arquivos Existentes

### src/pages/Home.tsx
- Remover toda a logica atual (formulario, supabase, toast, etc.)
- Substituir por composicao das novas secoes
- Manter Header com logo Enove e Footer existente

### src/App.tsx
- Nenhuma alteracao necessaria (rota `/` ja aponta para Home)

## Notas Tecnicas

- Nao ha captura de leads nesta pagina (sem supabase, sem formulario)
- O formulario antigo sera removido da Home, mas continua disponivel nas landing pages dos empreendimentos
- SEO: meta tags atualizadas no AppHead para refletir posicionamento B2B
- Acessibilidade: landmarks semanticos, aria-labels, skip-to-content mantidos
- Scroll suave entre secoes
- Intersection Observer para animacoes de entrada conforme scroll


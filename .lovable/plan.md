

# Rebranding Premium -- Pagina Teaser Estancia Velha

## Objetivo

Transformar as paginas `/estanciavelha` e `/estanciavelha/:brokerSlug` de um layout simples e generico para uma experiencia visual de altissimo padrao, sofisticada e memoravel -- mantendo a mesma funcionalidade (formulario de cadastro, atribuicao de corretor, SEO, Clarity).

## Conceito Visual

Estetica "Dark Luxury Editorial" -- inspirada em paginas de lancamentos de relogios e automoveis de luxo. Elementos-chave:

- Fundo com gradiente escuro sutil (nao flat preto)
- Linhas decorativas douradas ultra-finas
- Tipografia serifada grande e elegante com tracking largo
- Espacamento generoso e "breathing room"
- Animacoes sequenciais sofisticadas (staggered fade-in)
- Efeito de glow dourado sutil nos elementos interativos
- Micro-interacoes no hover

## Mudancas Visuais Detalhadas

### Header
- Logo Enove com opacidade reduzida (80%) que sobe para 100% no hover
- Linha dourada ultra-fina abaixo (1px, gradiente fade nas pontas)

### Hero Section
- Badge redesenhado: borda dourada com efeito shimmer animado, texto em caps com letter-spacing largo
- Texto "EM BREVE" em tamanho massivo (8xl/9xl), font-serif, com letter-spacing ultra-largo (0.3em), opacidade 90%
- Linha decorativa dourada centralizada entre titulo e subtitulo (divider-gold)
- Subtitulo com tipografia mais refinada, max-width menor para manter elegancia
- Frase "Nao fique de fora" estilizada como citacao com aspas douradas decorativas
- Background: gradiente radial sutil dourado no centro (bg-primary/3) + gradiente vertical escuro

### Formulario
- Card com borda dourada sutil (border-primary/20) e backdrop-blur mais forte
- Titulo do formulario com estilo editorial (letra maiuscula, tracking largo)
- Inputs com estilo mais refinado: bordas mais finas, fundo mais escuro (#0a0a0d), placeholder mais discreto
- Botao CTA com efeito glow dourado mais pronunciado e animacao shimmer no background
- Espacamento interno mais generoso

### Footer
- Minimalista: apenas copyright, sem borda top, usando separador dourado fino

### Animacoes
- Entrada sequencial (staggered): badge -> titulo -> divider -> texto -> frase -> formulario
- Cada elemento com delay incremental (200ms entre cada)
- Duracao mais longa (1.2s) para sensacao cinematografica
- Efeito parallax sutil no gradiente de fundo

## Arquivos a Alterar

### 1. `src/pages/EstanciaVelhaTeaser.tsx`
- Redesign completo do layout e estilos inline/classes
- Animacoes staggered com multiplos refs e states
- Background com gradientes sobrepostos
- Todos os elementos visuais premium descritos acima

### 2. `src/pages/EstanciaVelhaBrokerTeaser.tsx`
- Mesmas alteracoes visuais (compartilha a identidade)
- Mantida a logica especifica do corretor (fetch, redirect, loading)

### 3. Nenhum arquivo CSS novo
- Todas as estilizacoes usam Tailwind classes + CSS variables ja existentes no projeto
- Reutiliza tokens como `--gold`, `--charcoal`, `card-luxury`, `btn-primary`, `divider-gold`

## O que NAO muda

- Logica do `FormSection` (formulario permanece identico em funcionalidade)
- SEO meta tags e Helmet
- Microsoft Clarity tracking
- Rotas no App.tsx
- Logica de fetch do projectId e broker


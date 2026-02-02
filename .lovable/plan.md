
# Plano: Landing Page Wellness - Mauricio Cardoso (Novo Hamburgo)

## Objetivo

Criar uma landing page altíssimo padrão para um empreendimento residencial de apartamentos na Rua Maurício Cardoso, Novo Hamburgo. O design será inspirado em natureza e wellness, com paleta terrosa e orgânica que transmita sofisticação, serenidade e exclusividade.

## Nova Identidade Visual

### Paleta de Cores (Wellness/Natureza)

| Token | Cor | Uso |
|-------|-----|-----|
| `--mc-sage` | Verde-sálvia suave | Cor primária, CTAs, destaques |
| `--mc-stone` | Bege pedra | Backgrounds, cards |
| `--mc-earth` | Marrom terra | Textos secundários |
| `--mc-cream` | Creme claro | Background principal |
| `--mc-forest` | Verde-escuro | Acentos de contraste |

Esta paleta transmite: tranquilidade, conexão com natureza, sofisticação atemporal.

## Estrutura da Página

### Seções baseadas no copy fornecido

| Seção | Componente | Descrição |
|-------|------------|-----------|
| 1 | `MCHeroSection` | Impacto imediato com imagem do prédio |
| 2 | `MCLocationSection` | "O Endereço Fala Por Si" - Rua Maurício Cardoso |
| 3 | `MCConceptSection` | Conceito: 20 andares, 4 aptos/andar |
| 4 | `MCApartmentsSection` | Plantas de 95-125m², 2-3 dormitórios |
| 5 | `MCWellnessSection` | 1.800m² de lazer/wellness (com imagem piscina) |
| 6 | `MCTargetSection` | Para quem é esse empreendimento |
| 7 | `MCInvestmentSection` | Valorização e condições (20% entrada, 71x) |
| 8 | `MCBenefitsSection` | Benefícios do cadastro antecipado |
| 9 | `MCFormSection` | Formulário de captação |
| 10 | `MCFooter` | Rodapé com "O verdadeiro luxo começa pelo endereço" |

## Arquivos a Criar

```text
src/
├── assets/
│   └── mauriciocardoso/
│       ├── predio.png           (imagem do prédio - 20 andares)
│       └── piscina-wellness.jpg (área de lazer com piscina)
├── components/
│   └── mauriciocardoso/
│       ├── index.ts             (barrel export)
│       ├── MCHeader.tsx         (header minimalista com logo Enove)
│       ├── MCHeroSection.tsx    (hero com impacto visual)
│       ├── MCLocationSection.tsx
│       ├── MCConceptSection.tsx
│       ├── MCApartmentsSection.tsx
│       ├── MCWellnessSection.tsx
│       ├── MCTargetSection.tsx
│       ├── MCInvestmentSection.tsx
│       ├── MCBenefitsSection.tsx
│       ├── MCFormSection.tsx
│       ├── MCFooter.tsx
│       └── MCFloatingCTA.tsx
└── pages/
    └── mauriciocardoso/
        ├── MauricioCardosoLandingPage.tsx
        └── MauricioCardosoBrokerLandingPage.tsx
```

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/App.tsx` | Adicionar rotas `/novohamburgo/mauriciocardoso` e `/novohamburgo/mauriciocardoso/:brokerSlug` |
| `src/index.css` | Adicionar tokens CSS para paleta wellness (verde-sálvia, terroso) |

## Implementação Técnica

### 1. Tokens CSS Wellness

Novos tokens específicos para Mauricio Cardoso:

```css
/* Mauricio Cardoso - Wellness Palette */
--mc-sage: 145 30% 55%;           /* Verde-sálvia principal */
--mc-sage-light: 145 35% 70%;     /* Verde-sálvia claro */
--mc-sage-dark: 145 35% 40%;      /* Verde-sálvia escuro */
--mc-stone: 35 25% 92%;           /* Bege pedra */
--mc-earth: 25 20% 35%;           /* Marrom terra */
--mc-cream: 40 30% 97%;           /* Creme */
--mc-forest: 150 40% 25%;         /* Verde floresta */
```

### 2. Hero Section

- Background: Imagem do prédio (`predio-mauricio-OK.PNG`)
- Overlay: Gradiente suave de verde-escuro para transparente
- Headline: "Quando o endereço é definitivo, o projeto precisa estar à altura."
- Subtítulo em destaque com cor sage
- CTA: "Quero receber informações em primeira mão"

### 3. Seção Localização (O Endereço Fala Por Si)

- Destaque para "Rua Maurício Cardoso"
- Ícones: Prestígio, Tradição, Valorização
- Texto sobre o eixo nobre e consolidado
- Design: Cards minimalistas com bordas orgânicas

### 4. Seção Conceito

- Dados estruturados: 20 andares, 4 aptos/andar, 5 lojas no térreo
- Destaque para "Um projeto pensado para poucos"
- Design: Grid com números grandes e descrições

### 5. Seção Apartamentos

- Metragens: 95m² a 125m²
- Opções: 2 e 3 dormitórios
- Cards com ícones de planta, área, quartos

### 6. Seção Wellness (com imagem piscina)

- Imagem: `piscina-mauricio-OK.jpeg`
- Destaque: "1.800 m² dedicados ao bem-estar"
- Texto sobre descanso, convivência e equilíbrio
- Frase: "Viver bem também é saber desacelerar no lugar certo."

### 7. Seção Target Audience

- Lista com checks:
  - Coloca endereço acima de qualquer outro critério
  - Busca segurança patrimonial
  - Valoriza exclusividade e baixa densidade
  - Prefere projetos sólidos a modismos
  - Enxerga imóvel como moradia e patrimônio

### 8. Seção Investimento

- Condições:
  - 20% de entrada
  - Até 71 parcelas mensais
  - Sem juros
  - Correção INCC
- Entrega: Dezembro 2031
- Design: Cards com ícones e valores destacados

### 9. Seção Benefícios do Cadastro

- Informações completas sobre o projeto
- Atualizações oficiais
- Conteúdos exclusivos antes da divulgação
- "Sem compromisso. Sem promessas antecipadas."

### 10. Form Section

- Campos: Nome, WhatsApp
- Seleção opcional de corretor
- Checkbox de termos
- CTA: "Quero acompanhar esse projeto"
- Texto LGPD: "Ao se cadastrar, você autoriza o recebimento de comunicações..."

### 11. Footer

- Frase de impacto: "O verdadeiro luxo começa pelo endereço."
- Logos: Enove (comercialização)
- Disclaimer sobre material ilustrativo

## Rotas

```tsx
// App.tsx - Novas rotas
<Route path="/novohamburgo/mauriciocardoso" element={<MauricioCardosoLandingPage />} />
<Route path="/novohamburgo/mauriciocardoso/:brokerSlug" element={<MauricioCardosoBrokerLandingPage />} />
```

## Banco de Dados

Será necessário criar o projeto no banco:

```sql
INSERT INTO projects (
  name, slug, city, city_slug, 
  description, status, is_active,
  hero_title, hero_subtitle
) VALUES (
  'Mauricio Cardoso',
  'mauriciocardoso',
  'Novo Hamburgo',
  'novohamburgo',
  'Empreendimento residencial de alto padrão na Rua Maurício Cardoso',
  'pre_launch',
  true,
  'Quando o endereço é definitivo, o projeto precisa estar à altura.',
  'Na Rua Maurício Cardoso, o endereço mais icônico de Novo Hamburgo'
);
```

## SEO

- Title: "Mauricio Cardoso | Apartamentos de Alto Padrão em Novo Hamburgo"
- Meta Description: Focada em endereço icônico, wellness, 95-125m²
- Open Graph: Preparado para imagem OG futura
- JSON-LD: Schema.org para RealEstateListing

## Diferenciais do Design

1. **Paleta Wellness**: Verde-sálvia + tons terrosos (diferente do dourado/ouro do GoldenView)
2. **Tipografia**: Serif elegante para headlines + sans-serif para corpo
3. **Elementos orgânicos**: Bordas arredondadas suaves, formas fluidas
4. **Micro-animações**: Fade-in suave, parallax sutil nas imagens
5. **Fotografia**: Renderizações artísticas em estilo aquarela (conforme imagens fornecidas)

## Próximos Passos (Após Aprovação)

1. Copiar imagens fornecidas para `src/assets/mauriciocardoso/`
2. Adicionar tokens CSS wellness no `index.css`
3. Criar todos os componentes da página
4. Criar páginas principal e de corretor
5. Adicionar rotas no `App.tsx`
6. Criar projeto no banco de dados
7. Testar formulário e integração com webhook

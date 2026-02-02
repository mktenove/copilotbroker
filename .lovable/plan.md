
# Plano: Redesign Profissional Mobile-First - Mauricio Cardoso

## Problemas Identificados (baseado nos prints)

### 1. Menu Mobile Crítico
- O menu mobile abre **transparente sobre o conteúdo** (print image-17)
- Botões do menu se sobrepõem ao texto da página
- Sem backdrop ou fundo sólido quando aberto

### 2. Contraste de Cores Ilegível
- Texto em verde-escuro (`mc-sage`: `152 45% 32%`) sobre fundo escuro é quase invisível
- Quote na seção de localização (print image-19): texto verde sobre fundo preto
- Seção de apartamentos (print image-16): features em verde-claro sobre fundo escuro
- Label "LOCALIZAÇÃO" em verde-claro difícil de ler (print image-18)

### 3. Floating CTA Sobrepondo Conteúdo
- O botão "CADASTRAR" flutuante cobre texto importante

### 4. Termos de Uso Desatualizados
- Referencia "Novo Condomínio de Estância Velha" ao invés de "Mauricio Cardoso"
- Foro da comarca errado (Estância Velha/RS ao invés de Novo Hamburgo/RS)
- Botão "Voltar" leva para a raiz (`/`) ao invés da página do projeto

### 5. Layout não Mobile-First
- Espaçamentos não otimizados para telas pequenas
- Tipografia muito grande em mobile para algumas seções

---

## Solução: Redesign Profissional Mobile-First

### Arquivo 1: `MCHeader.tsx`
**Mudanças:**
- Menu mobile com **fundo sólido opaco** (`bg-[hsl(var(--mc-cream))]` ou `bg-[hsl(var(--mc-forest))]`)
- Animação de abertura suave
- Z-index correto para não sobrepor
- Padding melhorado para mobile
- Botões com área de toque maior (44x44px mínimo)

```tsx
// Mobile menu com fundo sólido
{isMobileMenuOpen && (
  <div className="fixed inset-0 top-[60px] z-40 md:hidden">
    {/* Backdrop */}
    <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
    
    {/* Menu Panel */}
    <nav className="relative bg-[hsl(var(--mc-cream))] mx-4 mt-4 p-6 rounded-lg shadow-xl">
      {/* Links com área de toque grande */}
    </nav>
  </div>
)}
```

### Arquivo 2: `MCLocationSection.tsx`
**Mudanças:**
- Quote com **texto branco ou creme** (não verde-escuro sobre fundo escuro)
- Melhor contraste entre texto e fundo
- Padding mobile otimizado

### Arquivo 3: `MCApartmentsSection.tsx`
**Mudanças:**
- Cards com **fundo sólido claro** em mobile
- Texto de features em cor mais contrastante
- Área de metragem com destaque visual adequado

### Arquivo 4: `MCFloatingCTA.tsx`
**Mudanças:**
- Posição menos intrusiva
- Tamanho menor em mobile
- Animação de entrada após mais scroll
- Opção de fechar/minimizar

### Arquivo 5: Nova Página de Termos para Mauricio Cardoso
**Criar:** `src/pages/mauriciocardoso/TermosMauricioCardoso.tsx`

**Conteúdo atualizado:**
- Nome do projeto: "Mauricio Cardoso - Novo Hamburgo"
- Foro: Comarca de Novo Hamburgo/RS
- Botão "Voltar" leva para `/novohamburgo/mauriciocardoso#cadastro`
- Design visual alinhado com a paleta wellness

### Arquivo 6: `App.tsx`
**Mudanças:**
- Adicionar rota `/novohamburgo/mauriciocardoso/termos`

### Arquivo 7: `MCFormSection.tsx`
**Mudanças:**
- Link dos termos aponta para `/novohamburgo/mauriciocardoso/termos`

---

## Correções de Contraste Detalhadas

| Componente | Problema | Solução |
|------------|----------|---------|
| MCLocationSection Quote | Texto verde `mc-sage` sobre fundo claro | Usar `mc-charcoal` para texto |
| MCApartmentsSection Features | Verde sobre fundo escuro | Usar branco/creme para texto |
| MCHeader Mobile Menu | Transparente | Fundo sólido `mc-cream` |
| Labels "LOCALIZAÇÃO" etc | Verde-claro ilegível | Usar `mc-sage` mais escuro ou branco |
| MCConceptSection Stats | OK em desktop, ruim em mobile | Ajustar tamanho responsivo |

---

## Arquivos a Modificar

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/components/mauriciocardoso/MCHeader.tsx` | Modificar | Menu mobile com fundo sólido |
| `src/components/mauriciocardoso/MCLocationSection.tsx` | Modificar | Contraste de texto |
| `src/components/mauriciocardoso/MCApartmentsSection.tsx` | Modificar | Cards mobile-friendly |
| `src/components/mauriciocardoso/MCConceptSection.tsx` | Modificar | Stats responsivos |
| `src/components/mauriciocardoso/MCWellnessSection.tsx` | Modificar | Layout mobile otimizado |
| `src/components/mauriciocardoso/MCTargetSection.tsx` | Modificar | Texto mais contrastante |
| `src/components/mauriciocardoso/MCInvestmentSection.tsx` | Modificar | Grid mobile |
| `src/components/mauriciocardoso/MCBenefitsSection.tsx` | Modificar | Espaçamento mobile |
| `src/components/mauriciocardoso/MCFormSection.tsx` | Modificar | Link para novos termos |
| `src/components/mauriciocardoso/MCFloatingCTA.tsx` | Modificar | Menos intrusivo |
| `src/components/mauriciocardoso/MCFooter.tsx` | Modificar | Mobile padding |
| `src/pages/mauriciocardoso/TermosMauricioCardoso.tsx` | Criar | Termos específicos do projeto |
| `src/App.tsx` | Modificar | Nova rota de termos |

---

## Detalhes Técnicos das Correções

### Menu Mobile - Solução Completa
```tsx
// Estado para controlar menu
const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

// Bloquear scroll do body quando menu aberto
useEffect(() => {
  if (isMobileMenuOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
  return () => { document.body.style.overflow = ''; };
}, [isMobileMenuOpen]);

// Menu com fundo sólido e animação
<div className={`
  fixed inset-x-0 top-[var(--header-height)] 
  bg-[hsl(var(--mc-cream))] 
  shadow-2xl
  transition-transform duration-300
  ${isMobileMenuOpen ? 'translate-y-0' : '-translate-y-full'}
`}>
```

### Contraste Corrigido - Paleta de Texto
```css
/* Texto sobre fundo claro (cream/stone) */
--mc-text-primary: 30 15% 12%;     /* Charcoal - títulos */
--mc-text-secondary: 30 25% 25%;   /* Earth - corpo */
--mc-text-accent: 158 55% 15%;     /* Forest - destaques */

/* Texto sobre fundo escuro (forest/charcoal) */
--mc-text-on-dark: 0 0% 100%;      /* Branco puro */
--mc-text-on-dark-muted: 0 0% 80%; /* Branco suave */
```

### Mobile-First Breakpoints
```css
/* Mobile first - base styles para mobile */
.section-title {
  @apply text-2xl leading-tight; /* Mobile */
}

@screen md {
  .section-title {
    @apply text-4xl; /* Tablet */
  }
}

@screen lg {
  .section-title {
    @apply text-5xl; /* Desktop */
  }
}
```

---

## Termos de Uso - Conteúdo Atualizado

### Mudanças no texto:
1. **Seção 1**: "Novo Condomínio de Estância Velha" → "Empreendimento Mauricio Cardoso"
2. **Seção 3**: Descrição sobre o endereço Rua Maurício Cardoso, Novo Hamburgo
3. **Seção 7 (Foro)**: "Comarca de Estância Velha/RS" → "Comarca de Novo Hamburgo/RS"
4. **Botão Voltar**: Link para `/novohamburgo/mauriciocardoso#cadastro`

### Visual dos Termos:
- Usar paleta wellness (verde-floresta, creme)
- Header com logo Enove monocolor
- Design consistente com a landing page

---

## Resultado Esperado

Após as correções:
1. Menu mobile abre com **fundo sólido** sem sobrepor o conteúdo
2. **Todo texto legível** com contraste adequado (WCAG AA mínimo)
3. **CTA flutuante** não cobre conteúdo importante
4. **Termos de Uso** corretos para o projeto Mauricio Cardoso
5. **Botão Voltar** retorna para a landing page correta
6. Layout **mobile-first** com espaçamentos e tipografia otimizados
7. **Experiência profissional** sem elementos amadores

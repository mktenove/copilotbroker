

# Redesign Mobile-First da Aba "Automacao"

## Diagnostico UX/UI Atual

### Problemas identificados no mobile:

1. **Header congestionado**: O titulo "Automacao de Primeira Mensagem" + subtitulo + botao "Nova Regra" ficam em uma unica linha horizontal que nao cabe em telas pequenas. O botao pode ficar comprimido ou quebrar o layout.

2. **Cards de regra com acoes horizontais**: As acoes (Switch + Editar + Excluir) ficam alinhadas horizontalmente ao lado do conteudo, competindo por espaco em telas < 390px. Isso causa truncamento ou overflow.

3. **Badges e status em linha**: As tags de empreendimento + status ativo ficam lado a lado, podendo colidir em telas estreitas.

4. **Alertas informativos ocupam espaco excessivo**: Os dois alertas (azul e vermelho) no rodape consomem area valiosa no mobile, empurrando o conteudo principal para baixo.

5. **Empty state generico**: O estado vazio nao aproveita bem o espaco vertical do mobile.

6. **Editor Sheet nao otimizado**: O SheetContent usa `sm:max-w-lg` mas no mobile ocupa toda a tela sem considerar a safe-area inferior (bottom nav sobrepoe o botao de acao).

---

## Solucao Proposta

### Filosofia de Design
- **Mobile-first**: Cada decisao comeca pela experiencia em 390px
- **Thumb-friendly**: Acoes principais na zona de alcance do polegar
- **Hierarquia clara**: Informacao mais importante primeiro, detalhes sob demanda
- **Consistencia**: Manter o dark theme e os padroes visuais ja estabelecidos

---

## Mudancas Detalhadas

### Arquivo 1: `src/components/whatsapp/AutoMessageTab.tsx`

**Header responsivo:**
- Mobile: titulo em uma linha, subtitulo abaixo, botao "Nova Regra" em largura total abaixo do texto (stack vertical)
- Desktop: manter layout horizontal atual
- Usar `flex-col sm:flex-row` para adaptar

**Cards de regra reestruturados (mobile):**
- Layout vertical: badge do empreendimento + status no topo
- Preview da mensagem no meio
- Meta info (delay) abaixo
- Linha de acoes separada no rodape do card: Switch a esquerda, botoes "Editar" e "Excluir" a direita (apenas icones no mobile, com texto visivel no desktop)
- Adicionar gestos visuais: todo o card e clicavel para editar, swipe visual sugerido pelo layout

**Alertas compactados:**
- Substituir os 2 alertas separados por um unico bloco colapsavel (Collapsible) com titulo "Como funciona?" e icone de chevron
- No mobile, iniciar colapsado para economizar espaco
- No desktop, manter expandido por padrao

**Empty state melhorado:**
- Icone maior e mais expressivo
- Texto mais curto e direto
- Botao CTA em destaque com largura total no mobile

### Arquivo 2: `src/components/whatsapp/AutoMessageRuleEditor.tsx`

**Sheet otimizado para mobile:**
- Adicionar `pb-24` (padding-bottom) para evitar que a bottom nav sobreponha os botoes de acao
- Botoes de acao (Cancelar/Salvar) fixos no rodape do sheet com `sticky bottom-0`
- Melhorar espacamento dos campos do formulario para touch targets de 44px minimo
- Botoes de variaveis com tamanho maior no mobile (min-h-[36px]) para facilitar o toque
- Preview do WhatsApp com bordas arredondadas maiores e padding adequado

---

## Detalhes Tecnicos

### AutoMessageTab.tsx - Mudancas especificas:

```text
HEADER (linhas 52-69):
  Antes:  flex items-center justify-between (horizontal sempre)
  Depois: flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between

BOTAO "Nova Regra" (linhas 65-68):
  Antes:  Dentro do header, alinhado a direita
  Depois: w-full sm:w-auto (largura total no mobile)

CARD DE REGRA (linhas 87-158):
  Antes:  flex items-start justify-between gap-4 (conteudo + acoes lado a lado)
  Depois: flex flex-col (stack vertical)
           -> Topo: badge + status
           -> Meio: preview da mensagem
           -> Rodape: flex items-center justify-between
              -> Esquerda: Switch + delay info
              -> Direita: botoes icone (Pencil, Trash2)

ACOES DO CARD:
  Antes:  Botoes com texto "Editar" e "Excluir"
  Depois: Mobile: apenas icones (Pencil w-4 h-4, Trash2 w-4 h-4) com tooltip
          Desktop: manter texto via hidden sm:inline

ALERTAS (linhas 163-178):
  Antes:  2 Alerts separados sempre visiveis
  Depois: Collapsible com trigger "Saiba como funciona"
          CollapsibleContent contem os 2 alertas
          Usa estado aberto por padrao no desktop (sm:), fechado no mobile
```

### AutoMessageRuleEditor.tsx - Mudancas especificas:

```text
SHEET CONTENT (linha 169):
  Adicionar: pb-24 md:pb-6 para safe-area da bottom nav

BOTOES DE ACAO (linhas 279-304):
  Antes:  Inline no flow do formulario
  Depois: sticky bottom-0 bg-[#1a1a1d] pt-4 border-t border-[#2a2a2e]
          z-10 para ficar acima do scroll

BOTOES DE VARIAVEIS (linhas 241-253):
  Antes:  px-2 py-0.5 text-xs
  Depois: px-3 py-1.5 text-xs sm:px-2 sm:py-0.5 (touch targets maiores no mobile)

CAMPOS DO FORMULARIO:
  Textarea min-h: 150px -> 120px no mobile (mais espaco para o resto)
```

---

## Resultado Esperado

- No mobile (390px): layout limpo, vertical, com acoes acessiveis pelo polegar
- Alertas informativos escondidos por padrao, disponiveis sob demanda
- Cards de regra compactos com acoes claras na parte inferior
- Editor Sheet com botoes de salvar sempre visiveis (sticky)
- No desktop: experiencia mantida sem regressoes visuais

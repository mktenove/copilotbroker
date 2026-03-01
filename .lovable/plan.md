

## Análise Comparativa

**Referência**: Fundo predominantemente preto/escuro. A rede neural é muito sutil — quase invisível exceto por detalhes finos. O destaque principal é um **flare horizontal dourado intenso** no centro, com partículas douradas espalhadas. As bordas são muito escuras (efeito vignette).

**Atual**: A rede neural está muito brilhante e visível — as linhas verdes/amarelas dominam o fundo. O overlay escuro é insuficiente (40%). Falta contraste e o efeito "cinematográfico" escuro da referência.

## Plano de Correção (`CopilotHero.tsx`)

### 1. Escurecer drasticamente o fundo
- Reduzir opacidade da imagem: `opacity-[0.45]` → `opacity-[0.25]`
- Aumentar overlay escuro: `bg-background/40` → `bg-background/65`
- Isso traz a visibilidade efetiva da rede para ~8%, similar à referência

### 2. Adicionar efeito vignette nas bordas
- Novo div com gradiente radial: centro transparente, bordas pretas
- `bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(0,0,0,0.7)_100%)]`

### 3. Intensificar o flare dourado horizontal
- Aumentar intensidade do light streak: `via-primary/15` → `via-primary/25`
- Aumentar altura: `h-[300px]` → `h-[200px]` (mais concentrado)
- Aumentar blur: `blur-[80px]` → `blur-[100px]`
- Adicionar uma segunda camada de flare mais fina e brilhante

### 4. Reduzir o radial glow central
- Diminuir: `bg-primary/10` → `bg-primary/6`
- Isso evita que o centro fique "lavado"


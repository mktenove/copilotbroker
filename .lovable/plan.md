

## Problema Identificado

Comparando o site de referência com o atual:

1. **Referência**: A rede neural aparece com detalhes finos visíveis, partículas douradas, e um brilho central horizontal dourado. A imagem não está "esticada" — mantém sua escala original.
2. **Atual**: A rede neural está praticamente invisível (18% opacidade + 70% overlay escuro = ~5% visibilidade real). Além disso, `object-cover` em tela cheia estica a imagem, perdendo detalhes.

## Plano de Implementação

### 1. Ajustar a renderização da imagem de fundo (`CopilotHero.tsx`)

- Aumentar a opacidade da imagem de `0.18` para `0.45` — permitindo que os detalhes da rede neural fiquem visíveis
- Reduzir o overlay escuro de `bg-background/70` para `bg-background/40` — menos bloqueio
- Adicionar `object-position: center 60%` para posicionar a parte mais interessante da imagem (onde estão as linhas e partículas)
- Manter `object-cover` mas garantir que a imagem não fique "ampliada demais" limitando o container

### 2. Adicionar efeito de brilho dourado central (como na referência)

- Adicionar um gradiente horizontal dourado sutil no centro da seção, simulando o "light streak" dourado que aparece na referência
- Usar um pseudo-elemento ou div com gradiente `from-transparent via-primary/15 to-transparent` posicionado horizontalmente no centro

### 3. Manter o parallax existente

- O efeito de movimento ao rolar permanece igual (15% de velocidade)

### Detalhes Técnicos

**Arquivo**: `src/components/copilot-home/CopilotHero.tsx`

Mudanças no JSX:
- Imagem: `opacity-[0.18]` → `opacity-[0.45]`
- Overlay: `bg-background/70` → `bg-background/40`
- Novo div para o "light streak" dourado horizontal, posicionado no centro vertical da seção
- Ajustar o radial glow existente para complementar o efeito


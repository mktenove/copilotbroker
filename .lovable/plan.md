
# Redesign Premium da Pagina "Meus Empreendimentos"

## Problema

A pagina `BrokerProjects.tsx` usa CSS variables genericas (`bg-card`, `border-border`, `bg-background`, `bg-muted`) que no dark mode resolvem para tons quentes/marrom (HSL matiz 20-40), destoando do restante do painel que ja usa cores neutras frias hardcoded.

## Mudancas no Arquivo: `src/pages/BrokerProjects.tsx`

### 1. Loading state (linha 171)
- Trocar `bg-background` por `bg-[#0f0f12]`

### 2. Header (linhas 190-204)
- Botao voltar: trocar `hover:bg-muted` por `hover:bg-[#2a2a2e]`
- Manter textos com `text-foreground` e `text-muted-foreground` (esses funcionam bem)

### 3. Botoes "Copiar todos" e "Adicionar" (linhas 206-275)
- Botao outline: trocar `variant="outline"` por classes customizadas com bordas `border-[#2a2a2e]` e `bg-[#1e1e22]`
- Dialog de adicionar: trocar `bg-card border-border` por `bg-[#1e1e22] border-[#2a2a2e]`
- Cada item dentro do dialog: trocar `bg-background border-border` por `bg-[#141417] border-[#2a2a2e]`

### 4. Banner de pendentes (linhas 278-308)
- Remover o circulo amarelo do icone (estilo Elementor)
- Simplificar para layout inline minimalista como o do BrokerAdmin
- Trocar `rounded-xl` por `rounded-lg`
- Usar `bg-[#1e1e22]` com `border-yellow-500/30`
- Icone inline sem fundo circular

### 5. Estado vazio (linhas 312-324)
- Trocar `bg-card border-border rounded-xl` por `bg-[#1e1e22] border-[#2a2a2e] rounded-lg`

### 6. Cards de projetos (linhas 326-380)
- Trocar `bg-card border-border rounded-xl` por `bg-[#1e1e22] border-[#2a2a2e] rounded-lg`
- Remover o quadrado amarelo do icone (`bg-primary/10 rounded-lg`) e usar icone inline sutil
- Trocar `bg-muted` do badge de cidade por `bg-[#2a2a2e]`
- Botoes de acao: trocar `bg-primary/10` por cores mais sutis

### 7. Slug Editor (linhas 384-425)
- Trocar `bg-card border-border rounded-xl` por `bg-[#1e1e22] border-[#2a2a2e] rounded-lg`
- Input: trocar `bg-background` por `bg-[#141417]`

### 8. Dialog de confirmacao de remocao (linhas 428-446)
- Trocar `bg-card border-border` por `bg-[#1e1e22] border-[#2a2a2e]`

## Resumo da Paleta Aplicada

| Elemento | Cor antiga (CSS var) | Cor nova (hex neutro) |
|---|---|---|
| Fundo de cards | `bg-card` | `bg-[#1e1e22]` |
| Bordas | `border-border` | `border-[#2a2a2e]` |
| Fundo da pagina | `bg-background` | `bg-[#0f0f12]` |
| Inputs / fundo profundo | `bg-background` | `bg-[#141417]` |
| Badges / muted | `bg-muted` | `bg-[#2a2a2e]` |
| Hover de botoes | `hover:bg-muted` | `hover:bg-[#2a2a2e]` |
| Cantos | `rounded-xl` | `rounded-lg` |

## Resultado Esperado

- Toda a pagina alinhada com o design premium dark neutro (sem tons marrom)
- Sem circulos de icone estilo "Elementor"
- Cards compactos e minimalistas
- Dialogs e inputs com mesmo tom frio do restante do painel

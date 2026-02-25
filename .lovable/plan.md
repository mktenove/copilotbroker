

## Plano: Unificar o cinza frio como token do design system

### Diagnóstico

| Elemento | Classe atual | Tom |
|----------|-------------|-----|
| Breadcrumb "Configure o assistente IA..." | `text-slate-500` | Frio (azul-cinza) |
| Ícones sidebar (inativos) | `text-muted-foreground` → `hsl(40, 10%, 60%)` | Quente (amarelo-cinza) |
| Settings / Notifications | `text-muted-foreground` | Quente |

O `--muted-foreground` no dark mode está em `hsl(40, 10%, 60%)` — matiz 40 (quente). O `text-slate-500` do Tailwind é `hsl(215, 16%, 47%)` — matiz 215 (frio). O usuário quer o tom frio em todos os ícones.

### Alterações

#### 1. `src/index.css` — Atualizar o token `--muted-foreground` no dark mode
- De: `--muted-foreground: 40 10% 60%;` (quente)
- Para: `--muted-foreground: 220 10% 55%;` (frio, próximo ao slate-500)
- Isso propaga automaticamente para todos os componentes que usam `text-muted-foreground`, incluindo sidebar, tooltips, placeholders, labels secundários, etc.

#### 2. `src/components/admin/AdminHeader.tsx` — Migrar para o token semântico
- Substituir `text-slate-500` por `text-muted-foreground` nos textos de breadcrumb ("Admin", "›", subtitle)
- Substituir `text-slate-600` por `text-muted-foreground/60` no separador "·"
- Substituir `text-slate-200` por `text-foreground` no título ativo
- Remover o uso de `text-white` no mobile header, trocando por `text-foreground`
- Isso garante que o header use os mesmos tokens do design system

#### 3. Nenhuma alteração na sidebar
- A sidebar já usa `text-muted-foreground` — ao atualizar o token CSS, ela recebe o tom frio automaticamente.

### Impacto
- Todos os elementos que usam `text-muted-foreground` (sidebar, header, cards, labels, inputs placeholder) passarão a usar o cinza frio
- O design system fica unificado: um único token controla o tom de cinza secundário
- Não quebra nenhum componente existente — apenas muda a matiz de quente para frio

### Detalhes técnicos
A mudança no CSS variable `--muted-foreground` de `40 10% 60%` para `220 10% 55%` altera a matiz (hue) de 40° (amarelo) para 220° (azul), mantendo saturação baixa e luminosidade similar. O resultado é um cinza neutro-frio que combina com o fundo `#141417` da sidebar e os acentos dourados do design.


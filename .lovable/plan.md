

## Plano: Migrar tokens quentes para cinza frio no design system e na página Copiloto

### Diagnóstico

Os tokens CSS do dark mode ainda usam matiz 20-40 (quente/marrom):

| Token | Valor atual | Problema |
|-------|------------|----------|
| `--background` | `20 14% 4%` | Hue 20 = quente |
| `--card` | `20 20% 8%` | Hue 20 = quente |
| `--popover` | `20 20% 8%` | Hue 20 = quente |
| `--secondary` | `20 15% 15%` | Hue 20 = quente |
| `--muted` | `20 15% 20%` | Hue 20 = quente |
| `--border` | `40 20% 20%` | Hue 40 = marrom |
| `--input` | `40 20% 20%` | Hue 40 = marrom |
| `--charcoal` | `20 14% 4%` | Hue 20 = quente |
| `--charcoal-light` | `20 15% 12%` | Hue 20 = quente |

Além disso, `CopilotConfigPage.tsx` usa dezenas de cores hardcoded (`text-slate-400`, `bg-[#1a1a1e]`, `border-[#2a2a2e]`, `text-white`) ao invés de tokens semânticos.

### Alterações

#### 1. `src/index.css` — Migrar todos os tokens para cinza frio (hue 220-240)

Novos valores (mantendo luminosidade similar, trocando hue para frio):

| Token | Valor novo |
|-------|-----------|
| `--background` | `240 6% 4%` |
| `--card` | `240 6% 9%` |
| `--popover` | `240 6% 9%` |
| `--secondary` | `220 8% 15%` |
| `--muted` | `220 8% 18%` |
| `--border` | `220 8% 18%` |
| `--input` | `220 8% 18%` |
| `--charcoal` | `240 6% 4%` |
| `--charcoal-light` | `240 6% 12%` |

Isso elimina qualquer tom marrom/quente de toda a aplicação.

#### 2. `src/components/inbox/CopilotConfigPage.tsx` — Migrar para tokens semânticos

Substituições em massa:
- `text-white` → `text-foreground`
- `text-slate-400` → `text-muted-foreground`
- `text-slate-500` → `text-muted-foreground`
- `text-slate-300` → `text-foreground`
- `text-slate-200` → `text-foreground`
- `bg-[#1a1a1e]` → `bg-card`
- `bg-[#141417]` → `bg-background`
- `border-[#2a2a2e]` → `border-border`
- `border-[#3a3a3e]` → `border-border`
- `bg-[#1e1e22]` → `bg-card`
- `bg-[#2a2a2e]` → `bg-muted`
- `bg-[#3a3a3e]` → `bg-muted`

Manter as cores específicas do Enove Yellow (`#FFFF00`, `text-primary`, etc.) e cores semânticas de status (green, red, blue, purple, orange para ícones de seção).

### Impacto
- Toda a aplicação (sidebar, cards, inputs, modais, tooltips, bordas) muda de tons quentes para cinza frio
- A página Copiloto deixa de usar cores hardcoded e adere ao design system
- Futuras alterações de cor são feitas em um único lugar (`index.css`)
- Nenhuma alteração funcional — apenas visual

### Detalhes técnicos
A mudança do hue de 20-40 para 220-240 nos tokens CSS altera a base cromática de "charcoal quente" para "steel gray frio". A luminosidade e saturação são mantidas próximas para preservar contraste e hierarquia visual. Todos os componentes que usam `bg-card`, `bg-background`, `border-border`, `text-muted-foreground` etc. herdam automaticamente o novo tom.


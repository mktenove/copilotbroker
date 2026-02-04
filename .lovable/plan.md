
## Atualização de Cores - WhatsApp Atendimento Assistido

### Problema Identificado

Os componentes da sessão WhatsApp estão usando uma **mistura inconsistente** de:
- **Cores hardcoded do dark theme**: `#1a1a1d`, `#2a2a2e`, `#0f0f12` (corretas)
- **Variáveis semânticas**: `bg-card`, `text-foreground`, `border-border`, `bg-accent` (podem puxar tons marrom/bege do tema claro)

Isso causa a aparência inconsistente que você observou.

---

### Solução

Padronizar **todos** os componentes WhatsApp para usar as cores fixas do design novo:

| Elemento | Cor Atual (problemática) | Cor Nova (padronizada) |
|----------|-------------------------|----------------------|
| Background cards | `bg-card` | `bg-[#1a1a1d]` |
| Bordas | `border-border` | `border-[#2a2a2e]` |
| Texto principal | `text-foreground` | `text-white` |
| Texto secundário | `text-muted-foreground` | `text-slate-400` |
| Backgrounds profundos | - | `bg-[#0f0f12]` ou `bg-[#141417]` |
| Hover states | `hover:bg-accent` | `hover:bg-[#2a2a2e]` |

---

### Arquivos a Atualizar

#### 1. `src/components/whatsapp/CampaignsTab.tsx`
- Substituir `text-foreground` → `text-white`
- Substituir `bg-card border-border` → `bg-[#1a1a1d] border-[#2a2a2e]`
- Substituir `hover:bg-accent` → `hover:bg-[#2a2a2e]`

#### 2. `src/components/whatsapp/SecurityTab.tsx`
- Substituir todas as instâncias de `bg-card border-border` → `bg-[#1a1a1d] border-[#2a2a2e]`
- Substituir `text-foreground` → `text-white`
- Substituir `text-muted-foreground` → `text-slate-400`

#### 3. `src/pages/AdminWhatsApp.tsx`
- Substituir `text-foreground` → `text-white`
- Substituir `text-muted-foreground` → `text-slate-400`

#### 4. `src/components/admin/WhatsAppOverviewTab.tsx`
- Substituir todas as variáveis semânticas por cores fixas do dark theme
- `bg-card` → `bg-[#1a1a1d]`
- `border-border` → `border-[#2a2a2e]`
- `text-foreground` → `text-white`
- `text-muted-foreground` → `text-slate-400`
- `bg-accent/30` → `bg-[#2a2a2e]/30`
- `hover:bg-accent/50` → `hover:bg-[#2a2a2e]/50`

#### 5. `src/pages/BrokerWhatsApp.tsx`
- Já está correto (usa cores hardcoded)

---

### Paleta Padrão do Dark Theme Admin

```text
--background-base:    #0d0d0f  ou  #0f0f12
--card-surface:       #1a1a1d
--card-elevated:      #1e1e22
--border:             #2a2a2e
--border-hover:       #3a3a3e
--text-primary:       white
--text-secondary:     slate-400
--text-muted:         slate-500
--accent-primary:     primary (amarelo Enove)
```

---

### Resultado Esperado

Após as alterações:
- Todos os componentes WhatsApp terão o **mesmo visual dark consistente**
- Não haverá mais tons marrons herdados do tema claro
- A interface ficará visualmente alinhada com o resto do painel administrativo

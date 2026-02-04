
# Plano: Ajustar Ícone do WhatsApp no Admin

## Objetivo

Trocar o ícone do módulo WhatsApp na sidebar do admin para usar o mesmo ícone verde bonito do corretor (`MessageSquare` com `text-green-400`), e posicionar acima do botão Analytics.

---

## Alterações Necessárias

### Arquivo: `src/components/admin/AdminSidebar.tsx`

**1. Trocar o ícone de `Smartphone` para `MessageSquare`:**

```typescript
// Antes
import { Smartphone } from "lucide-react";

// Depois  
import { MessageSquare } from "lucide-react";
```

**2. Reordenar os itens de navegação:**

Mover o WhatsApp para ficar ANTES do Analytics na lista `NAV_ITEMS`.

```typescript
// Antes
const NAV_ITEMS = [
  { id: "crm", label: "CRM", icon: LayoutDashboard },
  { id: "leads", label: "Leads", icon: Users },
  { id: "brokers", label: "Corretores", icon: Users },
  { id: "projects", label: "Empreendimentos", icon: Building2 },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "whatsapp", label: "WhatsApp", icon: Smartphone },
];

// Depois
const NAV_ITEMS = [
  { id: "crm", label: "CRM", icon: LayoutDashboard },
  { id: "leads", label: "Leads", icon: Users },
  { id: "brokers", label: "Corretores", icon: Users },
  { id: "projects", label: "Empreendimentos", icon: Building2 },
  { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];
```

**3. Aplicar cor verde ao ícone do WhatsApp quando ativo:**

Atualizar a lógica de renderização para aplicar `text-green-400` quando o item for WhatsApp e estiver ativo.

```tsx
className={cn(
  "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
  isActive && item.id === "whatsapp"
    ? "bg-green-500/20 text-green-400"
    : isActive 
      ? "bg-primary/20 text-primary" 
      : "text-muted-foreground hover:text-foreground hover:bg-accent"
)}
```

---

## Resultado Visual

```text
┌────────────────┐
│     Logo       │
├────────────────┤
│    [+ FAB]     │
├────────────────┤
│   📊 CRM       │
│   👥 Leads     │
│   👥 Corretores│
│   🏢 Projetos  │
│   💬 WhatsApp  │ ← Ícone verde (MessageSquare)
│   📈 Analytics │
├────────────────┤
│ 🔔 Notificações│
│ ⚙️ Config      │
│ 👤 Avatar/Sair │
└────────────────┘
```

---

## Arquivos Afetados

| Arquivo | Alteração |
|---------|-----------|
| `src/components/admin/AdminSidebar.tsx` | Trocar ícone, reordenar nav items, aplicar cor verde |

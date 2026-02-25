

## Plano: Substituir botão "Inbox" pelo estilo verde do WhatsApp

### Contexto
O botão "Inbox" na sidebar do Admin e no menu mobile usa o ícone `Inbox` com estilo padrão. O usuário quer que ele tenha o efeito visual verde do WhatsApp, como o antigo botão "WhatsApp" que existia antes da unificação.

### Alterações

#### 1. `src/components/admin/AdminSidebar.tsx`
- Trocar o ícone de `Inbox` para `MessageCircle` (lucide-react) — ícone mais próximo do WhatsApp
- Adicionar estilo verde especial para o item "inbox":
  - Quando ativo: `bg-green-500/20 text-green-400` com barra indicadora verde (`bg-green-400`)
  - Quando inativo: `text-green-400/60 hover:text-green-400 hover:bg-green-500/10`
  - Badge de unread mantém o estilo atual (vermelho)
- Manter o label "Inbox" no tooltip

#### 2. `src/components/admin/MobileBottomNav.tsx`
- Trocar o ícone de `Inbox` para `MessageCircle` no drawer
- Aplicar estilo verde no item do drawer: `text-green-400 active:bg-green-500/10`
- No bottom nav, o ícone de notificações permanece, mas o item "Inbox" no drawer recebe o estilo verde

#### 3. `src/components/admin/AdminHeader.tsx`
- Nenhuma alteração necessária (apenas labels de texto)

### Resultado
O botão de caixa de entrada terá o efeito visual verde característico do WhatsApp em ambas as versões (desktop sidebar e mobile drawer), mantendo a mesma funcionalidade de navegação para `/admin/inbox`.


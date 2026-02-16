

# Corrigir painel de notificacoes

## Problemas identificados

1. **Contador nao zera ao abrir**: Quando o usuario clica no sino, o contador de notificacoes nao lidas permanece visivel. O correto e marcar todas como lidas automaticamente ao abrir o painel.

2. **Notificacoes cortadas / mal exibidas**: O `ScrollArea` tem `max-h-80` (320px) fixo, que e muito pequeno especialmente no mobile. Alem disso, no modo inline (usado na Sheet mobile), o container tem altura limitada que pode cortar o conteudo.

## Alteracoes

### 1. `src/components/admin/NotificationPanel.tsx`

**Zerar contador ao abrir o sino:**
- No `onOpenChange` do Popover, quando `isOpen` muda para `true`, chamar `markAllAsRead()` automaticamente
- Isso garante que ao abrir e ver as notificacoes, o badge vermelho desaparece

**Melhorar exibicao:**
- Aumentar o `max-h-80` do ScrollArea para `max-h-[60vh]` no popover e `max-h-[70vh]` no inline, para aproveitar melhor a tela
- Garantir que o container inline nao tenha restricoes de altura desnecessarias

### 2. `src/components/admin/AdminLayout.tsx`

- No Sheet mobile de notificacoes, remover restricoes de padding/overflow que possam estar cortando o conteudo do NotificationPanel inline

## Resumo tecnico

| Arquivo | Alteracao |
|---------|-----------|
| `NotificationPanel.tsx` | Chamar `markAllAsRead` no `onOpenChange(true)` do Popover; aumentar `max-h` do ScrollArea |
| `AdminLayout.tsx` | Ajustar container do NotificationPanel inline no Sheet mobile |


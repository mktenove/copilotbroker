
# Correção: Notificações Visíveis no Primeiro Clique

## Problema Identificado
O `NotificationPanel` está envolvido por um `Tooltip` na sidebar, criando um conflito entre os eventos de clique do `Tooltip` e do `Popover` interno. Isso causa a necessidade de clicar duas vezes para abrir as notificações.

## Causa Técnica
```tsx
// AdminSidebar.tsx - Linhas 122-131
<Tooltip>
  <TooltipTrigger asChild>
    <span>
      <NotificationPanel />  <!-- Já tem seu próprio PopoverTrigger -->
    </span>
  </TooltipTrigger>
  ...
</Tooltip>
```

O `NotificationPanel` já contém um `PopoverTrigger` com um botão clicável. Quando envolto por outro `Tooltip` + `TooltipTrigger`, os eventos de clique entram em conflito.

## Solução
Remover o wrapper `Tooltip` do `NotificationPanel` na `AdminSidebar`, já que o tooltip não é essencial (o ícone de sino é autoexplicativo) e está causando o bug.

---

## Alteração Necessária

### Arquivo: `src/components/admin/AdminSidebar.tsx`

**Antes (linhas 120-131):**
```tsx
{/* Notifications */}
<Tooltip>
  <TooltipTrigger asChild>
    <span>
      <NotificationPanel />
    </span>
  </TooltipTrigger>
  <TooltipContent side="right" className="bg-[#1e1e22] border-[#2a2a2e] text-slate-200">
    Notificações
  </TooltipContent>
</Tooltip>
```

**Depois:**
```tsx
{/* Notifications */}
<NotificationPanel />
```

---

## Resultado Esperado
- Clicar uma única vez no sino abre o painel de notificações imediatamente
- Comportamento fluido sem conflitos de eventos
- Mantém todas as funcionalidades do painel de notificações

---

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/admin/AdminSidebar.tsx` | Remover wrapper Tooltip do NotificationPanel |


# Plano: Corrigir Drag-and-Drop e Exibir Nome do Corretor

## Problema 1: Erro ao Arrastar Cards entre Colunas

### Diagnostico
Quando um card e arrastado e solto **sobre outro card** (em vez de uma area vazia da coluna), o `over.id` retorna o ID do card de destino (UUID) em vez do status da coluna. O codigo atual tenta usar esse UUID como valor de enum `lead_status`, causando o erro:
```
invalid input value for enum lead_status: "d614c97d-e3ab-4c5d-9977-56ace05ccca4"
```

### Solucao
Modificar o `handleDragEnd` no `KanbanBoard.tsx` para:
1. Verificar se o `over.id` e um status valido
2. Se nao for (ou seja, e um UUID de lead), encontrar o lead de destino e usar o status dele

```typescript
// Antes
const newStatus = over.id as LeadStatus;

// Depois
const VALID_STATUSES: LeadStatus[] = ['new', 'info_sent', 'awaiting_docs', 'docs_received', 'registered', 'inactive'];

let newStatus: LeadStatus;

// Verificar se over.id e um status valido
if (VALID_STATUSES.includes(over.id as LeadStatus)) {
  newStatus = over.id as LeadStatus;
} else {
  // over.id e um UUID de lead - encontrar o status desse lead
  const targetLead = leads.find(l => l.id === over.id);
  if (!targetLead) return;
  newStatus = targetLead.status;
}
```

---

## Problema 2: Nome do Corretor Incompleto

### Diagnostico
O `KanbanCard.tsx` mostra apenas a primeira letra do corretor no avatar, mas nao exibe o nome completo em nenhum lugar do card, dificultando identificar o corretor responsavel.

### Solucao
Adicionar o nome completo do corretor ao lado do avatar no footer do card:

```typescript
// Linha 326-337 do KanbanCard.tsx
<div className="flex items-center gap-2">
  {/* Broker avatar */}
  <Avatar className="w-5 h-5 border border-[#2a2a2e]">
    <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-700 text-white text-[9px] font-medium">
      {lead.broker?.name?.charAt(0) || "E"}
    </AvatarFallback>
  </Avatar>
  
  {/* Broker name - NOVO */}
  <span className="text-[10px] text-slate-400 max-w-[60px] truncate" title={lead.broker?.name || "Enove"}>
    {lead.broker?.name || "Enove"}
  </span>
  
  {/* Separador visual */}
  <span className="text-slate-600">|</span>

  {/* Last interaction time */}
  <div className="flex items-center gap-1 text-[10px] text-slate-500">
    <Clock className="w-3 h-3" />
    <span>{timeSinceInteraction}</span>
  </div>
</div>
```

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/components/crm/KanbanBoard.tsx` | Corrigir logica do `handleDragEnd` para lidar com drop sobre cards |
| `src/components/crm/KanbanCard.tsx` | Adicionar nome do corretor visivel no footer do card |

---

## Resultado Esperado

1. **Drag-and-drop**: Arrastar cards entre colunas funcionara corretamente, mesmo quando solto sobre outro card
2. **Nome do corretor**: O nome completo (ou truncado com tooltip) sera exibido no footer de cada card, facilitando identificar o responsavel

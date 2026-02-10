

# Desabilitar Drag nos Cards do Kanban no Mobile

## Problema
No celular, o drag-and-drop dos cards do Kanban interfere na navegacao por scroll horizontal entre as colunas, causando "falhas" visuais e uma experiencia ruim. O corretor ja possui o botao de seta (ChevronRight) para avancar o status do lead.

## Solucao

### Arquivo: `src/components/crm/KanbanCard.tsx`

1. Importar o hook `useIsMobile` de `@/hooks/use-mobile`
2. Condicionar o `useSortable` para que no mobile o card nao seja arrastavel:
   - No mobile: nao aplicar `listeners` (eventos de drag) nem `attributes` de drag
   - Trocar `cursor-grab` por `cursor-pointer` no mobile
   - Remover `active:cursor-grabbing` no mobile
3. Manter o `setNodeRef` e `transform/transition` para que o dnd-kit nao quebre (ele precisa do ref mesmo sem drag ativo)

### Arquivo: `src/components/crm/KanbanBoard.tsx`

4. Ajustar o `PointerSensor` para exigir uma distancia maior de ativacao, como camada extra de seguranca

### Verificacao dos botoes de seta

O botao ChevronRight (avancar status) ja existe no card e funciona corretamente. Atualmente, **nao existe** um botao de "voltar" (ChevronLeft) para retroceder o status. Sera mantido assim, pois retroceder status e uma acao incomum que pode ser feita pelo detalhe do lead.

---

## Secao Tecnica

### `KanbanCard.tsx` - Mudancas

```tsx
import { useIsMobile } from "@/hooks/use-mobile";

// Dentro do componente:
const isMobile = useIsMobile();

const {
  attributes,
  listeners,
  setNodeRef,
  transform,
  transition,
  isDragging
} = useSortable({ id: lead.id, disabled: isMobile });

// No div principal:
// - Remover {...attributes} e {...listeners} quando mobile
// - Trocar cursor-grab por cursor-pointer quando mobile
<div
  ref={setNodeRef}
  style={style}
  {...(isMobile ? {} : { ...attributes, ...listeners })}
  onClick={onClick}
  className={cn(
    "relative rounded-xl",
    isMobile ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
    // ... resto igual
  )}
>
```

### `KanbanBoard.tsx` - Sem mudancas necessarias
O `PointerSensor` ja tem `activationConstraint: { distance: 8 }`, que e suficiente quando combinado com a desabilitacao no card.



# Corrigir visibilidade de mensagens pausadas na Fila do WhatsApp

## Problema
Quando uma campanha é pausada, os itens da fila recebem status `paused_by_system`. A aba "Fila" filtra pendentes como `queued|scheduled|sending` e historico como `sent|failed|cancelled`, ignorando completamente os itens `paused_by_system`. Isso faz com que centenas de disparos "desaparecam" da interface.

## Solucao

### 1. QueueTab.tsx - Incluir `paused_by_system` nos pendentes

Alterar o filtro de `pendingMessages` para incluir `paused_by_system`:

```typescript
const pendingMessages = queue.filter(
  m => m.status === "queued" || m.status === "scheduled" || m.status === "sending" || m.status === "paused_by_system"
);
```

### 2. use-whatsapp-queue.ts - Incluir `paused_by_system` na contagem "Na fila"

Alterar a query de contagem de `queuedCount` para incluir `paused_by_system`:

```typescript
.in("status", ["queued", "scheduled", "paused_by_system"])
```

### 3. QueueTab.tsx - Adicionar card de "Pausados" nas metricas

Adicionar um 5o card de estatisticas para mostrar quantos itens estao pausados, separado dos agendados. Isso requer:

- Adicionar contagem separada de `paused_by_system` no hook `use-whatsapp-queue.ts`
- Exibir no componente `QueueStats` com cor amarela/laranja

### 4. use-whatsapp-queue.ts - Nova query agregada para pausados

Adicionar uma query dedicada para contar itens `paused_by_system`:

```typescript
const { data: pausedCount = 0 } = useQuery({
  queryKey: ["whatsapp-queue-count-paused", effectiveBrokerId],
  queryFn: async () => {
    // conta itens paused_by_system
  },
  refetchInterval: 30000,
});
```

E retornar no objeto `stats`:
```typescript
const stats = {
  queued: queuedCount,
  sent: sentCount,
  failed: failedCount,
  replies: repliesCount,
  paused: pausedCount,
};
```

## Detalhes tecnicos

### Arquivos a editar

1. **src/hooks/use-whatsapp-queue.ts**
   - Adicionar query `whatsapp-queue-count-paused` para contar `paused_by_system`
   - Atualizar `stats` para incluir campo `paused`
   - Invalidar nova query no canal realtime

2. **src/components/whatsapp/QueueTab.tsx**
   - Incluir `paused_by_system` no filtro de `pendingMessages`
   - Adicionar card "Pausados" no `QueueStats` com cor amarela (`text-yellow-400`)
   - Atualizar tipo de `stats` para incluir `paused`

### O que NAO muda
- Logica de pausar/retomar campanhas
- Limite de 100 itens na query principal (ja existente)
- Outras abas do WhatsApp


# Corrigir exibicao de horarios na fila de WhatsApp

## Problema
O campo `scheduled_at` dos itens pausados contem o horario original de agendamento (que ja passou), nao o horario real de envio futuro. Quando a campanha for retomada, os itens serao reagendados com novos horarios. Mostrar "16:30" como se fosse o horario de envio e incorreto -- e apenas o horario em que foram criados + delay inicial.

## Solucao

### Arquivo: `src/components/whatsapp/QueueTab.tsx`

**PendingMessageCard** - Diferenciar o que e exibido com base no status:

- Para itens `queued` / `scheduled` / `sending`: mostrar "Envio: dd/MM HH:mm" com o `scheduled_at` real
- Para itens `paused_by_system`: mostrar "Pausado - sera reagendado ao retomar" em vez do horario, pois o `scheduled_at` atual e obsoleto

Codigo proposto no card compacto (linha 120-123):
```tsx
<span className="text-xs text-slate-500 flex-shrink-0">
  {message.status === "paused_by_system" ? (
    <>
      <AlertTriangle className="w-3 h-3 inline mr-0.5 text-yellow-500" />
      Pausado
    </>
  ) : (
    <>
      <Clock className="w-3 h-3 inline mr-0.5" />
      Envio: {format(new Date(message.scheduled_at), "dd/MM HH:mm")}
    </>
  )}
</span>
```

Na area expandida, para itens nao-pausados, adicionar uma `DetailRow` com o horario completo:
```tsx
{message.status !== "paused_by_system" && (
  <DetailRow icon={Calendar} label="Envio programado" value={format(new Date(message.scheduled_at), "dd/MM/yyyy HH:mm:ss")} />
)}
{message.status === "paused_by_system" && (
  <p className="text-xs text-yellow-500">Horario sera recalculado quando a campanha for retomada</p>
)}
```

**HistoryMessageCard** - Ja mostra `sent_at` na linha compacta, que esta correto para historico. Adicionar `scheduled_at` na area expandida como referencia ("Agendado em").

**Header "Proximo envio em"** - Filtrar apenas itens nao-pausados para o countdown, pois pausados nao serao enviados ate retomar:

### Arquivo: `src/hooks/use-whatsapp-queue.ts`

Reverter a inclusao de `paused_by_system` no calculo do `nextScheduled`, pois itens pausados NAO vao ser enviados no horario atual. O countdown deve refletir apenas itens ativos:

```typescript
const nextScheduled = pendingQueue.find(
  m => (m.status === "queued" || m.status === "scheduled") && 
       new Date(m.scheduled_at) > new Date()
);
```

Se nao houver nenhum item ativo (tudo pausado), mostrar "Campanha pausada" em vez de "--:--".

Adicionar retorno de flag `allPaused`:
```typescript
const allPaused = pendingQueue.length > 0 && pendingQueue.every(m => m.status === "paused_by_system");
```

### Arquivo: `src/components/whatsapp/QueueTab.tsx` (header)

Usar `allPaused` para exibir mensagem contextual:
```tsx
{allPaused ? (
  <span className="text-yellow-400 font-medium">Campanha pausada</span>
) : (
  <span className="font-mono text-primary font-medium">
    {formatNextSendIn()}
    {nextScheduledAt && ` (${format(new Date(nextScheduledAt), "HH:mm")})`}
  </span>
)}
```

## Resumo das alteracoes

1. **`src/hooks/use-whatsapp-queue.ts`**
   - Remover `paused_by_system` do calculo do countdown (itens pausados nao serao enviados)
   - Adicionar flag `allPaused` no retorno

2. **`src/components/whatsapp/QueueTab.tsx`**
   - PendingMessageCard: mostrar "Pausado" para itens pausados, "Envio: dd/MM HH:mm" para ativos
   - Header: mostrar "Campanha pausada" quando todos itens estao pausados
   - HistoryMessageCard: manter como esta (ja mostra `sent_at`)

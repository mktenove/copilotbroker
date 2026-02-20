

# Melhorias na Fila de WhatsApp

## Problema 1: "Proximo envio em" mostra "--:--"
O hook busca a proxima mensagem com status `queued` ou `scheduled` que tenha `scheduled_at > now()`. Quando todas as mensagens estao com status `paused_by_system`, nenhuma e encontrada, e o timer mostra `--:--`. Alem disso, quando o proximo envio e encontrado, o componente mostra apenas um countdown (ex: `3:42`) sem indicar o horario absoluto.

## Problema 2: Horario programado pouco visivel nos cards
O `PendingMessageCard` ja mostra a data/hora do agendamento, mas so na linha compacta. Para mensagens pausadas, seria util ver rapidamente quando cada uma esta programada.

## Solucao

### 1. Corrigir "Proximo envio em" (`use-whatsapp-queue.ts`)

Incluir `paused_by_system` na busca do proximo agendamento, pois quando a campanha for retomada, essas mensagens serao enviadas:

```typescript
const nextScheduled = pendingQueue.find(
  m => (m.status === "queued" || m.status === "scheduled" || m.status === "paused_by_system") && 
       new Date(m.scheduled_at) > new Date()
);
```

### 2. Mostrar horario absoluto alem do countdown (`QueueTab.tsx`)

No header, alem do countdown `3:42`, mostrar tambem o horario absoluto do proximo envio, ex: `Proximo envio em: 3:42 (14:35)`. Para isso, o hook precisa expor o `scheduled_at` do proximo item.

Alterar o hook para retornar tambem `nextScheduledAt`:
```typescript
const [nextScheduledAt, setNextScheduledAt] = useState<string | null>(null);
// ...
setNextScheduledAt(nextScheduled.scheduled_at);
```

No componente, exibir:
```tsx
<span className="font-mono text-primary font-medium">
  {formatNextSendIn()}
  {nextScheduledAt && ` (${format(new Date(nextScheduledAt), "HH:mm")})`}
</span>
```

### 3. Adicionar horario programado visivel no card compacto dos pendentes

No `PendingMessageCard`, o horario ja aparece na primeira linha. Nenhuma mudanca necessaria nesse componente - ja esta correto.

### 4. Adicionar horario agendado visivel no `HistoryMessageCard` (linha compacta)

Atualmente o historico mostra `sent_at` na linha compacta. Adicionar tambem o `scheduled_at` para referencia quando o card nao esta expandido.

## Arquivos a editar

1. **`src/hooks/use-whatsapp-queue.ts`** (linhas 222-243, 291-296, 301-314)
   - Incluir `paused_by_system` no filtro do countdown
   - Adicionar estado `nextScheduledAt` e retorna-lo
   
2. **`src/components/whatsapp/QueueTab.tsx`** (linhas 311-315)
   - Exibir horario absoluto ao lado do countdown
   - Usar `nextScheduledAt` do hook


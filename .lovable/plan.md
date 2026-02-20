

# Paginação na Fila de WhatsApp

## Problema
- A query principal tem `.limit(100)`, trazendo no maximo 100 dos 600+ itens
- O historico mostra apenas 20 itens (`.slice(0, 20)`)
- Os contadores agregados estao corretos, mas a lista nao mostra todos os registros

## Solucao: Paginacao com "Carregar Mais"

### 1. Hook `use-whatsapp-queue.ts` - Paginacao

Substituir a query unica por uma abordagem paginada:

- Aumentar o limite inicial para 200
- Adicionar estado de pagina e funcao `loadMore`
- Separar queries para pendentes e historico, cada uma com seu proprio limite e offset
- Usar `useInfiniteQuery` ou manter `useQuery` com offset manual

### 2. QueueTab.tsx - Botao "Carregar Mais"

- Remover o `.slice(0, 20)` do historico
- Adicionar botao "Carregar mais" ao final de cada secao (pendentes e historico)
- Mostrar indicador de quantos itens estao carregados vs total

## Detalhes tecnicos

### Arquivo: `src/hooks/use-whatsapp-queue.ts`

**Query principal** - aumentar limite e adicionar paginacao:

```typescript
const [pendingPage, setPendingPage] = useState(0);
const [historyPage, setHistoryPage] = useState(0);
const PAGE_SIZE = 50;

// Query para pendentes (queued, scheduled, sending, paused_by_system)
const { data: pendingQueue = [] } = useQuery({
  queryKey: ["whatsapp-queue-pending", effectiveBrokerId, pendingPage],
  queryFn: async () => {
    let query = supabase
      .from("whatsapp_message_queue")
      .select(`*, lead:leads(id, name), campaign:whatsapp_campaigns(id, name)`)
      .in("status", ["queued", "scheduled", "sending", "paused_by_system"])
      .order("scheduled_at", { ascending: true })
      .range(0, (pendingPage + 1) * PAGE_SIZE - 1);
    if (effectiveBrokerId) query = query.eq("broker_id", effectiveBrokerId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
});

// Query para historico (sent, failed, cancelled)
const { data: historyQueue = [] } = useQuery({
  queryKey: ["whatsapp-queue-history", effectiveBrokerId, historyPage],
  queryFn: async () => {
    let query = supabase
      .from("whatsapp_message_queue")
      .select(`*, lead:leads(id, name), campaign:whatsapp_campaigns(id, name)`)
      .in("status", ["sent", "failed", "cancelled"])
      .order("sent_at", { ascending: false })
      .range(0, (historyPage + 1) * PAGE_SIZE - 1);
    if (effectiveBrokerId) query = query.eq("broker_id", effectiveBrokerId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
});
```

Retornar novas funcoes e dados:
```typescript
return {
  pendingQueue,
  historyQueue,
  stats,
  isLoading,
  loadMorePending: () => setPendingPage(p => p + 1),
  loadMoreHistory: () => setHistoryPage(p => p + 1),
  hasMorePending: pendingQueue.length === (pendingPage + 1) * PAGE_SIZE,
  hasMoreHistory: historyQueue.length === (historyPage + 1) * PAGE_SIZE,
  // ... resto
};
```

### Arquivo: `src/components/whatsapp/QueueTab.tsx`

- Usar `pendingQueue` e `historyQueue` separados em vez de filtrar `queue`
- Remover `.slice(0, 20)` do historico
- Adicionar botao "Carregar mais" em cada secao:

```tsx
{hasMorePending && (
  <Button variant="ghost" onClick={loadMorePending} className="w-full">
    Carregar mais pendentes...
  </Button>
)}
```

- Atualizar contadores de secao para usar os totais das stats agregadas:
  - "Pendentes (566)" usando `stats.queued`
  - "Historico (67)" usando `stats.sent + stats.failed`

### Subscricao Realtime

Atualizar a invalidacao do realtime para incluir as novas query keys:
```typescript
queryClient.invalidateQueries({ queryKey: ["whatsapp-queue-pending"] });
queryClient.invalidateQueries({ queryKey: ["whatsapp-queue-history"] });
```

### O que muda
- Lista de pendentes mostra 50 por pagina com botao para carregar mais
- Lista de historico mostra 50 por pagina com botao para carregar mais
- Contadores de secao usam os totais reais do banco
- Performance melhor ao separar pendentes de historico

### O que NAO muda
- Stats agregadas (Na fila, Pausados, Enviados, Falhas, Respostas)
- Logica de cancelar/reagendar mensagens
- Timer de proximo envio

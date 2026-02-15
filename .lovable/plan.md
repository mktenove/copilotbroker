
# Atualizar timeline automaticamente com Realtime

## Problema
A timeline do lead so atualiza quando a pagina e recarregada manualmente. Interacoes adicionadas por outros usuarios (ou pelo sistema, como roleta/timeout) nao aparecem em tempo real.

## Solucao
Adicionar uma subscription Realtime na tabela `lead_interactions` dentro do hook `use-lead-interactions.ts`, filtrando pelo `lead_id`. Quando uma nova interacao e inserida, ela e adicionada automaticamente ao estado local.

## Alteracoes

### Arquivo 1: Habilitar Realtime na tabela `lead_interactions`
- Migracao SQL: `ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_interactions;`

### Arquivo 2: `src/hooks/use-lead-interactions.ts`
- Adicionar um `useEffect` com subscription Realtime no canal `lead_interactions` filtrado por `lead_id`
- Ao receber evento `INSERT`, adicionar a nova interacao no inicio da lista (se nao existir ja)
- Ao receber evento `DELETE`, remover do estado local
- Cleanup: remover o channel no return do useEffect

### Detalhe tecnico

```typescript
useEffect(() => {
  if (!leadId) return;

  const channel = supabase
    .channel(`lead-interactions-${leadId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "lead_interactions",
        filter: `lead_id=eq.${leadId}`,
      },
      (payload) => {
        const newInteraction = payload.new as unknown as LeadInteraction;
        setInteractions((prev) => {
          if (prev.some((i) => i.id === newInteraction.id)) return prev;
          return [newInteraction, ...prev];
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [leadId]);
```

Alteracao minima: uma migracao de 1 linha + um useEffect adicional no hook existente.

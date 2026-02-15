

# Substituir botao Atualizar por atualizacao em tempo real

## Problema
Na view de lista do painel do corretor, existe um botao "Atualizar" que o usuario precisa clicar manualmente para ver novos leads ou mudancas. Isso nao e ideal -- o Kanban ja usa Realtime, mas a lista nao.

## Solucao
1. Adicionar uma subscription Realtime na tabela `leads` filtrada pelo `broker_id` do corretor, dentro do `BrokerAdmin.tsx`.
2. Quando qualquer INSERT, UPDATE ou DELETE acontecer nos leads do corretor, a lista sera atualizada automaticamente via `fetchLeads()`.
3. Remover o botao "Atualizar" e manter apenas o botao "Importar CSV".

## Alteracoes

**Arquivo:** `src/pages/BrokerAdmin.tsx`

1. **Adicionar subscription Realtime** -- novo `useEffect` que escuta mudancas na tabela `leads` filtradas por `broker_id`:

```typescript
useEffect(() => {
  if (!brokerId) return;

  const channel = supabase
    .channel(`broker-leads-${brokerId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'leads',
        filter: `broker_id=eq.${brokerId}`,
      },
      () => {
        fetchLeads();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [brokerId]);
```

2. **Remover o botao "Atualizar"** (linhas 177-184) e ajustar o layout do botao "Importar CSV" para ocupar o espaco de forma adequada.

3. **Remover import do `RefreshCw`** (manter apenas para o loading spinner inicial) ou substituir o spinner inicial por um componente Skeleton/Loader mais limpo.

## Resultado
- A lista de leads atualiza sozinha em tempo real, sem necessidade de clicar em nenhum botao.
- O Kanban ja funciona assim; agora ambas as views terao o mesmo comportamento.

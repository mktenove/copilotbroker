
# Correção: Kanban em Tempo Real para Reassignação de Leads

## Problema
Quando o timeout da roleta redistribui um lead para outro corretor, o corretor anterior continua vendo o lead no seu Kanban até dar refresh manual. Isso acontece porque o Kanban não escuta mudanças em tempo real no banco de dados.

## Solução
Ativar o **Realtime** na tabela `leads` e adicionar um listener no hook `useKanbanLeads` para que, quando o `broker_id` de um lead mudar (reassignação), o Kanban se atualize automaticamente.

## O que vai acontecer na prática
- Quando um lead for reassignado (timeout ou manual), ele **desaparece automaticamente** do Kanban do corretor anterior
- O lead **aparece automaticamente** no Kanban do novo corretor
- Sem necessidade de refresh manual

---

## Detalhes Técnicos

### 1. Migração: Habilitar Realtime na tabela `leads`
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
```

### 2. Atualizar `useKanbanLeads` com subscription Realtime
Adicionar um `useEffect` que escuta eventos `UPDATE` na tabela `leads` via canal Realtime:

- **Quando `broker_id` muda** (reassignação): remover o lead do state local se não pertence mais ao corretor atual, ou adicionar se agora pertence
- **Quando `status` muda para `inactive`**: remover do state local
- **Outros updates**: atualizar o lead no state local

A lógica será:
- Para corretores: se o `broker_id` do lead mudou e não é mais o broker logado, o lead é removido da lista
- Para admins: qualquer update é refletido no state local

### 3. Cleanup
O canal Realtime será desconectado automaticamente quando o componente desmontar (cleanup no `useEffect`).

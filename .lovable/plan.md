
# Correção: Contador de respostas e Realtime na aba Fila

## Problemas encontrados

### 1. Respostas sempre mostra 0 (hardcoded)
Na linha 64 do `use-whatsapp-queue.ts`, o contador de respostas esta fixo em zero:
```
replies: 0, // This would come from a separate table or campaign stats
```
A tabela `whatsapp_lead_replies` ja tem 6 registros, mas o hook nunca consulta essa tabela.

### 2. Sem Realtime nas tabelas de WhatsApp
As tabelas `whatsapp_message_queue` e `whatsapp_lead_replies` nao estao na publicacao `supabase_realtime`. Atualmente so `leads`, `lead_interactions`, `notifications` e `propostas` tem Realtime ativo. Isso significa que mudancas feitas pelo webhook (novas respostas, cancelamentos de follow-up) so aparecem no proximo polling de 30 segundos.

## Correcoes propostas

### 1. Migration SQL: Habilitar Realtime
Adicionar as tabelas `whatsapp_message_queue` e `whatsapp_lead_replies` a publicacao Realtime:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_message_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_lead_replies;
```

### 2. Atualizar `use-whatsapp-queue.ts`
- Buscar contagem real de respostas da tabela `whatsapp_lead_replies`, filtrando pelas campanhas do broker
- Adicionar subscricao Realtime na `whatsapp_message_queue` para invalidar o cache do React Query automaticamente quando mensagens mudarem de status
- Adicionar subscricao Realtime na `whatsapp_lead_replies` para atualizar o contador de respostas instantaneamente

### 3. Logica de contagem de respostas
Buscar as campanhas do broker e contar quantas respostas unicas existem na `whatsapp_lead_replies` para essas campanhas. Isso substitui o `replies: 0` hardcoded.

## Arquivos afetados

| Acao | Arquivo |
|------|---------|
| Migration SQL | Habilitar Realtime para `whatsapp_message_queue` e `whatsapp_lead_replies` |
| Editar | `src/hooks/use-whatsapp-queue.ts` (query de replies + subscricoes Realtime) |

## Resultado esperado

- O card "Respostas" mostrara o numero real de respostas recebidas
- Qualquer mudanca na fila (envio, cancelamento, falha) aparecera instantaneamente sem esperar 30 segundos
- Novas respostas detectadas pelo webhook incrementarao o contador em tempo real

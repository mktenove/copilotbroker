

## Corrigir busca de leads na criacao de campanhas

### Problema
A query `fetchLeadsByStatus` no hook `use-whatsapp-campaigns.ts` usa `broker:brokers(id, name)` sem especificar qual chave estrangeira utilizar. Como a tabela `leads` possui duas chaves estrangeiras para `brokers` (`broker_id` e `corretor_atribuido_id`), o PostgREST retorna um erro HTTP 300 (ambiguidade), fazendo a query falhar silenciosamente e retornar 0 leads.

O Kanban funciona corretamente porque usa a sintaxe correta: `broker:brokers!leads_broker_id_fkey(id, name, slug)`.

### Solucao
Corrigir a query para especificar explicitamente a foreign key, seguindo o mesmo padrao ja usado no Kanban.

### Detalhes tecnicos

**Arquivo: `src/hooks/use-whatsapp-campaigns.ts`**

Linha 114 - Alterar:
```text
broker:brokers(id, name)
```
Para:
```text
broker:brokers!leads_broker_id_fkey(id, name)
```

Essa e a unica mudanca necessaria. Nenhuma migracao de banco necessaria.


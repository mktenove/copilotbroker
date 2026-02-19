

# Corrigir aviso de 48h sem interacao (contorno vermelho)

## Problema

O contorno vermelho de "48h sem interacao" usa o campo `last_interaction_at` do lead para calcular se esta "stale". No banco de dados, esse campo e atualizado corretamente por um **trigger** que dispara sempre que uma nova interacao e inserida na tabela `lead_interactions`.

Porem, no frontend, as atualizacoes otimistas (quando o corretor faz qualquer acao no lead) atualizam apenas o campo `updated_at` no estado local, mas **nunca atualizam `last_interaction_at`**. Como o calculo do `isStale` depende exclusivamente de `last_interaction_at`, o contorno vermelho so desaparece quando o Kanban recarrega os dados do banco — o que acontece apenas em eventos especificos de realtime (mudanca de status, reatribuicao).

## Solucao

Atualizar o estado local do lead com `last_interaction_at = now()` em todas as funcoes que inserem interacoes no banco. Isso garante que o calculo `isStale` reflita imediatamente a acao do usuario, sem precisar esperar um refetch.

## Alteracoes

### `src/hooks/use-kanban-leads.ts`

Nas funcoes que inserem `lead_interactions` e fazem update otimista local, incluir `last_interaction_at` no objeto atualizado:

1. **`updateLeadStatus`** (linha ~186): adicionar `last_interaction_at` ao `setLeads` otimista
2. **`updateLead`** (linha ~254): adicionar `last_interaction_at` ao `setLeads` otimista quando ha log de interacao (origin_change, inactivation)
3. **`iniciarAtendimento`** e demais metodos do funil (`registrarAgendamento`, `registrarComparecimento`, `confirmarVenda`, etc.): garantir que o update otimista inclua `last_interaction_at`

### Detalhes tecnicos

Em cada funcao que faz `setLeads(prev => prev.map(...))`, o spread do lead atualizado passara a incluir:

```typescript
last_interaction_at: new Date().toISOString()
```

Exemplo para `updateLeadStatus`:

```diff
 setLeads(prev => prev.map(lead => 
   lead.id === leadId 
-    ? { ...lead, status: newStatus, updated_at: new Date().toISOString() }
+    ? { ...lead, status: newStatus, updated_at: new Date().toISOString(), last_interaction_at: new Date().toISOString() }
     : lead
 ));
```

O mesmo padrao sera aplicado em todas as funcoes de transicao do funil que inserem interacoes.

Nenhuma alteracao de banco de dados e necessaria — o trigger existente ja atualiza `last_interaction_at` corretamente no DB.


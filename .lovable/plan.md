

# Corrigir loop de timeout e registrar transferencias na timeline

## Problemas identificados

### 1. Lead inativo circulando em loop
O lead "Gabriel Costa" foi inativado em 15/02, mas continua sendo redistribuido por timeout a cada ~20 minutos entre Edinardo e Samyra (unicos corretores online). A funcao `roleta-timeout` nao verifica o status do lead antes de redistribuir.

### 2. Timeout nao registra na timeline do lead
A funcao `roleta-timeout` grava apenas em `roletas_log`, mas nao insere em `lead_interactions`. Resultado: transferencias automaticas por timeout sao invisiveis na timeline do lead dentro do CRM.

### 3. Distribuicao inicial tambem nao registra na timeline
A funcao `roleta-distribuir` tambem nao insere em `lead_interactions`, entao a atribuicao inicial via roleta tambem nao aparece na timeline.

## Solucao

### Alteracao 1: `supabase/functions/roleta-timeout/index.ts`

**A) Filtrar leads inativos** -- adicionar `.neq("status", "inactive")` na query de leads expirados (linha 22-25), evitando que leads inativos ou vendidos entrem no loop de timeout.

**B) Registrar na timeline** -- apos o log em `roletas_log`, inserir tambem em `lead_interactions` com `interaction_type: 'roleta_timeout'`:

```typescript
await supabase.from("lead_interactions").insert({
  lead_id: lead.id,
  interaction_type: "roleta_timeout",
  notes: `Timeout de ${roleta.tempo_reserva_minutos}min. Transferido de ${deCorretorName} para ${paraCorretorName}.`,
});
```

### Alteracao 2: `supabase/functions/roleta-distribuir/index.ts`

**Registrar atribuicao inicial na timeline** -- apos o log em `roletas_log`, inserir em `lead_interactions` com `interaction_type: 'roleta_atribuicao'`:

```typescript
await supabase.from("lead_interactions").insert({
  lead_id: lead_id,
  interaction_type: "roleta_atribuicao",
  notes: `Atribuido via roleta para ${brokerName}. ${motivo}`,
});
```

### Alteracao 3: Corrigir o lead preso no loop

Executar uma query para limpar o status de distribuicao do lead "Gabriel Costa" que ja esta inativo mas continua circulando:

```sql
UPDATE leads
SET status_distribuicao = NULL, reserva_expira_em = NULL
WHERE id = 'e2405d3f-0d74-4548-985b-4b6fb4ad5762';
```

## Resumo

| Arquivo / Acao | Alteracao |
|----------------|-----------|
| `roleta-timeout/index.ts` | Filtrar leads inativos/vendidos; inserir em `lead_interactions` |
| `roleta-distribuir/index.ts` | Inserir em `lead_interactions` na atribuicao inicial |
| Query pontual | Limpar `reserva_expira_em` do lead preso no loop |

## Resultado esperado
- Leads inativos/vendidos nao serao mais redistribuidos por timeout
- Cada transferencia por timeout aparecera na timeline do lead com detalhes de quem transferiu para quem
- Cada atribuicao inicial via roleta tambem aparecera na timeline
- O lead "Gabriel Costa" parara de circular imediatamente


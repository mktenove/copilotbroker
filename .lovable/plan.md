

## Visibilidade de membros online e proximo da fila para corretores

### Objetivo

Permitir que cada corretor veja, dentro de cada roleta em que participa, todos os membros da fila com seu status (online/offline) e quem e o proximo a receber um lead.

### Mudancas

**Arquivo: `src/components/broker/BrokerRoletas.tsx`**

1. Apos buscar os dados do membro logado (`roletas_membros` filtrado por `corretor_id`), fazer uma segunda query para cada `roleta_id` buscando **todos os membros ativos** daquela roleta, incluindo o nome do corretor:
   ```
   roletas_membros(*, corretor:brokers(id, name))
   WHERE roleta_id = X AND ativo = true
   ORDER BY ordem ASC
   ```
2. Buscar tambem os dados da roleta principal (campo `ultimo_membro_ordem_atribuida`) para calcular quem e o proximo
3. Adicionar uma secao colapsavel (ou sempre visivel) abaixo de cada card de roleta mostrando a lista de membros:
   - Indicador verde/cinza ao lado do nome (online/offline)
   - Badge "Proximo" no corretor que sera o proximo a receber lead (baseado em `ultimo_membro_ordem_atribuida + 1`, considerando apenas membros com check-in ativo)
   - Destacar o proprio corretor logado na lista (ex: nome em negrito ou badge "Voce")
4. Adicionar Realtime subscription na tabela `roletas_membros` para atualizar automaticamente quando alguem faz check-in/check-out

### Layout atualizado de cada card

```text
+--------------------------------------------+
| Roleta GoldenView              [Check-out] |
| Ordem: 2 | 10min reserva                   |
|                                             |
| Fila da Roleta (3/5 online)                |
| +----------------------------------------+ |
| | #1  * Joao Silva                       | |
| | #2  * Voce              [Proximo]      | |
| | #3  o Maria Santos                     | |
| | #4  * Pedro Lima                       | |
| | #5  o Ana Costa                        | |
| +----------------------------------------+ |
|  * = online   o = offline                   |
+--------------------------------------------+
```

### Detalhes tecnicos

- A query de membros usara a relacao `corretor:brokers(id, name)` que ja existe no schema
- O calculo de "proximo" segue a mesma logica do admin: `ordem === ultimo_membro_ordem_atribuida + 1` (com wrap-around para o primeiro membro quando o ultimo da lista ja foi atribuido), considerando apenas membros com `status_checkin = true`
- Para Realtime, usar `supabase.channel('roleta-membros-ROLETA_ID').on('postgres_changes', ...)` filtrando por `roleta_id`
- As RLS policies ja permitem que corretores vejam membros das suas roletas (`roleta_id IN get_my_roleta_ids()`)
- Nenhuma migracao de banco necessaria


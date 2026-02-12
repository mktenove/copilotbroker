

## Corrigir contagem de leads em "Nova Campanha" (admin e corretores)

### Problema identificado
O usuario ve 26 leads com status "info_sent" no Kanban, porem ao criar uma campanha, aparece "0 leads selecionados".

A causa raiz: o usuario tem papel de **admin** (e possivelmente tambem broker). A politica RLS de admin permite ver **todos** os leads no Kanban. Porem, no hook `use-whatsapp-campaigns.ts`, a funcao `fetchLeadsByStatus` aplica um filtro a nivel de aplicacao `.eq("broker_id", broker.id)`, limitando os resultados apenas aos leads do proprio corretor -- ou retornando zero se o admin nao tiver registro de corretor.

Em resumo: o Kanban mostra os leads via RLS (admin ve tudo), mas a campanha filtra por `broker_id` no codigo, gerando a inconsistencia.

### Solucao
Tornar o hook `use-whatsapp-campaigns` consciente do papel do usuario. Se for **admin**, nao filtrar por `broker_id` nas queries de leads, campanhas e criacao. Se for **broker**, manter o filtro atual.

### Detalhes tecnicos

**Arquivo: `src/hooks/use-whatsapp-campaigns.ts`**

1. Importar e usar `useUserRole` para obter `role` e `brokerId`
2. Na query `current-broker`: manter como esta (retorna dados do broker se existir)
3. Na funcao `fetchLeadsByStatus` (linha 93-117):
   - Remover o guard `if (!broker?.id) return []` para admins
   - Se `role === "admin"`: nao aplicar `.eq("broker_id", broker.id)`, permitindo ver todos os leads
   - Se `role !== "admin"`: manter o filtro `.eq("broker_id", broker.id)`
4. Na query de campanhas (linhas 52-71): se admin, nao filtrar por `broker_id`
5. Na criacao de campanha: se admin, tornar `broker_id` opcional (usar o broker_id se existir, senao criar sem)

**Mudanca principal:**

```text
// fetchLeadsByStatus - ANTES:
if (!broker?.id) return [];
query.eq("broker_id", broker.id);  // sempre filtra

// fetchLeadsByStatus - DEPOIS:
if (role !== "admin" && !broker?.id) return [];
if (role !== "admin" && broker?.id) {
  query.eq("broker_id", broker.id);  // so filtra se nao for admin
}
```

**Nenhuma migracao de banco necessaria** -- as RLS policies de admin ja permitem SELECT em leads, campaigns, templates e queue.


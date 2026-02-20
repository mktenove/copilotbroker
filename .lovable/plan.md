
# Corrigir contador de respostas (mostrando "0")

## Problema
Dois problemas no contador de respostas:

1. **RLS bloqueando acesso**: A tabela `whatsapp_lead_replies` tem RLS ativado mas **nenhuma policy configurada**, o que significa que nenhum usuario consegue ler os dados. Resultado: sempre retorna 0.

2. **Contagem duplicada**: A query atual conta todas as linhas da tabela (`count: "exact"`), mas o usuario quer contar **leads unicos que responderam** (por telefone), nao o total de respostas. No banco existem 93 registros mas apenas 74 telefones unicos.

## Solucao

### 1. Criar RLS policy na tabela `whatsapp_lead_replies`

Adicionar policy para que corretores e admins possam ler os dados:

```sql
CREATE POLICY "Corretores e admins podem ver respostas"
  ON whatsapp_lead_replies FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM whatsapp_campaigns
      WHERE broker_id = (SELECT id FROM brokers WHERE user_id = auth.uid())
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );
```

### 2. Alterar query para contar leads unicos (`use-whatsapp-queue.ts`)

Substituir a contagem simples por uma que agrupa por telefone (leads unicos):

```typescript
// Em vez de count total de linhas, buscar phones distintos
const { data: replies, error } = await supabase
  .from("whatsapp_lead_replies")
  .select("phone")
  .in("campaign_id", campaignIds);

if (error) throw error;
// Contar telefones unicos
const uniquePhones = new Set(replies?.map(r => r.phone) || []);
return uniquePhones.size;
```

### 3. Atualizar label do card (QueueTab.tsx)

Alterar o texto de "Respostas" para "Leads responderam" para deixar claro que sao leads unicos.

## Arquivos a editar

1. **Migracao SQL** - Criar RLS policy para `whatsapp_lead_replies`
2. **`src/hooks/use-whatsapp-queue.ts`** (linhas 152-176) - Alterar query de contagem para telefones unicos
3. **`src/components/whatsapp/QueueTab.tsx`** (linha 103) - Alterar label de "Respostas" para "Responderam"

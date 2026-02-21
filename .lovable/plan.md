

# Corrigir mensagens duplicadas em campanhas WhatsApp

## Problema identificado

Leads duplicados com o mesmo telefone no banco de dados estao causando envio duplo de mensagens. Quando uma campanha e criada, o sistema seleciona leads por status/projeto e agenda mensagens para **cada lead individualmente**. Se existem dois leads com o mesmo WhatsApp (ex: "Cris Bezzi" aparece 2x com `5551991237442`), o cliente recebe a mesma mensagem duas vezes.

Dados reais encontrados:
- Campanha do Edinardo: 2 telefones duplicados (Cris Bezzi e Jardelino Lassakosky), cada um recebendo todas as etapas em dobro
- Campanha do Gabriel (Marcio): 1 telefone duplicado (`+5511947337765`)

## Causa raiz

Nao ha deduplicacao por telefone em nenhum dos dois pontos criticos:
1. **Na criacao da campanha** (`use-whatsapp-campaigns.ts`): todos os leads sao enfileirados sem verificar telefones repetidos
2. **No envio** (`whatsapp-message-sender`): a deduplicacao existente (linhas 440-468) so funciona para mensagens **sem** `step_number` — campanhas com steps sao ignoradas propositalmente

## Solucao

Aplicar deduplicacao por telefone em **dois niveis** para garantia total:

### 1. Na criacao da campanha (prevencao)

**Arquivo:** `src/hooks/use-whatsapp-campaigns.ts`

Apos filtrar opt-outs e telefones invalidos (`validLeads`), deduplicar por telefone normalizado, mantendo apenas o primeiro lead de cada numero:

```typescript
// Deduplicate by phone - keep first lead per phone number
const seenPhones = new Set<string>();
const uniqueLeads = validLeads.filter(lead => {
  const phone = formatPhoneE164(lead.whatsapp);
  if (seenPhones.has(phone)) return false;
  seenPhones.add(phone);
  return true;
});
```

Usar `uniqueLeads` no lugar de `validLeads` para calcular `totalMessages` e gerar os `queueItems`.

### 2. No envio (seguranca adicional)

**Arquivo:** `supabase/functions/whatsapp-message-sender/index.ts`

Adicionar verificacao de deduplicacao para mensagens de campanha (com `step_number`). Antes de enviar, checar se ja existe uma mensagem `sent` para o mesmo telefone + campanha + step:

```typescript
// DEDUP for campaign messages: same phone + campaign + step already sent
if (queueMsg.campaign_id && stepNumber) {
  const { data: alreadySent } = await supabase
    .from("whatsapp_message_queue")
    .select("id")
    .eq("phone", queueMsg.phone)
    .eq("campaign_id", queueMsg.campaign_id)
    .eq("step_number", stepNumber)
    .eq("status", "sent")
    .neq("id", queueMsg.id)
    .maybeSingle();

  if (alreadySent) {
    await supabase
      .from("whatsapp_message_queue")
      .update({
        status: "cancelled",
        error_message: "Deduplicacao: mesmo telefone ja recebeu este step",
        updated_at: new Date().toISOString()
      })
      .eq("id", queueMsg.id);

    console.log(`Dedup campaign: phone ${queueMsg.phone} already received step ${stepNumber}`);
    continue;
  }
}
```

Inserir este bloco logo apos o check de deduplicacao existente (apos linha ~468), antes do "Mark as sending".

### 3. Na cadencia automatica (prevencao)

**Arquivo:** `supabase/functions/auto-cadencia-10d/index.ts`

Adicionar verificacao se ja existe campanha ativa para o mesmo telefone antes de criar nova cadencia.

## Resumo de arquivos

| Arquivo | Alteracao |
|---|---|
| `src/hooks/use-whatsapp-campaigns.ts` | Deduplicar leads por telefone antes de enfileirar |
| `supabase/functions/whatsapp-message-sender/index.ts` | Dedup por phone+campaign+step antes de enviar |

## Resultado esperado

- Clientes com leads duplicados nao receberao mais mensagens repetidas
- A deduplicacao na criacao previne o problema na origem
- A deduplicacao no envio garante seguranca mesmo para campanhas ja criadas com duplicatas


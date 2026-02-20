

# Mover leads para "Atendimento" ao enviar 1a mensagem de campanha

## Problema
Quando o Edinardo cria uma campanha e a primeira mensagem e enviada (ex: lead Frederico Pause), o lead permanece na coluna "Pre Atendimento" (status `new`). O sistema deveria mover automaticamente para "Atendimento" (status `info_sent`), como ja acontece com a Cadencia 10D automatica.

## Causa raiz
No arquivo `supabase/functions/whatsapp-message-sender/index.ts`, apos o envio bem-sucedido de uma mensagem, o sistema:
- Registra a interacao na timeline (OK)
- Atualiza contadores (OK)
- Atualiza stats da campanha (OK)
- **NAO atualiza o status do lead** (BUG)

## Solucao

### Arquivo: `supabase/functions/whatsapp-message-sender/index.ts`

Apos o envio bem-sucedido de uma mensagem de campanha (step 1), verificar se o lead ainda esta no status `new` e, se sim, mover para `info_sent`. Tambem atualizar `status_distribuicao` para `atendimento_iniciado` e limpar `reserva_expira_em`, mantendo paridade com o comportamento da cadencia automatica.

Inserir o seguinte bloco logo apos o registro da interacao (apos linha ~530), dentro do `if (queueMsg.lead_id)`:

```typescript
// Move lead to "Atendimento" if still in "new" status (step 1 of campaign)
if (queueMsg.campaign_id && (!stepNumber || stepNumber === 1)) {
  const { data: currentLead } = await supabase
    .from("leads")
    .select("status")
    .eq("id", queueMsg.lead_id)
    .single();

  if (currentLead && currentLead.status === "new") {
    await supabase
      .from("leads")
      .update({
        status: "info_sent",
        status_distribuicao: "atendimento_iniciado",
        atendimento_iniciado_em: new Date().toISOString(),
        reserva_expira_em: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", queueMsg.lead_id);

    // Log the status change
    await supabase
      .from("lead_interactions")
      .insert({
        lead_id: queueMsg.lead_id,
        broker_id: instance.broker_id,
        interaction_type: "status_change",
        old_status: "new",
        new_status: "info_sent",
        notes: "Lead movido para Atendimento automaticamente apos envio da 1a mensagem da campanha",
      });

    console.log(`Lead ${queueMsg.lead_id} moved to info_sent after campaign step 1`);
  }
}
```

## Por que so no step 1?

- Step 1 e o primeiro contato com o lead, equivalente ao "Iniciar Atendimento"
- Steps 2, 3, etc. sao follow-ups e nao devem alterar o status novamente
- Se o lead ja foi movido manualmente para outro status (ex: `scheduling`), o sistema nao sobrescreve

## Resumo

- **1 arquivo editado**: `supabase/functions/whatsapp-message-sender/index.ts`
- **Logica**: Apos envio do step 1, se lead.status == "new", mover para "info_sent"
- **Paridade**: Mesmo comportamento da cadencia automatica (`auto-cadencia-10d`)


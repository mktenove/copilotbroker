

# Corrigir indicador de cadencia ativa apos resposta do lead

## Problema Identificado

Quando o lead responde e o webhook cancela os envios futuros, o fluxo atual e:

1. O webhook (`whatsapp-webhook`) cancela as mensagens individuais na `whatsapp_message_queue` onde `send_if_replied = false`
2. O webhook incrementa o `reply_count` na campanha
3. **Mas o webhook NUNCA atualiza o `status` da campanha** de `"running"` para `"completed"` ou `"cancelled"`

O Kanban busca leads com cadencia ativa usando:
```
whatsapp_campaigns.status = "running" AND lead_id IS NOT NULL
```

E o hook `useCadenciaAtiva` (pagina do lead) faz a mesma consulta. Como a campanha permanece `"running"`, ambos continuam exibindo o indicador verde mesmo apos todas as mensagens terem sido canceladas.

## Solucao

Apos cancelar os follow-ups de uma campanha no webhook, verificar se restam mensagens pendentes (`scheduled`/`queued`) naquela campanha. Se nao restar nenhuma, atualizar o status da campanha para `"completed"`.

## Alteracao

### `supabase/functions/whatsapp-webhook/index.ts`

Adicionar logica apos o cancelamento de follow-ups (depois da linha 242) para cada campanha:

```typescript
// After cancelling follow-ups, check if campaign has remaining scheduled messages
for (const campaignId of campaignIds) {
  const { count } = await supabase
    .from("whatsapp_message_queue")
    .select("*", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .in("status", ["scheduled", "queued"]);

  if (count === 0) {
    await supabase
      .from("whatsapp_campaigns")
      .update({ 
        status: "completed", 
        completed_at: new Date().toISOString() 
      })
      .eq("id", campaignId)
      .eq("status", "running");
    
    console.log(`Campaign ${campaignId} completed (no remaining messages)`);
  }
}
```

Isso garante que:
- O Kanban para de exibir o contorno verde imediatamente (via realtime subscription que ja existe na tabela `whatsapp_campaigns`)
- A pagina do lead (`useCadenciaAtiva`) tambem reflete o estado correto
- Campanhas onde todas as etapas ja foram enviadas tambem sao corretamente finalizadas
- Campanhas que ainda tem etapas com `send_if_replied = true` permanecem `"running"` corretamente

Nenhuma alteracao de banco de dados ou frontend e necessaria -- os componentes ja escutam mudancas na tabela `whatsapp_campaigns` via realtime e invalidam o cache automaticamente.


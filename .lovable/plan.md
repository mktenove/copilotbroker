

## Plano: Sincronizar mensagens de Cadência/Follow-up com o Chat do Inbox

### Problema
Quando o `whatsapp-message-sender` envia mensagens da fila (cadência 10D, follow-up, campanhas, 1ª mensagem automática), ele registra apenas em `lead_interactions`. Não insere nada em `conversation_messages`, por isso essas mensagens nunca aparecem no chat do Inbox.

O `inbox-send-message` (mensagens manuais do corretor) e o `whatsapp-webhook` (mensagens recebidas) já fazem esse registro corretamente.

### Solução
Adicionar no `whatsapp-message-sender`, logo após o envio bem-sucedido (linha ~518-562), uma etapa que:

1. **Busca a conversa** do lead/broker pelo `phone` normalizado na tabela `conversations`
2. **Insere em `conversation_messages`** com `direction: "outbound"`, `sent_by: "ai"`, o conteúdo da mensagem e o `uazapi_message_id`
3. **Atualiza o preview da conversa** (`last_message_at`, `last_message_preview`, `last_message_direction`)

Se não existir uma conversa para aquele broker+phone, o sistema **cria automaticamente** uma nova conversa (isso garante que mesmo leads sem conversa prévia passem a ter histórico).

### Mudança técnica

#### `supabase/functions/whatsapp-message-sender/index.ts`
Após o bloco de sucesso do envio (~linha 518), adicionar:

```typescript
// Sync to conversation_messages (Inbox)
try {
  const phoneNorm = formatPhoneForUAZAPI(queueMsg.phone);
  
  // Find or create conversation
  let { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("broker_id", instance.broker_id)
    .eq("phone_normalized", phoneNorm)
    .maybeSingle();

  if (!conv) {
    const { data: newConv } = await supabase
      .from("conversations")
      .insert({
        broker_id: instance.broker_id,
        lead_id: queueMsg.lead_id,
        phone: queueMsg.phone,
        phone_normalized: phoneNorm,
        status: "active",
        ai_mode: "ai_active",
      })
      .select("id")
      .single();
    conv = newConv;
  }

  if (conv) {
    // Insert outbound message
    await supabase.from("conversation_messages").insert({
      conversation_id: conv.id,
      direction: "outbound",
      content: queueMsg.message,
      sent_by: "ai",
      message_type: "text",
      status: "sent",
      uazapi_message_id: sendResult.messageId || null,
    });

    // Update conversation preview
    await supabase.from("conversations").update({
      last_message_at: new Date().toISOString(),
      last_message_preview: queueMsg.message.substring(0, 100),
      last_message_direction: "outbound",
      updated_at: new Date().toISOString(),
    }).eq("id", conv.id);
  }
} catch (syncErr) {
  console.warn("Falha ao sincronizar com inbox:", syncErr);
  // Não bloqueia o fluxo principal
}
```

### O que NÃO muda
- Nenhuma tabela nova ou migração necessária
- O fluxo de envio existente permanece intacto (o sync é wrapped em try/catch)
- `lead_interactions` continua sendo registrado normalmente (auditoria)
- O realtime do Inbox (`conversation_messages`) já está configurado e vai captar as novas inserções automaticamente

### Resultado
Mensagens de cadência, follow-up e 1ª mensagem automática aparecerão no chat do Inbox em tempo real, marcadas com o indicador "Copiloto" (ícone de bot), pois `sent_by: "ai"`.


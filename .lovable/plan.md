

## Correcao definitiva: formato do payload UAZAPI v2

### Causa raiz

O webhook recebe os dados da UAZAPI corretamente (os logs confirmam "Webhook received" com todo o payload), porem o codigo **nao consegue interpretar o formato real** porque foi escrito para um formato diferente. Resultado: toda mensagem recebida cai no handler "Unknown event" e nunca processa respostas.

### Mapeamento real dos campos (confirmado via logs de producao)

```text
Codigo atual (ERRADO)          →  Formato real UAZAPI v2
─────────────────────────────────────────────────────────
payload.event                  →  payload.EventType
payload.instance               →  payload.instanceName
payload.messages (array)       →  payload.message (objeto unico)
msg.key.fromMe                 →  payload.message.fromMe
msg.key.remoteJid              →  payload.message.chatid
msg.message.conversation       →  payload.message.text
msg.message.extendedTextMessage→  (nao existe, usar .text)
```

### O que sera alterado

**Arquivo: `supabase/functions/whatsapp-webhook/index.ts`** - reescrita da logica de parsing

1. **Extrair EventType corretamente**: usar `payload.EventType` em vez de `payload.event`
2. **Extrair instanceName corretamente**: usar `payload.instanceName` em vez de `payload.instance`
3. **Processar mensagem no formato correto**: 
   - Acessar `payload.message` como objeto unico (nao array)
   - Usar `payload.message.fromMe` para filtrar mensagens proprias
   - Usar `payload.message.chatid` para extrair o telefone
   - Usar `payload.message.text` para extrair o texto
   - Usar `payload.message.isGroup` para filtrar grupos
4. **Manter toda a logica existente** de opt-out, cancelamento de follow-ups, atualizacao de reply_count e daily_stats -- apenas corrigir como os dados sao extraidos do payload

### Fluxo corrigido para mensagem recebida

```text
1. Webhook recebe POST da UAZAPI
2. Extrai EventType = "messages"
3. Extrai payload.message (objeto unico)
4. Verifica message.fromMe === false (mensagem do lead)
5. Verifica message.isGroup === false (nao e grupo)
6. Extrai telefone de message.chatid (ex: "555197010323@s.whatsapp.net")
7. Extrai texto de message.text
8. Detecta opt-out OU processa como resposta
9. Se resposta: cancela follow-ups com send_if_replied = false
```

### O que NAO muda

- Logica de opt-out (detectOptout, cancelamento, daily stats)
- Logica de cancelamento de follow-ups (cancelFollowUpsOnReply)
- Logica de incremento de reply_count
- Message sender (a verificacao preventiva continua funcionando)
- Endpoint /health
- Formato de resposta ao UAZAPI (sempre 200)


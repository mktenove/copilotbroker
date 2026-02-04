

# Plano: Corrigir Configuração do Webhook UAZAPI

## Problema Identificado

Ao analisar a [documentação oficial da UAZAPI](https://docs.uazapi.com/endpoint/post/webhook), identifiquei que o código atual está usando:
- **Endpoint incorreto**: `/webhook/set/{instanceName}` quando deveria ser `/webhook`
- **Nomes de eventos incorretos**: `messages.upsert`, `connection.update` quando deveria ser `messages`, `connection`, etc.
- **Falta o filtro anti-loop**: `excludeMessages: ["wasSentByApi"]`

---

## Alterações Necessárias

### 1. Edge Function `whatsapp-instance-manager/index.ts`

**Linha ~193**: Corrigir URL e payload do webhook

| Antes | Depois |
|-------|--------|
| `/webhook/set/${instanceName}` | `/webhook` |
| `webhook_by_events: false` | `excludeMessages: ["wasSentByApi"]` |
| `events: ["messages.upsert", ...]` | `events: ["messages", "connection", "messages_update"]` |

**Código corrigido:**
```typescript
const webhookResponse = await uazapiFetchWithAuthFallback(
  `${UAZAPI_BASE_URL}/webhook`,
  {
    method: "POST",
    includeJson: true,
    bodyString: JSON.stringify({
      url: webhookUrl,
      enabled: true,
      events: ["messages", "connection", "messages_update"],
      excludeMessages: ["wasSentByApi"],
    }),
  },
  instanceToken || UAZAPI_DEFAULT_TOKEN,
);
```

### 2. Edge Function `whatsapp-webhook/index.ts`

Atualizar os event types para corresponder ao formato real da UAZAPI:

| Evento Antigo | Evento Correto |
|---------------|----------------|
| `messages.upsert` | `messages` |
| `connection.update` | `connection` |
| `message.update` | `messages_update` |

---

## Resumo das Mudanças

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/whatsapp-instance-manager/index.ts` | Corrigir endpoint `/webhook` e payload |
| `supabase/functions/whatsapp-webhook/index.ts` | Atualizar nomes dos eventos |

---

## Resultado Esperado

Após as correções:
1. A instância UAZAPI será criada corretamente
2. O webhook será configurado apontando para sua edge function
3. Eventos de mensagens e conexão serão recebidos no formato correto
4. O filtro `wasSentByApi` evitará loops de mensagens


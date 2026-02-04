

## Correção do Envio de Mensagens WhatsApp via UAZAPI

### Diagnóstico

Após análise detalhada da documentação oficial da UAZAPI, identifiquei que as edge functions estão usando endpoints e formatos incorretos.

---

### Comparação: Documentação vs Código Atual

| Aspecto | Documentação UAZAPI | Código Atual |
|---------|---------------------|--------------|
| URL Base | `https://api.uazapi.com/v2/{instanceId}/...` | Variável (sem instanceId) |
| Endpoint Texto | `POST /message/text` | `/send/text` ou `/message/sendText` |
| Header Auth | `Authorization: Bearer {token}` | `token` ou `apikey` |
| Campo telefone | `phone` | `number` |
| Campo mensagem | `message` | `text` |

---

### Arquivos a Modificar

#### 1. `supabase/functions/whatsapp-message-sender/index.ts`

**Alteração 1 - Adicionar basePath (Linha 4):**
```typescript
// De:
const app = new Hono();

// Para:
const app = new Hono().basePath("/whatsapp-message-sender");
```

**Alteração 2 - Corrigir função sendMessageViaUAZAPI (Linhas 64-99):**
- Mudar endpoint de `/message/sendText/${instanceName}` para formato correto
- Mudar header de `apikey` para `Authorization: Bearer`
- Mudar payload de `{ number, text }` para `{ phone, message }`

```typescript
const sendMessageViaUAZAPI = async (
  instanceName: string,
  instanceToken: string | null,
  phone: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    // Formato correto conforme documentação UAZAPI
    const response = await fetch(`${UAZAPI_BASE_URL}/message/text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${instanceToken || UAZAPI_TOKEN}`,
      },
      body: JSON.stringify({
        phone: formatPhoneForUAZAPI(phone),
        message: message,
      }),
    });
    // ... resto permanece igual
  }
};
```

---

#### 2. `supabase/functions/notify-new-lead/index.ts`

**Alteração - Corrigir chamada UAZAPI (Linhas 99-111):**
- Mudar endpoint de `/send/text` para `/message/text`
- Mudar header de `token` para `Authorization: Bearer`
- Mudar payload de `{ number, text }` para `{ phone, message }`

```typescript
// De:
const response = await fetch(`${uazapiUrl}/send/text`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "token": uazapiToken,
  },
  body: JSON.stringify({
    number: recipientPhone,
    text: message,
  }),
});

// Para:
const response = await fetch(`${uazapiUrl}/message/text`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${uazapiToken}`,
  },
  body: JSON.stringify({
    phone: recipientPhone,
    message: message,
  }),
});
```

---

### Resumo das Correções

| Arquivo | Problema | Solução |
|---------|----------|---------|
| `whatsapp-message-sender` | Falta basePath no Hono | Adicionar `.basePath("/whatsapp-message-sender")` |
| `whatsapp-message-sender` | Header `apikey` | Mudar para `Authorization: Bearer` |
| `whatsapp-message-sender` | Payload `{ number, text }` | Mudar para `{ phone, message }` |
| `notify-new-lead` | Endpoint `/send/text` | Mudar para `/message/text` |
| `notify-new-lead` | Header `token` | Mudar para `Authorization: Bearer` |
| `notify-new-lead` | Payload `{ number, text }` | Mudar para `{ phone, message }` |

---

### Pós-Implementação

Após aplicar as correções:
1. As edge functions serão automaticamente re-deployed
2. Testar enviando um lead manualmente para verificar notificação
3. Verificar se a fila de mensagens (cron) processa corretamente


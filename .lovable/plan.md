
## Correção do Envio de Mensagens WhatsApp via UAZAPI

### Diagnóstico Final

Após análise detalhada, identifiquei **3 problemas principais** que causam o erro `405 Method Not Allowed`:

---

### Problema 1: Estrutura de URL Incorreta

**Documentação UAZAPI (página 3):**
```
URL Base: https://api.uazapi.com/v2/{instanceId}/{endpoint}
```

**O que o código atual faz:**
```typescript
// notify-new-lead e whatsapp-message-sender
fetch(`${UAZAPI_INSTANCE_URL}/message/text`, ...)
```

**O problema:**
- Se `UAZAPI_INSTANCE_URL` = `https://api.uazapi.com` (sem instanceId), o endpoint seria `/message/text` que não existe
- Se `UAZAPI_INSTANCE_URL` = `https://api.uazapi.com/v2/alguma_instancia`, está fixado em UMA instância e não funciona para outras

**Solução:**
- Separar `UAZAPI_BASE_URL` (ex: `https://api.uazapi.com`) do `instanceId`
- Construir URL: `{BASE_URL}/v2/{instanceName}/message/text`
- Usar o `instance_name` e `instance_token` da tabela `broker_whatsapp_instances`

---

### Problema 2: Header de Autenticação Incorreto

**Documentação UAZAPI (página 3):**
```
Authorization: Bearer {seu-token}
```

**Código atual já usa Bearer**, mas o `whatsapp-instance-manager` que funciona usa um sistema de fallback que tenta múltiplos headers:
- `token`
- `admintoken`
- `apikey`
- `Authorization: Bearer`

**Descoberta importante:** O `whatsapp-instance-manager` tenta `token` PRIMEIRO, não `Bearer`. Isso sugere que a UAZAPI neste ambiente aceita o header `token` diretamente.

---

### Problema 3: `notify-new-lead` Não Busca Instância do Broker

Quando um lead é atribuído a um corretor, a função `notify-new-lead` deveria:
1. Buscar a instância WhatsApp conectada do corretor em `broker_whatsapp_instances`
2. Usar o `instance_name` para construir a URL correta
3. Usar o `instance_token` para autenticação

Atualmente ela usa apenas as variáveis de ambiente globais.

---

### Correções Necessárias

#### 1. `supabase/functions/notify-new-lead/index.ts`

```typescript
// ANTES:
const response = await fetch(`${uazapiUrl}/message/text`, {
  headers: {
    "Authorization": `Bearer ${uazapiToken}`,
  },
  body: JSON.stringify({ phone, message }),
});

// DEPOIS:
// 1. Buscar instância do broker
const { data: brokerInstance } = await supabase
  .from("broker_whatsapp_instances")
  .select("instance_name, instance_token, status")
  .eq("broker_id", recipientBrokerId)
  .eq("status", "connected")
  .single();

// 2. Construir URL com instanceName
const instanceName = brokerInstance?.instance_name || "default";
const instanceToken = brokerInstance?.instance_token || uazapiToken;

// 3. Usar URL base sem instance, adicionando o path correto
// UAZAPI_INSTANCE_URL pode ser: https://api.uazapi.com/v2/{instance}
// Então o endpoint fica: {UAZAPI_INSTANCE_URL}/message/text
const response = await fetch(`${uazapiUrl}/message/text`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "token": instanceToken,  // Header "token" em vez de "Bearer"
  },
  body: JSON.stringify({
    phone: recipientPhone,
    message: message,
  }),
});
```

#### 2. `supabase/functions/whatsapp-message-sender/index.ts`

A função `sendMessageViaUAZAPI` precisa:

```typescript
// ANTES:
const response = await fetch(`${UAZAPI_BASE_URL}/message/text`, {
  headers: {
    "Authorization": `Bearer ${instanceToken || UAZAPI_TOKEN}`,
  },
  ...
});

// DEPOIS:
const response = await fetch(`${UAZAPI_BASE_URL}/message/text`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "token": instanceToken || UAZAPI_TOKEN,  // Header "token" em vez de "Bearer"
  },
  body: JSON.stringify({
    phone: formatPhoneForUAZAPI(phone),
    message: messageText,
  }),
});
```

---

### Implementação Robusta com Fallback

Para garantir compatibilidade com diferentes configurações UAZAPI, implementar o mesmo padrão de fallback do `whatsapp-instance-manager`:

```typescript
const sendWithAuthFallback = async (
  url: string,
  token: string,
  body: object
): Promise<Response> => {
  const headers = ["token", "apikey", "Authorization"];
  
  for (const headerType of headers) {
    const reqHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (headerType === "Authorization") {
      reqHeaders["Authorization"] = `Bearer ${token}`;
    } else {
      reqHeaders[headerType] = token;
    }
    
    const res = await fetch(url, {
      method: "POST",
      headers: reqHeaders,
      body: JSON.stringify(body),
    });
    
    if (res.ok) return res;
    if (res.status !== 401 && res.status !== 405) return res;
  }
  
  // Retorna última resposta se todas falharem
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "token": token },
    body: JSON.stringify(body),
  });
};
```

---

### Arquivos a Modificar

| Arquivo | Alteração Principal |
|---------|---------------------|
| `supabase/functions/notify-new-lead/index.ts` | Mudar header de `Authorization: Bearer` para `token` |
| `supabase/functions/whatsapp-message-sender/index.ts` | Mudar header de `Authorization: Bearer` para `token` |

---

### Testes Pós-Implementação

1. Deploy das edge functions
2. Adicionar um lead manualmente para testar `notify-new-lead`
3. Verificar logs da edge function para confirmar resposta da UAZAPI
4. Verificar timeline do lead para ver se notificação foi enviada


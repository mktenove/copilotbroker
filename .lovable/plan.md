
## Plano: Corrigir Endpoint de Envio de Mensagem nas Notificações

### Problema Identificado

A edge function `notify-new-lead` retorna erro **405 Method Not Allowed** ao tentar enviar mensagens via UAZAPI. O log mostra:
```
Erro UAZAPI: { code: 405, message: "Method Not Allowed.", data: {} }
```

O endpoint `/message/text` usado na função não é reconhecido pela API.

### Análise Técnica

1. **A função `notify-new-lead`** usa:
   - Endpoint: `POST ${UAZAPI_INSTANCE_URL}/message/text`
   - Payload: `{ phone, message }`

2. **A UAZAPI** pode usar diferentes formatos de endpoint dependendo da versão:
   - `/chat/send/text` (wuzapi style)
   - `/send/text` (uazapiGO v2)
   - `/message/sendText`

3. **O status da instância funciona** porque usa o endpoint `/status` corretamente.

### Solução Proposta

Refatorar a função `notify-new-lead` para:

1. **Testar múltiplos endpoints** até encontrar um que funcione
2. **Usar diferentes formatos de payload** compatíveis com cada endpoint
3. **Adicionar logs detalhados** para diagnóstico

### Código a Modificar

**Arquivo:** `supabase/functions/notify-new-lead/index.ts`

Substituir a chamada direta por uma função com fallback para múltiplos endpoints:

```typescript
const sendMessageViaUAZAPI = async (
  uazapiUrl: string,
  uazapiToken: string,
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> => {
  const cleanPhone = phone.replace(/\D/g, "");
  
  // Lista de endpoints e payloads para tentar
  const attempts = [
    {
      endpoint: "/send/text",
      payload: { phone: cleanPhone, message }
    },
    {
      endpoint: "/chat/send/text",
      payload: { Phone: cleanPhone, Body: message }
    },
    {
      endpoint: "/message/sendText",
      payload: { number: cleanPhone, text: message }
    }
  ];

  for (const attempt of attempts) {
    try {
      const url = `${uazapiUrl.replace(/\/$/, "")}${attempt.endpoint}`;
      console.log(`Tentando: POST ${url}`);
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": uazapiToken,
        },
        body: JSON.stringify(attempt.payload),
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log(`Sucesso com endpoint: ${attempt.endpoint}`);
        return { success: true };
      }
      
      // 405 = endpoint errado, tentar próximo
      if (response.status === 405) {
        console.log(`Endpoint ${attempt.endpoint} retornou 405, tentando próximo...`);
        continue;
      }
      
      // Outros erros podem ser problemas reais
      console.error(`Erro no endpoint ${attempt.endpoint}:`, result);
      
    } catch (err) {
      console.error(`Exceção no endpoint ${attempt.endpoint}:`, err);
    }
  }
  
  return { success: false, error: "Nenhum endpoint de envio funcionou" };
};
```

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/notify-new-lead/index.ts` | Adicionar função com fallback para múltiplos endpoints |
| `supabase/functions/whatsapp-message-sender/index.ts` | Aplicar a mesma correção (se necessário) |

### Teste Após Correção

1. A função será re-deployada automaticamente
2. Testar criando um novo lead atribuído a um corretor
3. Verificar os logs para confirmar qual endpoint funcionou
4. Confirmar recebimento da notificação no WhatsApp do corretor

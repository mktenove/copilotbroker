

## Plano: Gerenciamento da Instância Global de WhatsApp no Painel Admin

### Contexto

O sistema possui **dois tipos de instâncias WhatsApp**:

1. **Instâncias individuais de corretores** - Armazenadas na tabela `broker_whatsapp_instances`, gerenciadas pela edge function `whatsapp-instance-manager`
2. **Instância global da Enove** - Configurada via variáveis de ambiente (`UAZAPI_INSTANCE_URL`, `UAZAPI_TOKEN`), usada para notificações de leads

A aba "Conexão" no painel admin atualmente usa o mesmo hook dos corretores, que busca a instância vinculada ao broker logado. Como o admin não é um broker, isso não funciona corretamente.

---

### Solução Proposta

#### 1. Nova Edge Function: `whatsapp-global-instance-manager`

Criação de uma edge function dedicada para gerenciar a instância global da Enove, com os endpoints:

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/status` | GET | Verifica o status da instância global na UAZAPI |
| `/qrcode` | GET | Obtém QR Code para reconectar a instância global |
| `/logout` | POST | Desconecta a instância global |
| `/restart` | POST | Reinicia a instância global |

Esta edge function usará as variáveis de ambiente `UAZAPI_INSTANCE_URL` e `UAZAPI_TOKEN` diretamente.

#### 2. Novo Hook: `use-whatsapp-global-instance.ts`

Similar ao `use-whatsapp-instance.ts`, mas chamando a nova edge function `whatsapp-global-instance-manager`.

Funcionalidades:
- Verificar status da instância global
- Exibir QR Code quando desconectada
- Desconectar/reiniciar

#### 3. Novo Componente: `AdminConnectionTab.tsx`

Componente dedicado para o painel admin que:
- Mostra o status da instância global (não individual de corretor)
- Permite conectar/reconectar via QR Code
- Usa o hook `useWhatsAppGlobalInstance`

#### 4. Correção do `notify-new-lead`

Ajustar o endpoint para usar o formato correto da UAZAPI:

```typescript
// Antes (incorreto):
fetch(`${uazapiUrl}/message/text`, ...)

// Depois (correto):
fetch(`${uazapiUrl}/message/text`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "token": uazapiToken,
  },
  body: JSON.stringify({
    phone: recipientPhone,
    message: message,
  }),
});
```

**Importante:** O erro 405 acontece porque o endpoint ou o formato de autenticação está incorreto. A UAZAPI usa o header `token` (não Bearer).

---

### Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/whatsapp-global-instance-manager/index.ts` | Criar |
| `supabase/config.toml` | Adicionar configuração da nova função |
| `src/hooks/use-whatsapp-global-instance.ts` | Criar |
| `src/components/whatsapp/AdminConnectionTab.tsx` | Criar |
| `src/pages/AdminWhatsApp.tsx` | Modificar para usar `AdminConnectionTab` |
| `supabase/functions/notify-new-lead/index.ts` | Verificar/corrigir endpoint |

---

### Detalhes Técnicos

#### Edge Function `whatsapp-global-instance-manager`

```typescript
// Estrutura principal
const app = new Hono().basePath("/whatsapp-global-instance-manager");

// Extrai instance name da URL
// Se UAZAPI_INSTANCE_URL = "https://api.uazapi.com/v2/enove_principal"
// Então instanceName = "enove_principal"
const parseInstanceFromUrl = (): { baseUrl: string; instanceName: string } => {
  const url = Deno.env.get("UAZAPI_INSTANCE_URL") || "";
  const match = url.match(/^(.+?)\/v2\/([^/]+)$/);
  if (match) {
    return { baseUrl: match[1], instanceName: match[2] };
  }
  // Fallback: assume URL é a base e precisa de instanceName separado
  return { baseUrl: url, instanceName: "enove_principal" };
};

// GET /status - Verificar conexão
app.get("/status", async (c) => {
  const { baseUrl, instanceName } = parseInstanceFromUrl();
  const token = Deno.env.get("UAZAPI_TOKEN");
  
  const response = await fetch(`${baseUrl}/v2/${instanceName}/instance/status`, {
    headers: { "token": token },
  });
  // ...
});

// GET /qrcode - Obter QR Code
app.get("/qrcode", async (c) => {
  const { baseUrl, instanceName } = parseInstanceFromUrl();
  const token = Deno.env.get("UAZAPI_TOKEN");
  
  const response = await fetch(`${baseUrl}/v2/${instanceName}/instance/connect`, {
    headers: { "token": token },
  });
  // ...
});
```

#### Hook `useWhatsAppGlobalInstance`

```typescript
const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-global-instance-manager`;

export function useWhatsAppGlobalInstance() {
  const [status, setStatus] = useState<"connected" | "disconnected" | "qr_pending">("disconnected");
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  // ...
  
  const refreshStatus = async () => {
    const res = await fetch(`${FUNCTION_URL}/status`, { headers: await getAuthHeaders() });
    // ...
  };
  
  return { status, phoneNumber, qrCode, refreshStatus, fetchQRCode, ... };
}
```

---

### Fluxo de Notificações Corrigido

```text
1. Novo lead cadastrado
2. Trigger chama notify-new-lead
3. notify-new-lead usa UAZAPI_INSTANCE_URL + UAZAPI_TOKEN
4. Mensagem enviada via instância global da Enove
5. Corretor recebe notificação no WhatsApp
```

---

### Benefícios

- **Separação clara**: Instância global (notificações) vs instâncias individuais (campanhas)
- **Admin tem controle**: Pode reconectar a instância global quando necessário
- **Não afeta corretores**: Cada corretor continua com sua própria instância para campanhas


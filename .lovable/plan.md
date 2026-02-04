
# Plano: Corrigir Atualização do Status de Conexão WhatsApp

## Diagnóstico do Problema

O QR Code foi criado e escaneado com sucesso (celular mostra "Ativo"), mas a interface web não atualiza o status. A análise revelou dois problemas principais:

### Problema 1: Campo errado na resposta da UAZAPI

Os logs mostram que a UAZAPI retorna:
```json
{
  "connected": true/false,
  "instance": {
    "status": "connecting" | "connected" | "disconnected",
    ...
  },
  "response": "Connecting" | "Connected"
}
```

Porém, o código atual na rota `/status` procura pelo campo `state` em vez de `status`:

```text
Linha 450-453 (ATUAL):
  const state = uazStatus.instance?.state || uazStatus.state;
  const newStatus = state === "open" ? "connected" : ...

DEVERIA SER:
  const status = uazStatus.connected ? "connected" : 
                 uazStatus.instance?.status || uazStatus.response?.toLowerCase();
```

### Problema 2: Webhook não está recebendo eventos

O webhook `whatsapp-webhook` não possui logs, indicando que a UAZAPI não está enviando eventos de conexão. Isso acontece porque:

1. O webhook pode não ter sido registrado corretamente
2. A URL do webhook pode estar errada
3. A UAZAPI pode precisar do token da instância para registrar webhooks

### Problema 3: Polling muito lento

O hook `use-whatsapp-instance.ts` faz polling a cada 30 segundos (linha 274), o que significa que após escanear o QR code, o usuário precisa esperar até 30 segundos para ver a atualização.

---

## Alterações Propostas

### 1. Corrigir extração de status na rota `/status`

**Arquivo:** `supabase/functions/whatsapp-instance-manager/index.ts`  
**Linhas:** 449-466

```typescript
// ANTES (linhas 449-453)
const state = uazStatus.instance?.state || uazStatus.state;
const newStatus = state === "open" ? "connected" : 
                  state === "connecting" ? "connecting" : 
                  "disconnected";

// DEPOIS
// A UAZAPI retorna múltiplos indicadores de conexão:
// - connected: boolean no root
// - instance.status: "connecting" | "connected" | "disconnected"
// - response: "Connecting" | "Connected"
// - loggedIn: boolean
const isConnected = 
  uazStatus.connected === true || 
  uazStatus.loggedIn === true ||
  uazStatus.instance?.status === "connected" ||
  uazStatus.response?.toLowerCase() === "connected";

const isConnecting = 
  uazStatus.instance?.status === "connecting" ||
  uazStatus.response?.toLowerCase() === "connecting";

const newStatus = isConnected ? "connected" : 
                  isConnecting ? "connecting" : 
                  "disconnected";
```

### 2. Extrair número de telefone quando conectado

**Arquivo:** `supabase/functions/whatsapp-instance-manager/index.ts`  
**Dentro da mesma lógica de status**

```typescript
// Também capturar o número de telefone da instância quando conectado
const phoneNumber = 
  uazStatus.instance?.owner ||
  uazStatus.jid?.split("@")[0] ||
  uazStatus.instance?.profileName ||
  null;

// Formatar para E.164 se necessário
const formattedPhone = phoneNumber 
  ? (phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`)
  : null;

// Incluir phone_number no update
await supabase
  .from("broker_whatsapp_instances")
  .update({ 
    status: newStatus,
    phone_number: newStatus === "connected" ? formattedPhone : instance.phone_number,
    connected_at: newStatus === "connected" ? new Date().toISOString() : instance.connected_at,
    last_seen_at: new Date().toISOString(),
  })
  .eq("id", instance.id);
```

### 3. Adicionar polling mais rápido durante espera de QR

**Arquivo:** `src/hooks/use-whatsapp-instance.ts`  
**Linhas:** 271-277

```typescript
// ANTES
useEffect(() => {
  if (instance?.status === "connected" || instance?.status === "connecting" || instance?.status === "qr_pending") {
    const interval = setInterval(refreshStatus, 30000);
    return () => clearInterval(interval);
  }
}, [instance?.status, refreshStatus]);

// DEPOIS - Polling mais agressivo durante conexão
useEffect(() => {
  if (!instance) return;
  
  // Durante espera do QR, verificar a cada 5 segundos
  if (instance.status === "qr_pending" || instance.status === "connecting") {
    const interval = setInterval(refreshStatus, 5000);
    return () => clearInterval(interval);
  }
  
  // Quando conectado, verificar a cada 60 segundos
  if (instance.status === "connected") {
    const interval = setInterval(refreshStatus, 60000);
    return () => clearInterval(interval);
  }
}, [instance?.status, refreshStatus]);
```

### 4. Limpar QR Code após conexão bem-sucedida

**Arquivo:** `src/hooks/use-whatsapp-instance.ts`  
**Na função refreshStatus**

```typescript
const refreshStatus = useCallback(async () => {
  try {
    setIsLoading(true);
    setError(null);
    
    const headers = await getAuthHeaders();
    const response = await fetch(`${FUNCTION_URL}/status`, {
      method: "GET",
      headers,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || "Failed to get status");
    }

    setInstance(data.instance);
    
    // Limpar QR code quando conectado com sucesso
    if (data.instance?.status === "connected") {
      setQRCode(null);
    }
  } catch (err) {
    // ... error handling
  } finally {
    setIsLoading(false);
  }
}, []);
```

---

## Resumo das Alterações

| Arquivo | Alteração | Impacto |
|---------|-----------|---------|
| `whatsapp-instance-manager/index.ts` | Corrigir campos de status | Status atualiza corretamente |
| `whatsapp-instance-manager/index.ts` | Extrair número de telefone | Mostra número quando conectado |
| `use-whatsapp-instance.ts` | Polling de 5s durante QR | Atualização mais rápida |
| `use-whatsapp-instance.ts` | Limpar QR ao conectar | UX mais limpa |

---

## Resultado Esperado

Após as correções:

1. Ao escanear o QR Code, o status será atualizado para "connected" em até 5 segundos
2. O número de telefone conectado será exibido na interface
3. O QR Code desaparecerá automaticamente após a conexão
4. O card de "Saúde da Conexão" (Health Score) será exibido no lugar do QR Code

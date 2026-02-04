

## Correção: Endpoint de Status WhatsApp

O endpoint correto foi identificado:

**Antes (incorreto):**
- `GET /instance/connectionState/{instanceName}`
- `GET /instance/connect/{instanceName}`

**Agora (correto):**
- `GET /instance/status`

Os estados retornados são exatamente: `disconnected`, `connecting`, `connected`

---

## Alterações

### 1. Edge Function - Corrigir endpoint de status

**Arquivo:** `supabase/functions/whatsapp-instance-manager/index.ts`

Atualizar a lista de endpoints na rota `/status` (linhas 515-520):

```text
ANTES:
const statusAttempts: StatusAttempt[] = [
  { name: "connectionState", path: `/instance/connectionState/${instanceNameEnc}`, isAdmin: false },
  { name: "connection-state-kebab", path: `/instance/connection-state/${instanceNameEnc}`, isAdmin: false },
  { name: "connect", path: `/instance/connect/${instanceNameEnc}`, isAdmin: false },
  { name: "fetchInstances", path: `/instance/fetchInstances`, isAdmin: true },
];

DEPOIS:
const statusAttempts: StatusAttempt[] = [
  // Endpoint correto confirmado pelo usuário
  { name: "status", path: `/instance/status`, isAdmin: false },
  // Fallbacks caso a API mude
  { name: "connectionState", path: `/instance/connectionState/${instanceNameEnc}`, isAdmin: false },
  { name: "fetchInstances", path: `/instance/fetchInstances`, isAdmin: true },
];
```

### 2. Ajustar normalização de status

O endpoint retorna diretamente os estados `connected`, `connecting`, `disconnected`.

A função `normalizeUazapiStatus` já suporta esses valores (linha 427), então não precisa de alteração.

---

## Resultado Esperado

1. A chamada `GET /instance/status` será feita primeiro
2. O provedor retornará `connected`, `connecting` ou `disconnected`
3. O normalizador vai mapear corretamente
4. A UI vai mostrar "Conectado" com o card verde

---

## Arquivos a serem alterados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/whatsapp-instance-manager/index.ts` | Trocar endpoint para `/instance/status` |


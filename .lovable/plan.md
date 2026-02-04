
# Plano: Corrigir Módulo WhatsApp - Erro de Conexão e Funcionalidades

## Diagnóstico

### Problema Principal: Edge Function retorna 404

**Causa raiz identificada:**

O Hono framework está configurado com rotas como `/init` e `/status`, mas a edge function é chamada em:
- `https://.../functions/v1/whatsapp-instance-manager/status`
- `https://.../functions/v1/whatsapp-instance-manager/init`

O Hono vê o path completo `/whatsapp-instance-manager/init` e não encontra match com `/init`.

**Evidência dos logs:**
```text
OPTIONS | 200 | .../whatsapp-instance-manager/init  ← CORS preflight OK
POST    | 404 | .../whatsapp-instance-manager/init  ← Rota não encontrada
```

### Problemas Secundários

1. **React ref warnings** - `QueueTab` e `ErrorLogsCard` recebem refs mas não usam `forwardRef`
2. **CORS headers incompletos** - Faltam headers que o Supabase client envia

---

## Solução

### 1. Corrigir rotas do Hono com basePath

**Arquivo:** `supabase/functions/whatsapp-instance-manager/index.ts`

```typescript
// ANTES
const app = new Hono();

// DEPOIS - Adicionar basePath para o nome da função
const app = new Hono().basePath("/whatsapp-instance-manager");
```

Isso faz o Hono entender que:
- Request para `/whatsapp-instance-manager/init` → rota `/init`
- Request para `/whatsapp-instance-manager/status` → rota `/status`

### 2. Atualizar CORS headers

**Arquivo:** `supabase/functions/whatsapp-instance-manager/index.ts`

```typescript
// ANTES
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// DEPOIS - Adicionar headers que o Supabase JS client envia
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
```

### 3. Corrigir React ref warnings (componentes QueueTab e ErrorLogsCard)

Os componentes são usados dentro de `TabsContent` do Radix que passa refs. Preciso verificar como estão sendo usados ou envolver em `forwardRef` se necessário. Isso é um warning menor, não impede o funcionamento.

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/whatsapp-instance-manager/index.ts` | Adicionar `.basePath()` e atualizar CORS headers |

---

## Resultado Esperado

Após a correção:
- **GET /status** → Retorna status da instância ou `null` se não configurada
- **POST /init** → Cria nova instância UAZAPI e salva no banco
- **GET /qrcode** → Retorna QR code para pareamento
- **POST /logout** → Desconecta a instância
- **POST /restart** → Reinicia a instância
- **POST /pause** → Pausa/retoma envios
- **POST /settings** → Atualiza configurações de limites

---

## Fluxo de Teste

```text
1. Usuário clica "Iniciar Conexão"
2. Frontend chama POST /whatsapp-instance-manager/init
3. Edge function cria instância no UAZAPI
4. Salva registro em broker_whatsapp_instances
5. Retorna dados da instância
6. Frontend mostra QR code para escanear
```

---

## Detalhes Técnicos

**Mudança no Hono (linha 4):**

```typescript
// Criar app com basePath que corresponde ao nome da função
const app = new Hono().basePath("/whatsapp-instance-manager");
```

**Mudança nos CORS headers (linhas 6-9):**

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
```

Isso garante compatibilidade total com o cliente Supabase JS que adiciona esses headers automaticamente.

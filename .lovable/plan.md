

# Corrigir cancelamento de follow-ups na Cadencia 10D

## Problema identificado

A corretora Samyra relatou que leads que respondem durante uma Cadencia 10D continuam recebendo mensagens mesmo com a opcao "enviar somente se o lead nao responder" ativada.

## Causa raiz: formato de telefone inconsistente

A Edge Function `auto-cadencia-10d` tem sua propria funcao `formatPhoneE164` que retorna telefones **sem o prefixo `+`** (ex: `5551996061120`), enquanto o webhook que processa respostas usa uma versao que retorna **com o prefixo `+`** (ex: `+5551996061120`).

Quando o lead responde:
1. O webhook recebe a resposta e formata o telefone como `+5551996061120`
2. Busca mensagens na fila com `.eq("phone", "+5551996061120")`
3. Nao encontra nada, pois a fila tem `5551996061120` (sem `+`)
4. O cancelamento nunca acontece e a reply nao e registrada em `whatsapp_lead_replies`
5. O message-sender tambem nao consegue validar replies pelo mesmo motivo

Dados confirmam o problema: campanhas criadas pelo `auto-cadencia-10d` tem phones sem `+`, e nenhuma tem reply registrada em `whatsapp_lead_replies`.

## Solucao

### 1. Corrigir `auto-cadencia-10d/index.ts`

Alterar a funcao `formatPhoneE164` para retornar com prefixo `+`, alinhando com todas as outras implementacoes:

```
// ANTES (bugado):
function formatPhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length === 11 || digits.length === 10) return "55" + digits;
  return digits;
}

// DEPOIS (corrigido):
function formatPhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return "+" + digits;
  if (digits.length === 11 || digits.length === 10) return "+55" + digits;
  return "+" + digits;
}
```

### 2. Corrigir dados existentes no banco

Atualizar os telefones sem `+` na tabela `whatsapp_message_queue` para normalizar o formato:

```sql
UPDATE whatsapp_message_queue
SET phone = '+' || phone
WHERE phone NOT LIKE '+%'
  AND phone ~ '^\d+$';
```

### 3. Normalizar o webhook para tolerancia de formato

Adicionar busca com ambos os formatos no webhook (`cancelFollowUpsOnReply`) para que, mesmo que existam dados antigos com formato inconsistente, o sistema encontre as mensagens. Buscar por `phone` com e sem `+`.

### Arquivos alterados

| Arquivo | Alteracao |
|---|---|
| `supabase/functions/auto-cadencia-10d/index.ts` | Corrigir `formatPhoneE164` para retornar com `+` |
| `supabase/functions/whatsapp-webhook/index.ts` | Buscar mensagens com ambos os formatos de telefone |
| Banco de dados (data fix) | Normalizar phones existentes sem `+` |


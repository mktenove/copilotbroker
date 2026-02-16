

# Correção: Rastreamento de respostas por telefone/campanha

## Problema identificado

A implementacao atual tem dois gaps:

1. **Check 2 no message-sender usa `reply_count` global da campanha** - Se o lead A responder, o follow-up do lead B na mesma campanha tambem seria cancelado (falso positivo)
2. **Gap de timing** - Se a resposta chega ANTES do follow-up ser agendado na fila, o webhook nao encontra nada para cancelar. O unico registro e o `reply_count` da campanha (que e global)

## Solucao: Tabela de rastreamento per-phone per-campaign

Seguindo a logica que voce descreveu, vamos criar um registro de "respondido" por telefone por campanha.

### 1. Nova tabela: `whatsapp_lead_replies`

```text
whatsapp_lead_replies
- phone (TEXT, NOT NULL)
- campaign_id (UUID, NOT NULL)
- replied_at (TIMESTAMPTZ, DEFAULT now())
- PRIMARY KEY (phone, campaign_id)
```

Sem RLS (acesso apenas via service_role no backend). Tabela simples e eficiente - uma linha por telefone/campanha.

### 2. Webhook (`whatsapp-webhook/index.ts`)

Apos detectar uma resposta e identificar os campaign_ids, UPSERT na nova tabela:

```text
Para cada campaign_id detectado:
  UPSERT whatsapp_lead_replies (phone, campaign_id, replied_at)
```

Isso garante que mesmo que nao haja mensagens agendadas para cancelar naquele momento, o fato da resposta fica registrado permanentemente.

### 3. Message-sender (`whatsapp-message-sender/index.ts`)

Substituir o Check 2 (reply_count global) por uma consulta direta na nova tabela:

```text
// ANTES (bugado - global):
campaign.reply_count > 0 → cancela para QUALQUER telefone

// DEPOIS (correto - per-phone):
SELECT 1 FROM whatsapp_lead_replies
WHERE phone = queueMsg.phone
AND campaign_id = queueMsg.campaign_id
→ cancela apenas para o telefone que respondeu
```

Manter o Check 1 (verificacao de mensagens ja canceladas) como esta, pois e per-phone e funciona corretamente.

## Fluxo corrigido completo

```text
Etapa 1 enviada para Lead A e Lead B (mesma campanha)

Lead A responde (texto ou audio):
  1. Webhook recebe mensagem
  2. Cancela follow-ups agendados do Lead A (se existirem)
  3. UPSERT whatsapp_lead_replies (phone_A, campaign_id)
  4. Incrementa reply_count da campanha

Quando o sender vai processar Etapa 2 do Lead A:
  → Check: whatsapp_lead_replies existe para phone_A + campaign_id
  → CANCELA

Quando o sender vai processar Etapa 2 do Lead B:
  → Check: whatsapp_lead_replies NAO existe para phone_B + campaign_id
  → ENVIA normalmente
```

## Arquivos

| Acao | Arquivo |
|------|---------|
| Criar tabela | Migration SQL (whatsapp_lead_replies) |
| Editar | `supabase/functions/whatsapp-webhook/index.ts` |
| Editar | `supabase/functions/whatsapp-message-sender/index.ts` |

## Sem impacto em funcionalidades existentes

A tabela e write-only pelo webhook e read-only pelo sender. Nenhum componente frontend precisa ser alterado.


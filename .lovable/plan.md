

# Completar: Rastreamento de respostas por telefone/campanha

## O que ja esta funcionando

- O webhook processa respostas com midia (audio, imagem) e cancela follow-ups agendados na hora
- O cancelamento imediato de follow-ups via webhook funciona corretamente (per-phone)

## O que falta implementar

### 1. Criar tabela `whatsapp_lead_replies`

Migracacao SQL para criar a tabela de rastreamento:

```text
whatsapp_lead_replies
- phone (TEXT, NOT NULL)
- campaign_id (UUID, NOT NULL, FK -> whatsapp_campaigns.id ON DELETE CASCADE)
- replied_at (TIMESTAMPTZ, DEFAULT now())
- PRIMARY KEY (phone, campaign_id)
- INDEX em phone para buscas rapidas
```

Sem RLS (acesso apenas via service_role nas Edge Functions).

### 2. Webhook: adicionar UPSERT na tabela

No `whatsapp-webhook/index.ts`, apos identificar os campaign_ids da resposta (linha ~187), adicionar:

```text
Para cada campaign_id detectado:
  UPSERT whatsapp_lead_replies (phone, campaign_id, replied_at = now())
```

Isso registra permanentemente que aquele telefone respondeu naquela campanha, mesmo que nao haja follow-ups agendados no momento.

### 3. Message-sender: substituir Check 2 (reply_count global)

No `whatsapp-message-sender/index.ts`, substituir o Check 2 (linhas 305-341) que usa `reply_count` global da campanha por uma consulta direta:

```text
// ANTES (bugado):
campaign.reply_count > 0 -> cancela para TODOS os telefones

// DEPOIS (correto):
SELECT 1 FROM whatsapp_lead_replies
WHERE phone = queueMsg.phone AND campaign_id = queueMsg.campaign_id
-> cancela apenas para o telefone que respondeu
```

## Arquivos afetados

| Acao | Arquivo |
|------|---------|
| Criar | Migration SQL (tabela whatsapp_lead_replies) |
| Editar | `supabase/functions/whatsapp-webhook/index.ts` (adicionar UPSERT) |
| Editar | `supabase/functions/whatsapp-message-sender/index.ts` (substituir Check 2) |
| Deploy | Ambas as Edge Functions |

## Resultado esperado

- Lead A responde -> follow-ups do Lead A sao cancelados
- Lead B (mesma campanha, nao respondeu) -> continua recebendo follow-ups normalmente
- Gap de timing eliminado: mesmo que a resposta chegue antes do follow-up ser agendado, o registro na tabela impede o envio


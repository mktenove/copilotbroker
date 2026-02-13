

## Corrigir deteccao de respostas e cancelamento de follow-ups

### Diagnostico

Identifiquei **dois problemas** que causam a falha:

**Problema 1 -- Webhook nao processa mensagens recebidas**
O `whatsapp-webhook` usa Hono SEM `.basePath("/whatsapp-webhook")`. Quando a UAZAPI faz POST para `https://...supabase.co/functions/v1/whatsapp-webhook`, o gateway Supabase v1 repassa a requisicao com path `/whatsapp-webhook`. Sem o basePath configurado, o Hono registra a rota POST em `/` mas recebe requests em `/whatsapp-webhook`, resultando em 404 silencioso. Isso explica os logs mostrando apenas "booted" e "shutdown", sem nenhum "Webhook received" ou "Reply received".

**Problema 2 -- Message sender nao verifica respostas antes do follow-up**
Mesmo que o webhook funcione e registre respostas, o `whatsapp-message-sender` nao tem logica para cancelar mensagens de step 2+ quando `send_if_replied = false` e o lead ja respondeu. Ele simplesmente envia todas as mensagens agendadas sem verificar interacoes anteriores.

### Plano de correcao

**1. Corrigir basePath do webhook (`supabase/functions/whatsapp-webhook/index.ts`)**
- Alterar `new Hono()` para `new Hono().basePath("/whatsapp-webhook")`
- Isso faz o Hono reconhecer corretamente o path `/whatsapp-webhook/` que o gateway Supabase envia

**2. Registrar respostas no webhook**
Quando uma resposta e detectada (nao opt-out), alem de incrementar o reply_count:
- Cancelar mensagens pendentes (status `scheduled`) do mesmo `phone` e `campaign_id` onde o step correspondente tem `send_if_replied = false`
- Isso garante que ao receber uma resposta, os follow-ups sao cancelados automaticamente

**3. Adicionar verificacao de resposta no message-sender (`supabase/functions/whatsapp-message-sender/index.ts`)**
Antes de enviar mensagens de step 2+, verificar:
- Buscar o `campaign_step` correspondente pelo `campaign_id` e `step_number`
- Se `send_if_replied = false`, verificar se o lead ja respondeu (existe mensagem `sent` no step anterior com uma resposta subsequente no webhook)
- Se respondeu, cancelar a mensagem com motivo "Lead respondeu - follow-up cancelado"

A verificacao sera feita checando se existe alguma mensagem do step 1 com status `sent` para aquele phone/campaign, e se houve uma interacao de resposta registrada depois.

### Detalhes tecnicos

**Webhook -- logica de cancelamento ao receber resposta:**

```text
Ao receber mensagem (nao opt-out):
1. Buscar mensagens scheduled para esse phone
2. Para cada mensagem scheduled com campaign_id e step_number > 1:
   a. Buscar o campaign_step correspondente
   b. Se send_if_replied = false, cancelar a mensagem
3. Incrementar reply_count da campanha
```

**Message sender -- verificacao antes de enviar:**

```text
Antes de enviar uma mensagem com step_number > 1:
1. Buscar campaign_step onde campaign_id e step_order = step_number
2. Se send_if_replied = false:
   a. Verificar se existe no whatsapp_message_queue uma mensagem 
      do mesmo phone + campaign_id com step anterior e status = "sent"
   b. Verificar se a UAZAPI enviou alguma resposta (check via lead_interactions 
      ou tabela auxiliar)
   c. Se ha evidencia de resposta, cancelar a mensagem
```

**A abordagem mais robusta** e fazer a dupla verificacao: no webhook (reativo) e no sender (preventivo), garantindo cobertura mesmo se um dos dois falhar.

### O que NAO muda
- Tabelas existentes no banco de dados
- Logica de opt-out
- Logica de warmup e limites
- Interface da campanha


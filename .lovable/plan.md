

# Fase 3: Processador de Fila + Webhook de Recebimento

## Resumo

Implementar a edge function que processa a fila de mensagens com intervalo randômico de 60-240 segundos, enviando efetivamente as mensagens via UAZAPI, além do webhook para receber respostas e detectar opt-out automático.

---

## Estado Atual

**Implementado:**
- Banco de dados completo (6 tabelas com RLS)
- Hook `use-whatsapp-instance.ts` para gerenciar conexão
- Hook `use-whatsapp-campaigns.ts` para criar campanhas e enfileirar mensagens
- Hook `use-whatsapp-queue.ts` para visualizar a fila
- UI completa: ConnectionTab, CampaignsTab, QueueTab, SecurityTab
- Integração com Kanban (botão "Disparar WhatsApp")
- Edge function `whatsapp-instance-manager` para conexão via QR Code

**Faltando:**
- Edge function `whatsapp-message-sender` que processa a fila e envia mensagens
- Edge function `whatsapp-webhook` para receber respostas e detectar opt-out
- Lógica de warmup progressivo funcional
- Reset diário dos contadores

---

## O que será implementado

### 1. Edge Function: `whatsapp-message-sender`

Processador que será chamado via cron job para enviar mensagens da fila.

**Lógica principal:**
```text
1. Para cada corretor com instância conectada:
   a. Verificar se está pausado -> skip
   b. Verificar horário de trabalho -> skip se fora
   c. Verificar limites (hora/dia) -> skip se atingido
   d. Buscar próxima mensagem scheduled onde scheduled_at <= now
   e. Verificar opt-out do telefone -> cancelar se optout
   f. Enviar via UAZAPI /message/sendText
   g. Atualizar status (sent/failed)
   h. Incrementar contadores
   i. Registrar em lead_interactions
   j. Atualizar estatísticas diárias

2. Verificar erros consecutivos -> pausar se >= 5
3. Avançar warmup_day se completou 24h desde connected_at
```

**Endpoints:**
- `POST /process` - Processa fila (chamado pelo cron)
- `POST /send-single` - Envia mensagem avulsa (para testes)
- `POST /reset-daily` - Reseta contadores diários (cron à meia-noite)

### 2. Edge Function: `whatsapp-webhook`

Recebe eventos da UAZAPI para detectar respostas e opt-out.

**Eventos tratados:**
- `message.received` - Detectar palavras de opt-out
- `message.status` - Atualizar status de entrega
- `connection.update` - Sincronizar status da conexão

**Lógica de opt-out:**
```javascript
const OPTOUT_KEYWORDS = [
  'pare', 'parar', 'sair', 'remover', 'cancelar',
  'spam', 'bloquear', 'não quero', 'nao quero',
  'stop', 'remove', 'unsubscribe'
];

const message = payload.message.toLowerCase();
const hasOptout = OPTOUT_KEYWORDS.some(kw => message.includes(kw));

if (hasOptout) {
  // Inserir em whatsapp_optouts
  // Cancelar mensagens pendentes para este telefone
}
```

---

## Arquivos a criar

| Arquivo | Função |
|---------|--------|
| `supabase/functions/whatsapp-message-sender/index.ts` | Processador de fila |
| `supabase/functions/whatsapp-webhook/index.ts` | Webhook de recebimento |

---

## Detalhamento Técnico

### whatsapp-message-sender/index.ts

```typescript
// Estrutura principal
POST /process
- Buscar todas instâncias conectadas e não pausadas
- Para cada instância:
  - Verificar working_hours
  - Verificar hourly_limit e daily_limit
  - Buscar 1 mensagem scheduled mais antiga
  - Enviar via UAZAPI
  - Atualizar contadores
  - Registrar interação

POST /reset-daily (chamado às 00:00)
- Zerar daily_sent_count de todas instâncias
- Avançar warmup_day onde aplicável
- Ajustar limites baseado no warmup_day

POST /send-single (para admin/testes)
- Envia mensagem específica da fila
```

### Fluxo de envio de mensagem

```text
1. Buscar mensagem da fila:
   SELECT * FROM whatsapp_message_queue
   WHERE status = 'scheduled'
     AND scheduled_at <= NOW()
     AND broker_id = :broker_id
   ORDER BY scheduled_at ASC
   LIMIT 1

2. Verificar opt-out:
   SELECT * FROM whatsapp_optouts WHERE phone = :phone

3. Enviar via UAZAPI:
   POST /message/sendText/:instance_name
   {
     "number": "5551999999999",
     "text": "Olá João! ..."
   }

4. Atualizar fila:
   UPDATE whatsapp_message_queue
   SET status = 'sent', sent_at = NOW(), uazapi_message_id = :id
   WHERE id = :queue_id

5. Incrementar contadores:
   UPDATE broker_whatsapp_instances
   SET daily_sent_count = daily_sent_count + 1,
       hourly_sent_count = hourly_sent_count + 1
   WHERE id = :instance_id

6. Registrar interação:
   INSERT INTO lead_interactions
   (lead_id, broker_id, interaction_type, notes)
   VALUES (:lead_id, :broker_id, 'whatsapp', 'Mensagem enviada: ...')

7. Atualizar estatísticas:
   UPSERT INTO whatsapp_daily_stats
   (broker_id, date, sent_count)
   VALUES (:broker_id, CURRENT_DATE, 1)
   ON CONFLICT UPDATE sent_count = sent_count + 1
```

### whatsapp-webhook/index.ts

```typescript
// Estrutura principal
POST /
- Validar signature do webhook (se UAZAPI enviar)
- Parsear evento
- Tratar conforme tipo:
  - messages.upsert -> verificar opt-out
  - connection.update -> atualizar status da instância
  - message.update -> atualizar status de entrega
```

---

## Lógica de Warmup

O warmup será gerenciado automaticamente:

```javascript
// No /reset-daily
const instances = await getConnectedInstances();

for (const instance of instances) {
  // Avançar dia de warmup se ainda não completou 14 dias
  if (instance.warmup_stage !== 'normal' && instance.warmup_day < 14) {
    const newDay = instance.warmup_day + 1;
    const schedule = WARMUP_SCHEDULE[newDay];
    
    await updateInstance(instance.id, {
      warmup_day: newDay,
      hourly_limit: schedule.hourlyLimit,
      daily_limit: schedule.dailyLimit,
      warmup_stage: newDay >= 14 ? 'normal' : 'warming'
    });
  }
  
  // Resetar contadores diários
  await updateInstance(instance.id, {
    daily_sent_count: 0,
    hourly_sent_count: 0
  });
}
```

**Tabela de Warmup (já definida em types/whatsapp.ts):**
| Dia | Limite Diário | Limite/Hora |
|-----|---------------|-------------|
| 1-3 | 30 | 15 |
| 4-7 | 60 | 25 |
| 8-10 | 100 | 35 |
| 11-14 | 150 | 45 |
| 15+ | 250 | 60 |

---

## Tratamento de Erros

```javascript
// Contador de erros consecutivos
if (sendResult.error) {
  const newErrorCount = instance.consecutive_errors + 1;
  
  await updateInstance(instance.id, {
    consecutive_errors: newErrorCount
  });
  
  // Pausar após 5 erros consecutivos
  if (newErrorCount >= 5) {
    await pauseInstance(instance.id, 'Pausado automaticamente: 5 erros consecutivos');
  }
} else {
  // Reset contador em sucesso
  await updateInstance(instance.id, {
    consecutive_errors: 0
  });
}
```

---

## Setup do Cron Job

Após implementar as edge functions, será necessário configurar os cron jobs no Supabase:

```sql
-- Processar fila a cada minuto
SELECT cron.schedule(
  'whatsapp-process-queue',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://nckzxwxxtyeydolmdijn.supabase.co/functions/v1/whatsapp-message-sender/process',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  );
  $$
);

-- Resetar contadores diários à meia-noite
SELECT cron.schedule(
  'whatsapp-daily-reset',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://nckzxwxxtyeydolmdijn.supabase.co/functions/v1/whatsapp-message-sender/reset-daily',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  );
  $$
);

-- Resetar contador horário a cada hora
SELECT cron.schedule(
  'whatsapp-hourly-reset',
  '0 * * * *',
  $$
  UPDATE broker_whatsapp_instances SET hourly_sent_count = 0;
  $$
);
```

---

## Fluxo do Webhook UAZAPI

Para configurar o webhook na UAZAPI, o corretor (ou admin) precisa:

1. Acessar o painel UAZAPI
2. Configurar webhook URL: `https://nckzxwxxtyeydolmdijn.supabase.co/functions/v1/whatsapp-webhook`
3. Selecionar eventos: `messages.upsert`, `connection.update`

Alternativamente, podemos configurar via API na criação da instância:
```javascript
// No whatsapp-instance-manager /init
await fetch(`${UAZAPI_BASE_URL}/webhook/set/${instanceName}`, {
  method: 'POST',
  body: JSON.stringify({
    url: `${SUPABASE_URL}/functions/v1/whatsapp-webhook`,
    webhook_by_events: false,
    events: ['messages.upsert', 'connection.update']
  })
});
```

---

## Ordem de Implementação

1. Criar edge function `whatsapp-message-sender` com endpoints /process, /reset-daily
2. Criar edge function `whatsapp-webhook` para receber eventos
3. Atualizar `whatsapp-instance-manager` para configurar webhook automaticamente
4. Testar fluxo completo: criar campanha -> mensagens na fila -> processamento
5. Documentar setup dos cron jobs

---

## Resultado Esperado

Após esta fase:
- Mensagens da fila serão enviadas automaticamente via UAZAPI
- Intervalo randômico de 60-240s entre envios será respeitado
- Limites de hora/dia serão aplicados
- Warmup progressivo funcionará automaticamente
- Respostas com palavras de opt-out serão detectadas
- Contadores serão resetados diariamente
- Erros consecutivos pausarão a instância automaticamente


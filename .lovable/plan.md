
# WhatsApp Dispatcher - Plano de Implementação

## ✅ Fase 1: Infraestrutura Base (CONCLUÍDA)

- 6 tabelas no banco de dados com RLS
- Edge function `whatsapp-instance-manager` para conexão via QR Code
- Hook `use-whatsapp-instance.ts` para gerenciar conexão
- UI: ConnectionTab com QR Code e status

## ✅ Fase 2: Sistema de Campanhas (CONCLUÍDA)

- Hook `use-whatsapp-campaigns.ts` para CRUD de campanhas/templates
- Hook `use-whatsapp-queue.ts` para fila de mensagens
- Componentes: NewCampaignSheet, CampaignCard
- Integração com Kanban (botão "Disparar WhatsApp")
- UI completa: CampaignsTab, QueueTab

## ✅ Fase 3: Processador de Fila + Webhook (CONCLUÍDA)

- Edge function `whatsapp-message-sender` com endpoints:
  - POST /process - Processa fila (para cron)
  - POST /send-single - Envia mensagem avulsa
  - POST /reset-daily - Reseta contadores diários
  - POST /reset-hourly - Reseta contadores horários
- Edge function `whatsapp-webhook` para:
  - Detectar opt-out automático (palavras-chave)
  - Sincronizar status de conexão
  - Contabilizar respostas
- Webhook configurado automaticamente na inicialização da instância

---

## 🔲 Fase 4: Configuração de Cron Jobs

Para ativar o processamento automático, execute no SQL Editor do Supabase:

```sql
-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Processar fila a cada minuto
SELECT cron.schedule(
  'whatsapp-process-queue',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://nckzxwxxtyeydolmdijn.supabase.co/functions/v1/whatsapp-message-sender/process',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ja3p4d3h4dHlleWRvbG1kaWpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NjU4NDksImV4cCI6MjA4MzA0MTg0OX0.fjECugk1tkmhBNrR-030CJo6kB-_t8BLPYzhKCzTf1E'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Resetar contadores diários à meia-noite (3h UTC = 0h Brasil)
SELECT cron.schedule(
  'whatsapp-daily-reset',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://nckzxwxxtyeydolmdijn.supabase.co/functions/v1/whatsapp-message-sender/reset-daily',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ja3p4d3h4dHlleWRvbG1kaWpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NjU4NDksImV4cCI6MjA4MzA0MTg0OX0.fjECugk1tkmhBNrR-030CJo6kB-_t8BLPYzhKCzTf1E'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Resetar contador horário a cada hora
SELECT cron.schedule(
  'whatsapp-hourly-reset',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://nckzxwxxtyeydolmdijn.supabase.co/functions/v1/whatsapp-message-sender/reset-hourly',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ja3p4d3h4dHlleWRvbG1kaWpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NjU4NDksImV4cCI6MjA4MzA0MTg0OX0.fjECugk1tkmhBNrR-030CJo6kB-_t8BLPYzhKCzTf1E'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

---

## Arquitetura Final

### Edge Functions

| Function | Propósito |
|----------|-----------|
| `whatsapp-instance-manager` | Gerenciar conexão WhatsApp via QR Code |
| `whatsapp-message-sender` | Processar fila e enviar mensagens |
| `whatsapp-webhook` | Receber eventos da UAZAPI (opt-out, respostas) |

### Fluxo de Envio

1. Corretor cria campanha selecionando leads por status
2. Sistema agenda mensagens na fila com intervalo randômico (60-240s)
3. Cron chama `/process` a cada minuto
4. Cada chamada envia 1 mensagem por corretor (respeitando limites)
5. Webhook recebe respostas e detecta opt-out

### Warmup Progressivo

| Dia | Limite Diário | Limite/Hora |
|-----|---------------|-------------|
| 1-3 | 30 | 15 |
| 4-7 | 60 | 25 |
| 8-10 | 100 | 35 |
| 11-14 | 150 | 45 |
| 15+ | 250 | 60 |

### Palavras de Opt-out

`pare`, `parar`, `sair`, `remover`, `cancelar`, `spam`, `bloquear`, `não quero`, `nao quero`, `stop`, `remove`, `unsubscribe`, `para`, `chega`

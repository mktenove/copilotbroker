
# Disparador WhatsApp - Plano Completo de Implementação

## Visão Geral da Arquitetura

Sistema multi-tenant de disparo de mensagens via UAZAPI, com cada corretor tendo sua própria instância WhatsApp conectada via QR Code, fila de envio inteligente com anti-block, e integração total com o Kanban existente.

---

## 1. Estrutura do Banco de Dados

### 1.1 Tabela: `broker_whatsapp_instances`
Armazena a conexão WhatsApp de cada corretor.

```sql
CREATE TABLE broker_whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL UNIQUE,
  instance_token TEXT, -- Token da instância UAZAPI
  status TEXT NOT NULL DEFAULT 'disconnected', -- disconnected, connecting, connected, qr_pending
  phone_number TEXT,
  last_seen_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ,
  risk_score INTEGER DEFAULT 0, -- 0-100
  daily_sent_count INTEGER DEFAULT 0,
  hourly_sent_count INTEGER DEFAULT 0,
  warmup_stage TEXT DEFAULT 'new', -- new, warming, normal
  warmup_day INTEGER DEFAULT 1, -- Dia atual do aquecimento
  hourly_limit INTEGER DEFAULT 30, -- Limite por hora (começa baixo)
  daily_limit INTEGER DEFAULT 150, -- Limite por dia (começa baixo)
  working_hours_start TIME DEFAULT '09:00',
  working_hours_end TIME DEFAULT '21:00',
  is_paused BOOLEAN DEFAULT false,
  pause_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(broker_id)
);
```

### 1.2 Tabela: `whatsapp_message_templates`
Templates de mensagens para campanhas.

```sql
CREATE TABLE whatsapp_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID REFERENCES brokers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL, -- Suporta {nome}, {empreendimento}, {corretor_nome}
  category TEXT DEFAULT 'geral', -- geral, follow_up, info, docs
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.3 Tabela: `whatsapp_campaigns`
Campanhas de disparo (conjunto de mensagens para leads).

```sql
CREATE TABLE whatsapp_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_id UUID REFERENCES whatsapp_message_templates(id),
  custom_message TEXT, -- Mensagem customizada se não usar template
  target_status TEXT[], -- Status do Kanban alvo (ex: ['new', 'info_sent'])
  project_id UUID REFERENCES projects(id),
  status TEXT DEFAULT 'draft', -- draft, scheduled, running, paused, completed, cancelled
  total_leads INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.4 Tabela: `whatsapp_message_queue`
Fila de mensagens para envio.

```sql
CREATE TABLE whatsapp_message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES whatsapp_campaigns(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'queued', -- queued, scheduled, sending, sent, failed, cancelled, paused_by_system
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_code TEXT,
  error_message TEXT,
  uazapi_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.5 Tabela: `whatsapp_optouts`
Leads que solicitaram opt-out.

```sql
CREATE TABLE whatsapp_optouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  reason TEXT,
  detected_keyword TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.6 Tabela: `whatsapp_daily_stats`
Estatísticas diárias por corretor.

```sql
CREATE TABLE whatsapp_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  optout_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  UNIQUE(broker_id, date)
);
```

### 1.7 RLS Policies
Cada corretor vê apenas seus dados; admin vê tudo.

---

## 2. Edge Functions (Backend)

### 2.1 `whatsapp-instance-manager`
Gerencia instâncias UAZAPI por corretor.

```text
Endpoints:
POST /init      - Cria instância para o corretor
GET /status     - Retorna status da instância
GET /qrcode     - Retorna QR Code para pareamento
POST /logout    - Desconecta a instância
POST /restart   - Reinicia a instância
```

### 2.2 `whatsapp-message-sender`
Processa a fila de mensagens.

```text
Funcionalidades:
- Cron job a cada minuto
- Processa mensagens da fila por corretor
- Intervalo randômico 60-240s + jitter 0-5s
- Valida limites antes de enviar
- Marca opt-out automaticamente
- Registra em lead_interactions
```

### 2.3 `whatsapp-safety-engine`
Motor de segurança anti-block.

```text
Funcionalidades:
- Monitora taxa de erro
- Pausa automaticamente em risco
- Reseta contadores diários
- Gerencia warmup progressivo
- Detecta palavras de opt-out
```

### 2.4 `whatsapp-webhook`
Recebe eventos da UAZAPI.

```text
Eventos:
- Mensagem recebida (detecta opt-out)
- Status da conexão alterado
- Confirmação de entrega
```

---

## 3. Componentes Frontend

### 3.1 Nova Página: `/corretor/whatsapp`
Página principal do módulo WhatsApp com 4 abas.

### 3.2 Estrutura de Componentes

```text
src/pages/
  BrokerWhatsApp.tsx          # Página principal

src/components/whatsapp/
  index.ts                     # Barrel exports
  
  # Aba Conexão
  ConnectionTab.tsx            # Status e QR Code
  ConnectionStatusCard.tsx     # Card de status visual
  QRCodeDisplay.tsx           # Exibe QR com timer
  
  # Aba Campanhas
  CampaignsTab.tsx            # Lista de campanhas
  CampaignCard.tsx            # Card de campanha
  NewCampaignSheet.tsx        # Criar nova campanha
  CampaignDetailSheet.tsx     # Detalhes e métricas
  LeadSelector.tsx            # Seletor de leads por status
  ContactUploader.tsx         # Upload de lista CSV
  
  # Aba Fila de Envio
  QueueTab.tsx                # Tabela da fila
  QueueFilters.tsx            # Filtros avançados
  MessagePreview.tsx          # Prévia da mensagem
  
  # Aba Segurança
  SecurityTab.tsx             # Central anti-block
  RiskScoreCard.tsx           # Score de risco visual
  LimitsSettings.tsx          # Configuração de limites
  WarmupProgress.tsx          # Progresso do aquecimento
  KillSwitch.tsx              # Botão de emergência
  
  # Templates
  TemplatesSheet.tsx          # Gerenciar templates
  TemplateEditor.tsx          # Editor de template
  VariablesPicker.tsx         # Seletor de variáveis
  
  # Shared
  WhatsAppStatusBadge.tsx     # Badge de status
  MessageStats.tsx            # Estatísticas inline

src/hooks/
  use-whatsapp-instance.ts    # Hook para instância
  use-whatsapp-queue.ts       # Hook para fila
  use-whatsapp-campaigns.ts   # Hook para campanhas
  use-whatsapp-stats.ts       # Hook para métricas
```

---

## 4. UI/UX Design Premium

### 4.1 Aba Conexão
```text
┌─────────────────────────────────────────────────────────┐
│  ⚡ Conexão WhatsApp                                    │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐    │
│  │                                                 │    │
│  │   ┌─────────┐      Status: 🟢 Conectado        │    │
│  │   │ QR CODE │      Número: +55 51 99999-9999   │    │
│  │   │         │      Conectado há: 3 dias        │    │
│  │   └─────────┘      Última atividade: 2 min     │    │
│  │                                                 │    │
│  │   [🔄 Atualizar]  [🚪 Desconectar]             │    │
│  │                                                 │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─ Score de Saúde ────────────────────────────────┐    │
│  │  ████████░░░░░░░░░░░░  75/100 Bom               │    │
│  │  Enviados hoje: 45/150  │  Esta hora: 12/30    │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Aba Campanhas
```text
┌─────────────────────────────────────────────────────────┐
│  📢 Campanhas                        [+ Nova Campanha]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─ Campanha Ativa ─────────────────────────────────┐   │
│  │  🟢 Follow-up Novos Leads                        │   │
│  │  Alvo: Novos Leads │ 45 enviados │ 3 respostas  │   │
│  │  ████████████████░░░░  80% concluído            │   │
│  │  [⏸ Pausar]  [📊 Detalhes]                      │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ Rascunho ───────────────────────────────────────┐   │
│  │  ⚪ Promoção GoldenView                          │   │
│  │  Alvo: Dados Recebidos │ 28 leads               │   │
│  │  [▶ Iniciar]  [✏️ Editar]  [🗑️]                 │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 4.3 Aba Fila
```text
┌─────────────────────────────────────────────────────────┐
│  📬 Fila de Envio                   Próximo em: 2:34   │
├─────────────────────────────────────────────────────────┤
│  [🔍 Buscar...]  [Status ▼]  [Campanha ▼]  [📥 CSV]   │
├─────────────────────────────────────────────────────────┤
│  📱 João Silva          │ Agendado │ 14:32 │ Novos     │
│  📱 Maria Santos        │ Enviado  │ 14:28 │ Novos     │
│  ⚠️ Pedro Oliveira      │ Falhou   │ 14:25 │ Novos     │
│  📱 Ana Costa           │ Na fila  │ ─     │ Follow-up │
└─────────────────────────────────────────────────────────┘
```

### 4.4 Aba Segurança
```text
┌─────────────────────────────────────────────────────────┐
│  🛡️ Central de Segurança                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─ 🚨 BOTÃO DE EMERGÊNCIA ─────────────────────────┐   │
│  │        [ ⛔ PARAR TODOS OS ENVIOS ]              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ Aquecimento ────────────────────────────────────┐   │
│  │  Dia 5 de 14 │ Limite atual: 150/dia             │   │
│  │  ████████████░░░░░░░░░░  Progresso               │   │
│  │  Meta final: 300 mensagens/dia                   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ Limites Configuráveis ──────────────────────────┐   │
│  │  Limite por hora:  [30] ────────○────── [60]     │   │
│  │  Limite por dia:   [150] ───────○─────── [300]   │   │
│  │  Horário de envio: [09:00] até [21:00]           │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ Regras Anti-Spam Ativas ────────────────────────┐   │
│  │  ✓ Intervalo 60-240s entre mensagens             │   │
│  │  ✓ Máx. 2 links por mensagem                     │   │
│  │  ✓ Deduplicação (não repetir no mesmo dia)       │   │
│  │  ✓ Opt-out automático por palavras-chave         │   │
│  │  ✓ Pausa em 5 erros consecutivos                 │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Integração com Kanban

### 5.1 Botão em Cada Coluna
Adicionar ação "📲 Disparar WhatsApp" em `KanbanColumn.tsx`.

```text
┌─ Novos Leads (15) ──────────────────┐
│  [📲 Disparar WhatsApp]   [+]       │
├─────────────────────────────────────┤
│  ...cards...                        │
```

### 5.2 Modal de Disparo Rápido
Ao clicar, abre modal para:
- Escolher template ou escrever mensagem
- Ver prévia com variáveis substituídas
- Confirmar quantidade de leads
- Agendar ou iniciar imediatamente

---

## 6. Lógica de Segurança Anti-Block

### 6.1 Warmup Progressivo (14 dias)
```text
Dia 1-3:   30 msgs/dia,  15/hora
Dia 4-7:   60 msgs/dia,  25/hora
Dia 8-10:  100 msgs/dia, 35/hora
Dia 11-14: 150 msgs/dia, 45/hora
Após:      250 msgs/dia, 60/hora (máximo recomendado)
```

### 6.2 Regras de Pausa Automática
- 5 erros consecutivos de envio
- Taxa de opt-out > 5% no dia
- Desconexão da instância
- Fora do horário configurado
- Rate limit da UAZAPI atingido

### 6.3 Palavras-chave de Opt-out
```text
"pare", "parar", "sair", "remover", "cancelar", 
"spam", "bloquear", "não quero", "nao quero",
"stop", "remove", "unsubscribe"
```

### 6.4 Intervalo Randômico Real
```javascript
const getNextInterval = () => {
  const base = Math.floor(Math.random() * 180) + 60; // 60-240s
  const jitter = Math.floor(Math.random() * 5); // 0-5s extra
  return base + jitter;
};
```

---

## 7. Navegação e Rotas

### 7.1 Nova Rota
```tsx
// App.tsx
<Route path="/corretor/whatsapp" element={<BrokerWhatsApp />} />
```

### 7.2 Item na Sidebar
Adicionar ícone MessageSquare na `BrokerSidebar.tsx`.

---

## 8. Painel Administrativo (Admin)

### 8.1 Nova Página: `/admin/whatsapp`
Visão global de todos os corretores.

```text
┌─────────────────────────────────────────────────────────┐
│  📊 Painel WhatsApp - Administrador                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─ Resumo Geral ───────────────────────────────────┐   │
│  │  🟢 5 conectados  │  🔴 2 desconectados          │   │
│  │  📤 234 enviados hoje  │  ⚠️ 3 pausados          │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ Por Corretor ───────────────────────────────────┐   │
│  │  João Silva    │ 🟢 │ 45/150 │ 3 erros │ Normal  │   │
│  │  Maria Santos  │ 🟢 │ 28/150 │ 0 erros │ Normal  │   │
│  │  Pedro Costa   │ 🔴 │ 0/150  │ ─       │ Offline │   │
│  │  Ana Oliveira  │ 🟡 │ 12/150 │ 5 erros │ Pausado │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  [ ⛔ PAUSAR TODOS ]                                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 9. Fluxo de Implementação (Ordem)

### Fase 1: Fundação
1. Criar tabelas no banco de dados
2. Configurar RLS policies
3. Criar edge function `whatsapp-instance-manager`

### Fase 2: Conexão
4. Criar página `BrokerWhatsApp.tsx`
5. Implementar `ConnectionTab.tsx` com QR Code
6. Adicionar item na sidebar do corretor

### Fase 3: Fila e Envio
7. Criar edge function `whatsapp-message-sender`
8. Implementar `QueueTab.tsx`
9. Criar lógica de intervalo randômico

### Fase 4: Campanhas
10. Implementar `CampaignsTab.tsx`
11. Criar `NewCampaignSheet.tsx`
12. Integrar com Kanban (botão por coluna)

### Fase 5: Segurança
13. Criar edge function `whatsapp-safety-engine`
14. Implementar `SecurityTab.tsx`
15. Configurar warmup progressivo
16. Adicionar opt-out automático

### Fase 6: Admin e Métricas
17. Criar página admin `/admin/whatsapp`
18. Implementar métricas e relatórios
19. Adicionar logs em `lead_interactions`

---

## 10. Secrets Necessários (Já Configurados)

Os secrets UAZAPI já existem no projeto:
- `UAZAPI_INSTANCE_URL` - URL base da API
- `UAZAPI_TOKEN` - Token de autenticação

Para instâncias por corretor, cada instância terá seu próprio token salvo na tabela `broker_whatsapp_instances`.

---

## 11. Arquivos a Criar

```text
# Banco de Dados
supabase/migrations/XXXX_whatsapp_dispatcher.sql

# Edge Functions
supabase/functions/whatsapp-instance-manager/index.ts
supabase/functions/whatsapp-message-sender/index.ts
supabase/functions/whatsapp-safety-engine/index.ts
supabase/functions/whatsapp-webhook/index.ts

# Páginas
src/pages/BrokerWhatsApp.tsx
src/pages/AdminWhatsApp.tsx

# Componentes (15+ arquivos)
src/components/whatsapp/...

# Hooks (4 arquivos)
src/hooks/use-whatsapp-instance.ts
src/hooks/use-whatsapp-queue.ts
src/hooks/use-whatsapp-campaigns.ts
src/hooks/use-whatsapp-stats.ts

# Types
src/types/whatsapp.ts

# Modificações
src/App.tsx (novas rotas)
src/components/broker/BrokerSidebar.tsx (novo item)
src/components/crm/KanbanColumn.tsx (botão disparar)
```

---

## 12. Estimativa de Complexidade

| Fase | Componentes | Estimativa |
|------|-------------|------------|
| Fundação | 6 tabelas + RLS | 1 iteração |
| Conexão | 5 componentes + edge function | 2 iterações |
| Fila | 4 componentes + edge function | 2 iterações |
| Campanhas | 6 componentes + integração | 2 iterações |
| Segurança | 5 componentes + edge function | 2 iterações |
| Admin | 3 componentes + página | 1 iteração |

**Total estimado: 10-12 iterações de desenvolvimento**

---

## 13. Resultado Final

Um sistema profissional de disparo WhatsApp que:

- Permite cada corretor conectar seu próprio número via QR Code
- Dispara mensagens com intervalo randômico 60-240s
- Protege contra block com warmup, limites e opt-out
- Integra diretamente com o Kanban existente
- Oferece métricas completas e auditoria
- Design premium consistente com o resto do CRM
- Painel admin para gestão global

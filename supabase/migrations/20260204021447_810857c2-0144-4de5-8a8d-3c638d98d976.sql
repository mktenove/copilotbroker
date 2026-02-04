-- =============================================
-- WHATSAPP DISPATCHER - FASE 1: FUNDAÇÃO
-- =============================================

-- 1.1 Tabela: broker_whatsapp_instances
-- Armazena a conexão WhatsApp de cada corretor
CREATE TABLE public.broker_whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES public.brokers(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL UNIQUE,
  instance_token TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected',
  phone_number TEXT,
  last_seen_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ,
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  daily_sent_count INTEGER DEFAULT 0,
  hourly_sent_count INTEGER DEFAULT 0,
  warmup_stage TEXT DEFAULT 'new' CHECK (warmup_stage IN ('new', 'warming', 'normal')),
  warmup_day INTEGER DEFAULT 1,
  hourly_limit INTEGER DEFAULT 30,
  daily_limit INTEGER DEFAULT 150,
  working_hours_start TIME DEFAULT '09:00',
  working_hours_end TIME DEFAULT '21:00',
  is_paused BOOLEAN DEFAULT false,
  pause_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(broker_id)
);

-- 1.2 Tabela: whatsapp_message_templates
-- Templates de mensagens para campanhas
CREATE TABLE public.whatsapp_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'geral' CHECK (category IN ('geral', 'follow_up', 'info', 'docs')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.3 Tabela: whatsapp_campaigns
-- Campanhas de disparo
CREATE TABLE public.whatsapp_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES public.brokers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_id UUID REFERENCES public.whatsapp_message_templates(id) ON DELETE SET NULL,
  custom_message TEXT,
  target_status TEXT[],
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled')),
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

-- 1.4 Tabela: whatsapp_message_queue
-- Fila de mensagens para envio
CREATE TABLE public.whatsapp_message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES public.brokers(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.whatsapp_campaigns(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'scheduled', 'sending', 'sent', 'failed', 'cancelled', 'paused_by_system')),
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

-- 1.5 Tabela: whatsapp_optouts
-- Leads que solicitaram opt-out
CREATE TABLE public.whatsapp_optouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  reason TEXT,
  detected_keyword TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 1.6 Tabela: whatsapp_daily_stats
-- Estatísticas diárias por corretor
CREATE TABLE public.whatsapp_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES public.brokers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  optout_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  UNIQUE(broker_id, date)
);

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================
ALTER TABLE public.broker_whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_message_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_optouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_daily_stats ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES: broker_whatsapp_instances
-- =============================================
CREATE POLICY "Corretores podem ver sua própria instância"
ON public.broker_whatsapp_instances FOR SELECT
USING (
  broker_id = (SELECT id FROM public.brokers WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Corretores podem inserir sua própria instância"
ON public.broker_whatsapp_instances FOR INSERT
WITH CHECK (
  broker_id = (SELECT id FROM public.brokers WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Corretores podem atualizar sua própria instância"
ON public.broker_whatsapp_instances FOR UPDATE
USING (
  broker_id = (SELECT id FROM public.brokers WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins podem deletar instâncias"
ON public.broker_whatsapp_instances FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- RLS POLICIES: whatsapp_message_templates
-- =============================================
CREATE POLICY "Corretores podem ver seus templates"
ON public.whatsapp_message_templates FOR SELECT
USING (
  broker_id = (SELECT id FROM public.brokers WHERE user_id = auth.uid())
  OR broker_id IS NULL
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Corretores podem criar templates"
ON public.whatsapp_message_templates FOR INSERT
WITH CHECK (
  broker_id = (SELECT id FROM public.brokers WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Corretores podem atualizar seus templates"
ON public.whatsapp_message_templates FOR UPDATE
USING (
  broker_id = (SELECT id FROM public.brokers WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Corretores podem deletar seus templates"
ON public.whatsapp_message_templates FOR DELETE
USING (
  broker_id = (SELECT id FROM public.brokers WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- =============================================
-- RLS POLICIES: whatsapp_campaigns
-- =============================================
CREATE POLICY "Corretores podem ver suas campanhas"
ON public.whatsapp_campaigns FOR SELECT
USING (
  broker_id = (SELECT id FROM public.brokers WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Corretores podem criar campanhas"
ON public.whatsapp_campaigns FOR INSERT
WITH CHECK (
  broker_id = (SELECT id FROM public.brokers WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Corretores podem atualizar suas campanhas"
ON public.whatsapp_campaigns FOR UPDATE
USING (
  broker_id = (SELECT id FROM public.brokers WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Corretores podem deletar suas campanhas"
ON public.whatsapp_campaigns FOR DELETE
USING (
  broker_id = (SELECT id FROM public.brokers WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- =============================================
-- RLS POLICIES: whatsapp_message_queue
-- =============================================
CREATE POLICY "Corretores podem ver sua fila"
ON public.whatsapp_message_queue FOR SELECT
USING (
  broker_id = (SELECT id FROM public.brokers WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Corretores podem inserir na fila"
ON public.whatsapp_message_queue FOR INSERT
WITH CHECK (
  broker_id = (SELECT id FROM public.brokers WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Corretores podem atualizar sua fila"
ON public.whatsapp_message_queue FOR UPDATE
USING (
  broker_id = (SELECT id FROM public.brokers WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Corretores podem cancelar itens da fila"
ON public.whatsapp_message_queue FOR DELETE
USING (
  broker_id = (SELECT id FROM public.brokers WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- =============================================
-- RLS POLICIES: whatsapp_optouts
-- =============================================
CREATE POLICY "Corretores e admins podem ver optouts"
ON public.whatsapp_optouts FOR SELECT
USING (
  public.has_role(auth.uid(), 'broker')
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Sistema pode inserir optouts"
ON public.whatsapp_optouts FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins podem deletar optouts"
ON public.whatsapp_optouts FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- RLS POLICIES: whatsapp_daily_stats
-- =============================================
CREATE POLICY "Corretores podem ver suas estatísticas"
ON public.whatsapp_daily_stats FOR SELECT
USING (
  broker_id = (SELECT id FROM public.brokers WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Sistema pode inserir estatísticas"
ON public.whatsapp_daily_stats FOR INSERT
WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar estatísticas"
ON public.whatsapp_daily_stats FOR UPDATE
USING (true);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_whatsapp_queue_broker_status ON public.whatsapp_message_queue(broker_id, status);
CREATE INDEX idx_whatsapp_queue_scheduled ON public.whatsapp_message_queue(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_whatsapp_campaigns_broker ON public.whatsapp_campaigns(broker_id);
CREATE INDEX idx_whatsapp_stats_broker_date ON public.whatsapp_daily_stats(broker_id, date);
CREATE INDEX idx_whatsapp_optouts_phone ON public.whatsapp_optouts(phone);

-- =============================================
-- TRIGGERS FOR updated_at
-- =============================================
CREATE TRIGGER update_broker_whatsapp_instances_updated_at
  BEFORE UPDATE ON public.broker_whatsapp_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_leads_updated_at();

CREATE TRIGGER update_whatsapp_message_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_message_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_leads_updated_at();

CREATE TRIGGER update_whatsapp_campaigns_updated_at
  BEFORE UPDATE ON public.whatsapp_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_leads_updated_at();

CREATE TRIGGER update_whatsapp_message_queue_updated_at
  BEFORE UPDATE ON public.whatsapp_message_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_leads_updated_at();
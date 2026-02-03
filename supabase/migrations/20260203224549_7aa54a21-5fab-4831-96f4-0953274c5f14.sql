-- Tabela para rastrear sessões de login dos corretores
CREATE TABLE public.broker_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID REFERENCES brokers(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  logged_in_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  login_method TEXT DEFAULT 'password', -- 'password', 'token', 'refresh'
  ip_address TEXT,
  user_agent TEXT
);

-- Tabela para log de atividades dos corretores
CREATE TABLE public.broker_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID REFERENCES brokers(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL, -- 'login', 'lead_update', 'note_added', 'doc_processed', 'status_change'
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Índices para performance
CREATE INDEX idx_broker_sessions_broker_id ON public.broker_sessions(broker_id);
CREATE INDEX idx_broker_sessions_logged_in_at ON public.broker_sessions(logged_in_at DESC);
CREATE INDEX idx_broker_activity_logs_broker_id ON public.broker_activity_logs(broker_id);
CREATE INDEX idx_broker_activity_logs_created_at ON public.broker_activity_logs(created_at DESC);
CREATE INDEX idx_broker_activity_logs_activity_type ON public.broker_activity_logs(activity_type);

-- Habilitar RLS
ALTER TABLE public.broker_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_activity_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para broker_sessions
CREATE POLICY "Admins podem ver todas as sessões"
  ON public.broker_sessions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Corretores veem suas sessões"
  ON public.broker_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Usuários podem registrar sua sessão"
  ON public.broker_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sistema pode atualizar sessões"
  ON public.broker_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Políticas para broker_activity_logs
CREATE POLICY "Admins podem ver todos os logs"
  ON public.broker_activity_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Corretores veem seus logs"
  ON public.broker_activity_logs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Usuários podem registrar suas atividades"
  ON public.broker_activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Migração 2: Tabelas, colunas, funções, RLS, triggers e indexes

-- Novo enum distribution_status
CREATE TYPE public.distribution_status AS ENUM (
  'atribuicao_inicial',
  'reassinado_timeout',
  'fallback_lider',
  'atendimento_iniciado'
);

-- Adicionar lider_id na tabela brokers
ALTER TABLE public.brokers ADD COLUMN IF NOT EXISTS lider_id uuid REFERENCES public.brokers(id);

-- Novos campos na tabela leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS roleta_id uuid,
  ADD COLUMN IF NOT EXISTS corretor_atribuido_id uuid REFERENCES public.brokers(id),
  ADD COLUMN IF NOT EXISTS atribuido_em timestamptz,
  ADD COLUMN IF NOT EXISTS atendimento_iniciado_em timestamptz,
  ADD COLUMN IF NOT EXISTS reserva_expira_em timestamptz,
  ADD COLUMN IF NOT EXISTS status_distribuicao public.distribution_status,
  ADD COLUMN IF NOT EXISTS motivo_atribuicao text;

-- Tabela roletas
CREATE TABLE public.roletas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  lider_id uuid NOT NULL REFERENCES public.brokers(id),
  tempo_reserva_minutos int NOT NULL DEFAULT 10,
  ativa boolean NOT NULL DEFAULT true,
  ultimo_membro_ordem_atribuida int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.roletas ENABLE ROW LEVEL SECURITY;

-- Tabela roletas_membros
CREATE TABLE public.roletas_membros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roleta_id uuid NOT NULL REFERENCES public.roletas(id) ON DELETE CASCADE,
  corretor_id uuid NOT NULL REFERENCES public.brokers(id),
  ordem int NOT NULL,
  status_checkin boolean NOT NULL DEFAULT false,
  checkin_em timestamptz,
  checkout_em timestamptz,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(roleta_id, corretor_id)
);
ALTER TABLE public.roletas_membros ENABLE ROW LEVEL SECURITY;

-- Tabela roletas_empreendimentos
CREATE TABLE public.roletas_empreendimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roleta_id uuid NOT NULL REFERENCES public.roletas(id) ON DELETE CASCADE,
  empreendimento_id uuid NOT NULL REFERENCES public.projects(id),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.roletas_empreendimentos ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_unique_empreendimento_roleta_ativa
  ON public.roletas_empreendimentos (empreendimento_id)
  WHERE ativo = true;

-- Tabela roletas_log
CREATE TABLE public.roletas_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roleta_id uuid NOT NULL REFERENCES public.roletas(id),
  lead_id uuid REFERENCES public.leads(id),
  acao text NOT NULL,
  de_corretor_id uuid REFERENCES public.brokers(id),
  para_corretor_id uuid REFERENCES public.brokers(id),
  motivo text,
  executado_por_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.roletas_log ENABLE ROW LEVEL SECURITY;

-- FK leads.roleta_id
ALTER TABLE public.leads
  ADD CONSTRAINT leads_roleta_id_fkey FOREIGN KEY (roleta_id) REFERENCES public.roletas(id);

-- Funções security definer
CREATE OR REPLACE FUNCTION public.has_role_or_leader(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'leader')
  )
$$;

CREATE OR REPLACE FUNCTION public.get_my_broker_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.brokers WHERE user_id = auth.uid() LIMIT 1
$$;

-- RLS: ROLETAS
CREATE POLICY "Admins e leaders podem gerenciar roletas"
  ON public.roletas FOR ALL
  USING (public.has_role_or_leader(auth.uid()));

CREATE POLICY "Corretores podem ver roletas onde sao membros"
  ON public.roletas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.roletas_membros
      WHERE roletas_membros.roleta_id = roletas.id
        AND roletas_membros.corretor_id = public.get_my_broker_id()
        AND roletas_membros.ativo = true
    )
  );

-- RLS: ROLETAS_MEMBROS
CREATE POLICY "Admins e leaders gerenciam membros"
  ON public.roletas_membros FOR ALL
  USING (public.has_role_or_leader(auth.uid()));

CREATE POLICY "Corretores veem membros das suas roletas"
  ON public.roletas_membros FOR SELECT
  USING (
    corretor_id = public.get_my_broker_id()
    OR EXISTS (
      SELECT 1 FROM public.roletas_membros rm2
      WHERE rm2.roleta_id = roletas_membros.roleta_id
        AND rm2.corretor_id = public.get_my_broker_id()
        AND rm2.ativo = true
    )
  );

CREATE POLICY "Corretores podem fazer checkin checkout"
  ON public.roletas_membros FOR UPDATE
  USING (corretor_id = public.get_my_broker_id())
  WITH CHECK (corretor_id = public.get_my_broker_id());

-- RLS: ROLETAS_EMPREENDIMENTOS
CREATE POLICY "Admins e leaders gerenciam empreendimentos da roleta"
  ON public.roletas_empreendimentos FOR ALL
  USING (public.has_role_or_leader(auth.uid()));

CREATE POLICY "Corretores veem empreendimentos das suas roletas"
  ON public.roletas_empreendimentos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.roletas_membros
      WHERE roletas_membros.roleta_id = roletas_empreendimentos.roleta_id
        AND roletas_membros.corretor_id = public.get_my_broker_id()
        AND roletas_membros.ativo = true
    )
  );

-- RLS: ROLETAS_LOG
CREATE POLICY "Admins e leaders veem logs de roleta"
  ON public.roletas_log FOR ALL
  USING (public.has_role_or_leader(auth.uid()));

CREATE POLICY "Corretores veem logs das suas roletas"
  ON public.roletas_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.roletas_membros
      WHERE roletas_membros.roleta_id = roletas_log.roleta_id
        AND roletas_membros.corretor_id = public.get_my_broker_id()
        AND roletas_membros.ativo = true
    )
  );

CREATE POLICY "Sistema pode inserir logs de roleta"
  ON public.roletas_log FOR INSERT
  WITH CHECK (true);

-- Triggers updated_at
CREATE TRIGGER update_roletas_updated_at
  BEFORE UPDATE ON public.roletas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_leads_updated_at();

CREATE TRIGGER update_roletas_membros_updated_at
  BEFORE UPDATE ON public.roletas_membros
  FOR EACH ROW
  EXECUTE FUNCTION public.update_leads_updated_at();

-- Trigger auto-distribuir lead via pg_net
CREATE OR REPLACE FUNCTION public.trigger_roleta_distribuir()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _has_roleta boolean;
BEGIN
  IF NEW.broker_id IS NULL AND NEW.project_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.roletas_empreendimentos re
      JOIN public.roletas r ON r.id = re.roleta_id
      WHERE re.empreendimento_id = NEW.project_id
        AND re.ativo = true
        AND r.ativa = true
    ) INTO _has_roleta;

    IF _has_roleta THEN
      PERFORM net.http_post(
        url := 'https://nckzxwxxtyeydolmdijn.supabase.co/functions/v1/roleta-distribuir',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ja3p4d3h4dHlleWRvbG1kaWpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NjU4NDksImV4cCI6MjA4MzA0MTg0OX0.fjECugk1tkmhBNrR-030CJo6kB-_t8BLPYzhKCzTf1E"}'::jsonb,
        body := jsonb_build_object('lead_id', NEW.id, 'project_id', NEW.project_id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_lead_roleta_distribuir
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_roleta_distribuir();

-- Indexes
CREATE INDEX idx_leads_reserva_expira ON public.leads (reserva_expira_em) WHERE reserva_expira_em IS NOT NULL AND atendimento_iniciado_em IS NULL;
CREATE INDEX idx_roletas_membros_checkin ON public.roletas_membros (roleta_id, ordem) WHERE status_checkin = true AND ativo = true;
CREATE INDEX idx_roletas_empreendimentos_ativo ON public.roletas_empreendimentos (empreendimento_id) WHERE ativo = true;

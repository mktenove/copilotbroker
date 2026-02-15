
CREATE TABLE public.propostas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id),
  broker_id uuid,
  created_by uuid,
  unidade text,
  valor_proposta numeric NOT NULL,
  valor_entrada numeric,
  forma_pagamento_entrada text DEFAULT 'a_vista',
  parcelamento text,
  permuta boolean DEFAULT false,
  descricao_permuta text,
  observacoes_corretor text,
  condicoes_especiais text,
  status_proposta text DEFAULT 'pendente',
  enviada_vendedor_em timestamptz,
  aprovada_em timestamptz,
  rejeitada_em timestamptz,
  motivo_rejeicao text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access propostas"
  ON public.propostas FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Corretores select
CREATE POLICY "Corretores select propostas"
  ON public.propostas FOR SELECT
  USING (has_role(auth.uid(), 'broker') AND lead_id IN (
    SELECT id FROM leads WHERE broker_id = get_my_broker_id()
  ));

-- Corretores insert
CREATE POLICY "Corretores insert propostas"
  ON public.propostas FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'broker') AND lead_id IN (
    SELECT id FROM leads WHERE broker_id = get_my_broker_id()
  ));

-- Corretores update
CREATE POLICY "Corretores update propostas"
  ON public.propostas FOR UPDATE
  USING (has_role(auth.uid(), 'broker') AND lead_id IN (
    SELECT id FROM leads WHERE broker_id = get_my_broker_id()
  ));

-- Lideres select
CREATE POLICY "Lideres select propostas"
  ON public.propostas FOR SELECT
  USING (has_role(auth.uid(), 'leader') AND lead_id IN (
    SELECT id FROM leads WHERE broker_id IN (
      SELECT id FROM brokers WHERE lider_id = get_my_broker_id()
    )
  ));

-- Lideres update
CREATE POLICY "Lideres update propostas"
  ON public.propostas FOR UPDATE
  USING (has_role(auth.uid(), 'leader') AND lead_id IN (
    SELECT id FROM leads WHERE broker_id IN (
      SELECT id FROM brokers WHERE lider_id = get_my_broker_id()
    )
  ));

-- Updated_at trigger
CREATE TRIGGER update_propostas_updated_at
  BEFORE UPDATE ON public.propostas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_leads_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.propostas;

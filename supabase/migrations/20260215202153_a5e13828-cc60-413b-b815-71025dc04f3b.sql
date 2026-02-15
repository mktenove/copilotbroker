
CREATE TABLE public.proposta_parcelas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  proposta_id uuid NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'entrada',
  valor numeric NOT NULL,
  quantidade_parcelas integer,
  valor_parcela numeric,
  descricao text,
  indice_correcao text,
  observacao text,
  ordem integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.proposta_parcelas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access proposta_parcelas"
  ON public.proposta_parcelas FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Corretores select proposta_parcelas"
  ON public.proposta_parcelas FOR SELECT
  USING (has_role(auth.uid(), 'broker'::app_role) AND proposta_id IN (
    SELECT id FROM propostas WHERE lead_id IN (
      SELECT id FROM leads WHERE broker_id = get_my_broker_id()
    )
  ));

CREATE POLICY "Corretores insert proposta_parcelas"
  ON public.proposta_parcelas FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'broker'::app_role) AND proposta_id IN (
    SELECT id FROM propostas WHERE lead_id IN (
      SELECT id FROM leads WHERE broker_id = get_my_broker_id()
    )
  ));

CREATE POLICY "Corretores delete proposta_parcelas"
  ON public.proposta_parcelas FOR DELETE
  USING (has_role(auth.uid(), 'broker'::app_role) AND proposta_id IN (
    SELECT id FROM propostas WHERE lead_id IN (
      SELECT id FROM leads WHERE broker_id = get_my_broker_id()
    )
  ));

CREATE POLICY "Lideres select proposta_parcelas"
  ON public.proposta_parcelas FOR SELECT
  USING (has_role(auth.uid(), 'leader'::app_role) AND proposta_id IN (
    SELECT id FROM propostas WHERE lead_id IN (
      SELECT id FROM leads WHERE broker_id IN (
        SELECT id FROM brokers WHERE lider_id = get_my_broker_id()
      )
    )
  ));

ALTER PUBLICATION supabase_realtime ADD TABLE public.proposta_parcelas;

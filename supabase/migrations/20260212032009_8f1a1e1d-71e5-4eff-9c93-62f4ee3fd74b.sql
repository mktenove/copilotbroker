
-- Leaders can view leads of their team members
CREATE POLICY "Lideres podem ver leads da equipe"
ON public.leads
FOR SELECT
USING (
  has_role(auth.uid(), 'leader'::app_role)
  AND broker_id IN (
    SELECT id FROM public.brokers WHERE lider_id = get_my_broker_id()
  )
);

-- Leaders can update leads of their team members
CREATE POLICY "Lideres podem atualizar leads da equipe"
ON public.leads
FOR UPDATE
USING (
  has_role(auth.uid(), 'leader'::app_role)
  AND broker_id IN (
    SELECT id FROM public.brokers WHERE lider_id = get_my_broker_id()
  )
);

-- Leaders can view interactions of their team's leads
CREATE POLICY "Lideres podem ver interacoes da equipe"
ON public.lead_interactions
FOR SELECT
USING (
  has_role(auth.uid(), 'leader'::app_role)
  AND lead_id IN (
    SELECT id FROM public.leads WHERE broker_id IN (
      SELECT id FROM public.brokers WHERE lider_id = get_my_broker_id()
    )
  )
);

-- Leaders can insert interactions on their team's leads
CREATE POLICY "Lideres podem inserir interacoes da equipe"
ON public.lead_interactions
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'leader'::app_role)
  AND lead_id IN (
    SELECT id FROM public.leads WHERE broker_id IN (
      SELECT id FROM public.brokers WHERE lider_id = get_my_broker_id()
    )
  )
);

-- Leaders can view documents of their team's leads
CREATE POLICY "Lideres podem ver documentos da equipe"
ON public.lead_documents
FOR SELECT
USING (
  has_role(auth.uid(), 'leader'::app_role)
  AND lead_id IN (
    SELECT id FROM public.leads WHERE broker_id IN (
      SELECT id FROM public.brokers WHERE lider_id = get_my_broker_id()
    )
  )
);

-- Leaders can update documents of their team's leads
CREATE POLICY "Lideres podem atualizar documentos da equipe"
ON public.lead_documents
FOR UPDATE
USING (
  has_role(auth.uid(), 'leader'::app_role)
  AND lead_id IN (
    SELECT id FROM public.leads WHERE broker_id IN (
      SELECT id FROM public.brokers WHERE lider_id = get_my_broker_id()
    )
  )
);

-- Leaders can view attribution of their team's leads
CREATE POLICY "Lideres podem ver attribution da equipe"
ON public.lead_attribution
FOR SELECT
USING (
  has_role(auth.uid(), 'leader'::app_role)
  AND lead_id IN (
    SELECT id FROM public.leads WHERE broker_id IN (
      SELECT id FROM public.brokers WHERE lider_id = get_my_broker_id()
    )
  )
);

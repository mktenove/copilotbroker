CREATE TABLE public.auto_cadencia_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES public.broker_auto_cadencia_rules(id) ON DELETE CASCADE,
  step_order integer NOT NULL DEFAULT 1,
  message_content text NOT NULL,
  delay_minutes integer NOT NULL DEFAULT 0,
  send_if_replied boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.auto_cadencia_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Corretores podem ver steps das suas regras"
  ON public.auto_cadencia_steps FOR SELECT
  USING (
    rule_id IN (
      SELECT id FROM public.broker_auto_cadencia_rules
      WHERE broker_id = (SELECT id FROM brokers WHERE user_id = auth.uid())
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Corretores podem inserir steps"
  ON public.auto_cadencia_steps FOR INSERT
  WITH CHECK (
    rule_id IN (
      SELECT id FROM public.broker_auto_cadencia_rules
      WHERE broker_id = (SELECT id FROM brokers WHERE user_id = auth.uid())
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Corretores podem deletar steps"
  ON public.auto_cadencia_steps FOR DELETE
  USING (
    rule_id IN (
      SELECT id FROM public.broker_auto_cadencia_rules
      WHERE broker_id = (SELECT id FROM brokers WHERE user_id = auth.uid())
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );
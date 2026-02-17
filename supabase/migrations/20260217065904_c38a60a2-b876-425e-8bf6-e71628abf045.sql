
-- Create table for auto-cadencia rules
CREATE TABLE public.broker_auto_cadencia_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id uuid NOT NULL REFERENCES public.brokers(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(broker_id, project_id)
);

-- Enable RLS
ALTER TABLE public.broker_auto_cadencia_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as broker_auto_message_rules)
CREATE POLICY "Corretores podem ver suas regras cadencia"
  ON public.broker_auto_cadencia_rules FOR SELECT
  USING (
    broker_id = (SELECT id FROM brokers WHERE user_id = auth.uid() LIMIT 1)
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Corretores podem criar suas regras cadencia"
  ON public.broker_auto_cadencia_rules FOR INSERT
  WITH CHECK (
    broker_id = (SELECT id FROM brokers WHERE user_id = auth.uid() LIMIT 1)
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Corretores podem atualizar suas regras cadencia"
  ON public.broker_auto_cadencia_rules FOR UPDATE
  USING (
    broker_id = (SELECT id FROM brokers WHERE user_id = auth.uid() LIMIT 1)
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Corretores podem deletar suas regras cadencia"
  ON public.broker_auto_cadencia_rules FOR DELETE
  USING (
    broker_id = (SELECT id FROM brokers WHERE user_id = auth.uid() LIMIT 1)
    OR has_role(auth.uid(), 'admin')
  );

-- Trigger for updated_at
CREATE TRIGGER update_broker_auto_cadencia_rules_updated_at
  BEFORE UPDATE ON public.broker_auto_cadencia_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_auto_message_rules_updated_at();

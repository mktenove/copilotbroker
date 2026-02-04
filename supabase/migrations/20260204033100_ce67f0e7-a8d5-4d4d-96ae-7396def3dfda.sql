-- =============================================
-- FASE 1: Schema para Primeira Mensagem Automática
-- =============================================

-- 1. Criar tabela de regras de automação por corretor
CREATE TABLE public.broker_auto_message_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES public.brokers(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  message_content TEXT NOT NULL,
  delay_minutes INTEGER DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT delay_minutes_range CHECK (delay_minutes >= 1 AND delay_minutes <= 5),
  CONSTRAINT unique_broker_project UNIQUE(broker_id, project_id)
);

-- 2. Adicionar colunas de rastreamento na tabela leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS auto_first_message_sent BOOLEAN DEFAULT false;

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS auto_first_message_at TIMESTAMPTZ;

-- 3. Habilitar RLS
ALTER TABLE public.broker_auto_message_rules ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS para broker_auto_message_rules
CREATE POLICY "Corretores podem ver suas regras"
ON public.broker_auto_message_rules
FOR SELECT
USING (
  broker_id = (SELECT id FROM brokers WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Corretores podem criar suas regras"
ON public.broker_auto_message_rules
FOR INSERT
WITH CHECK (
  broker_id = (SELECT id FROM brokers WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Corretores podem atualizar suas regras"
ON public.broker_auto_message_rules
FOR UPDATE
USING (
  broker_id = (SELECT id FROM brokers WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Corretores podem deletar suas regras"
ON public.broker_auto_message_rules
FOR DELETE
USING (
  broker_id = (SELECT id FROM brokers WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 5. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_auto_message_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_broker_auto_message_rules_updated_at
BEFORE UPDATE ON public.broker_auto_message_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_auto_message_rules_updated_at();

-- 6. Índice para busca rápida por broker e projeto
CREATE INDEX idx_auto_message_rules_broker ON public.broker_auto_message_rules(broker_id);
CREATE INDEX idx_auto_message_rules_project ON public.broker_auto_message_rules(project_id);

-- 7. Índice para busca de leads que precisam de mensagem automática
CREATE INDEX idx_leads_auto_message ON public.leads(auto_first_message_sent) WHERE auto_first_message_sent = false;
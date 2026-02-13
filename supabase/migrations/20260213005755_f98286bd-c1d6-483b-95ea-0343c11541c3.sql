
-- Create campaign_steps table
CREATE TABLE public.campaign_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL DEFAULT 1,
  message_content TEXT NOT NULL,
  delay_minutes INTEGER NOT NULL DEFAULT 0,
  template_id UUID REFERENCES public.whatsapp_message_templates(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_steps ENABLE ROW LEVEL SECURITY;

-- RLS: Brokers can see steps of their campaigns
CREATE POLICY "Corretores podem ver steps das suas campanhas"
ON public.campaign_steps
FOR SELECT
USING (
  campaign_id IN (
    SELECT id FROM public.whatsapp_campaigns
    WHERE broker_id = (SELECT id FROM public.brokers WHERE user_id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- RLS: Brokers can insert steps in their campaigns
CREATE POLICY "Corretores podem criar steps"
ON public.campaign_steps
FOR INSERT
WITH CHECK (
  campaign_id IN (
    SELECT id FROM public.whatsapp_campaigns
    WHERE broker_id = (SELECT id FROM public.brokers WHERE user_id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- RLS: Brokers can delete steps of their campaigns
CREATE POLICY "Corretores podem deletar steps"
ON public.campaign_steps
FOR DELETE
USING (
  campaign_id IN (
    SELECT id FROM public.whatsapp_campaigns
    WHERE broker_id = (SELECT id FROM public.brokers WHERE user_id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Add step_number to message queue
ALTER TABLE public.whatsapp_message_queue
ADD COLUMN step_number INTEGER;

-- Index for efficient lookups
CREATE INDEX idx_campaign_steps_campaign_id ON public.campaign_steps(campaign_id);
CREATE INDEX idx_campaign_steps_order ON public.campaign_steps(campaign_id, step_order);

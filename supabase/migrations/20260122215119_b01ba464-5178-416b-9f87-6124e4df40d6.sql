-- Create enum for lead status
CREATE TYPE public.lead_status AS ENUM (
  'new',
  'info_sent',
  'awaiting_docs',
  'docs_received',
  'registered'
);

-- Create enum for interaction type
CREATE TYPE public.interaction_type AS ENUM (
  'status_change',
  'note_added',
  'document_request',
  'document_received',
  'info_sent',
  'contact_attempt',
  'registration'
);

-- Add new columns to leads table
ALTER TABLE public.leads
ADD COLUMN status public.lead_status NOT NULL DEFAULT 'new',
ADD COLUMN email text,
ADD COLUMN cpf text,
ADD COLUMN notes text,
ADD COLUMN last_interaction_at timestamptz DEFAULT now(),
ADD COLUMN registered_at timestamptz,
ADD COLUMN registered_by uuid;

-- Create lead_interactions table for timeline/history
CREATE TABLE public.lead_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  broker_id uuid REFERENCES public.brokers(id),
  interaction_type public.interaction_type NOT NULL,
  channel text,
  notes text,
  old_status public.lead_status,
  new_status public.lead_status,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

-- Create lead_documents table for document checklist
CREATE TABLE public.lead_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  is_received boolean NOT NULL DEFAULT false,
  received_at timestamptz,
  received_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_broker_status ON public.leads(broker_id, status);
CREATE INDEX idx_lead_interactions_lead_id ON public.lead_interactions(lead_id);
CREATE INDEX idx_lead_documents_lead_id ON public.lead_documents(lead_id);

-- Enable RLS on new tables
ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for lead_interactions
CREATE POLICY "Admins podem ver todas as interacoes"
ON public.lead_interactions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Corretores podem ver interacoes dos seus leads"
ON public.lead_interactions
FOR SELECT
USING (
  has_role(auth.uid(), 'broker'::app_role) 
  AND lead_id IN (
    SELECT id FROM public.leads 
    WHERE broker_id = (SELECT id FROM public.brokers WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Corretores podem inserir interacoes nos seus leads"
ON public.lead_interactions
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'broker'::app_role) 
  AND lead_id IN (
    SELECT id FROM public.leads 
    WHERE broker_id = (SELECT id FROM public.brokers WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Admins podem inserir interacoes"
ON public.lead_interactions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for lead_documents
CREATE POLICY "Admins podem ver todos os documentos"
ON public.lead_documents
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Corretores podem ver documentos dos seus leads"
ON public.lead_documents
FOR SELECT
USING (
  has_role(auth.uid(), 'broker'::app_role) 
  AND lead_id IN (
    SELECT id FROM public.leads 
    WHERE broker_id = (SELECT id FROM public.brokers WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Corretores podem inserir documentos nos seus leads"
ON public.lead_documents
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'broker'::app_role) 
  AND lead_id IN (
    SELECT id FROM public.leads 
    WHERE broker_id = (SELECT id FROM public.brokers WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Corretores podem atualizar documentos dos seus leads"
ON public.lead_documents
FOR UPDATE
USING (
  has_role(auth.uid(), 'broker'::app_role) 
  AND lead_id IN (
    SELECT id FROM public.leads 
    WHERE broker_id = (SELECT id FROM public.brokers WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Admins podem gerenciar documentos"
ON public.lead_documents
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update leads RLS to allow brokers to update their leads
CREATE POLICY "Corretores podem atualizar seus leads"
ON public.leads
FOR UPDATE
USING (
  has_role(auth.uid(), 'broker'::app_role) 
  AND broker_id = (SELECT id FROM public.brokers WHERE user_id = auth.uid())
);

CREATE POLICY "Admins podem atualizar leads"
ON public.leads
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to update last_interaction_at when interaction is added
CREATE OR REPLACE FUNCTION public.update_lead_last_interaction()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.leads
  SET last_interaction_at = NEW.created_at
  WHERE id = NEW.lead_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for auto-updating last_interaction_at
CREATE TRIGGER on_lead_interaction_insert
AFTER INSERT ON public.lead_interactions
FOR EACH ROW
EXECUTE FUNCTION public.update_lead_last_interaction();
-- Create page_views table for tracking site visits
CREATE TABLE public.page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path TEXT NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create lead_attribution table for tracking lead sources
CREATE TABLE public.lead_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  landing_page TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on page_views
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Allow public insert for tracking (anonymous visitors)
CREATE POLICY "Permitir inserção pública de page views"
ON public.page_views
FOR INSERT
WITH CHECK (true);

-- Only admins can read page views
CREATE POLICY "Admins podem ver page views"
ON public.page_views
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable RLS on lead_attribution
ALTER TABLE public.lead_attribution ENABLE ROW LEVEL SECURITY;

-- Allow public insert for attribution tracking
CREATE POLICY "Permitir inserção pública de lead attribution"
ON public.lead_attribution
FOR INSERT
WITH CHECK (true);

-- Only admins can read lead attribution
CREATE POLICY "Admins podem ver lead attribution"
ON public.lead_attribution
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Brokers can see their own leads attribution
CREATE POLICY "Corretores podem ver attribution de seus leads"
ON public.lead_attribution
FOR SELECT
USING (
  has_role(auth.uid(), 'broker'::app_role) AND 
  lead_id IN (
    SELECT id FROM public.leads 
    WHERE broker_id = (SELECT id FROM public.brokers WHERE user_id = auth.uid())
  )
);

-- Create index for faster queries
CREATE INDEX idx_page_views_created_at ON public.page_views(created_at DESC);
CREATE INDEX idx_page_views_page_path ON public.page_views(page_path);
CREATE INDEX idx_page_views_utm_source ON public.page_views(utm_source);
CREATE INDEX idx_lead_attribution_lead_id ON public.lead_attribution(lead_id);
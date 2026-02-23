
-- Add utm_content and utm_term to lead_attribution
ALTER TABLE public.lead_attribution ADD COLUMN IF NOT EXISTS utm_content text;
ALTER TABLE public.lead_attribution ADD COLUMN IF NOT EXISTS utm_term text;

-- Add utm_content and utm_term to page_views
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS utm_content text;
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS utm_term text;

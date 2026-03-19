-- Add interest detail fields to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS interest_city text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS interest_bedrooms integer;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS interest_pool boolean DEFAULT false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS interest_tags text[];

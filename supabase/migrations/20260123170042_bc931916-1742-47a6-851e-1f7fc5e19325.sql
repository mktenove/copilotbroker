-- Adicionar campo de origem do lead
ALTER TABLE public.leads ADD COLUMN lead_origin text DEFAULT NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.leads.lead_origin IS 'Canal de origem do lead (Meta, Google Ads, etc)';
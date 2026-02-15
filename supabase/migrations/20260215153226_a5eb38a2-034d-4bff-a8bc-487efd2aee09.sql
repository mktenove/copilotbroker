
-- Add lead_origin_detail column
ALTER TABLE public.leads ADD COLUMN lead_origin_detail text;

-- Normalize existing origins: Metaads (...) -> meta_ads + extract detail
UPDATE public.leads
SET 
  lead_origin_detail = CASE 
    WHEN lead_origin LIKE 'Metaads (%) - %' THEN substring(lead_origin FROM 'Metaads \([^)]+\) - (.+)$')
    ELSE NULL
  END,
  lead_origin = 'meta_ads'
WHERE lead_origin LIKE 'Metaads (%';

-- Meta ADS (simple)
UPDATE public.leads SET lead_origin = 'meta_ads' WHERE lead_origin = 'Meta ADS';

-- Meta Ads (auto) / Google Ads (auto) / TikTok Ads (auto) etc
UPDATE public.leads SET lead_origin = 'meta_ads' WHERE lead_origin = 'Meta Ads (auto)';
UPDATE public.leads SET lead_origin = 'google_ads' WHERE lead_origin = 'Google Ads (auto)';
UPDATE public.leads SET lead_origin = 'TikTok Ads (auto)' WHERE lead_origin = 'TikTok Ads (auto)';

-- Organic
UPDATE public.leads SET lead_origin = 'google_organico' WHERE lead_origin = 'Google (Orgânico)';
UPDATE public.leads SET lead_origin = 'meta_organico' WHERE lead_origin = 'Instagram Orgânico';

-- Referrals - normalize to referral format  
UPDATE public.leads SET lead_origin = 'indicacao' WHERE lead_origin = 'Indicação';
UPDATE public.leads SET lead_origin = 'whatsapp_direto' WHERE lead_origin = 'WhatsApp Direto';
UPDATE public.leads SET lead_origin = 'plantao_enove' WHERE lead_origin = 'Plantão';

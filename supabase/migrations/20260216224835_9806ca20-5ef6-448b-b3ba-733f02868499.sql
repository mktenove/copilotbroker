
CREATE TABLE public.whatsapp_lead_replies (
  phone TEXT NOT NULL,
  campaign_id UUID NOT NULL REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE,
  replied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (phone, campaign_id)
);

CREATE INDEX idx_whatsapp_lead_replies_phone ON public.whatsapp_lead_replies(phone);

ALTER TABLE public.whatsapp_lead_replies ENABLE ROW LEVEL SECURITY;

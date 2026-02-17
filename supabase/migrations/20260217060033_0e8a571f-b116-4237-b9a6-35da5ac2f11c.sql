ALTER TABLE public.whatsapp_campaigns ADD COLUMN lead_id uuid REFERENCES public.leads(id);

-- Enable realtime for whatsapp_campaigns to track cadence status changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_campaigns;
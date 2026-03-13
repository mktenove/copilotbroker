-- Allow standalone brokers (no tenant) to create WhatsApp instances
ALTER TABLE public.broker_whatsapp_instances
  ALTER COLUMN tenant_id DROP NOT NULL;

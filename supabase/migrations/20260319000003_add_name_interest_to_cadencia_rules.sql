-- Add name and interest_type to broker_auto_cadencia_rules
ALTER TABLE public.broker_auto_cadencia_rules ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.broker_auto_cadencia_rules ADD COLUMN IF NOT EXISTS interest_type text;

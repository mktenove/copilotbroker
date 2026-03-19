-- Add project_status_filter to cadencia rules
-- Allows rules to only trigger for leads from projects with a specific status
ALTER TABLE public.broker_auto_cadencia_rules
  ADD COLUMN IF NOT EXISTS project_status_filter text;

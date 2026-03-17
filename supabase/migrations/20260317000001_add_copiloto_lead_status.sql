-- Add 'copiloto' value to lead_status enum
-- Represents leads currently in automatic follow-up (cadencia ativa)
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'copiloto' AFTER 'info_sent';

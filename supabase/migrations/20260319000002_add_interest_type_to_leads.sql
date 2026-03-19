-- Add interest_type column to leads for leads without a project
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS interest_type text;

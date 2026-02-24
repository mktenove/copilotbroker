
-- Drop the old CHECK constraint and add updated one with roleta_lead
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('new_lead', 'stale_lead', 'status_change', 'roleta_lead'));

ALTER TABLE public.roletas_log
  DROP CONSTRAINT roletas_log_lead_id_fkey;

ALTER TABLE public.roletas_log
  ADD CONSTRAINT roletas_log_lead_id_fkey
  FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;
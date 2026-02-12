
-- Alterar FK roletas_log.roleta_id para CASCADE
ALTER TABLE public.roletas_log
  DROP CONSTRAINT roletas_log_roleta_id_fkey,
  ADD CONSTRAINT roletas_log_roleta_id_fkey
    FOREIGN KEY (roleta_id) REFERENCES public.roletas(id) ON DELETE CASCADE;

-- Alterar FK leads.roleta_id para SET NULL
ALTER TABLE public.leads
  DROP CONSTRAINT leads_roleta_id_fkey,
  ADD CONSTRAINT leads_roleta_id_fkey
    FOREIGN KEY (roleta_id) REFERENCES public.roletas(id) ON DELETE SET NULL;


-- Composite index for kanban column queries (status + broker + ordering)
CREATE INDEX IF NOT EXISTS idx_leads_status_broker_interaction 
  ON public.leads (status, broker_id, last_interaction_at DESC);

-- Index for project filtering within kanban
CREATE INDEX IF NOT EXISTS idx_leads_status_project 
  ON public.leads (status, project_id, last_interaction_at DESC);

-- Index for origin filtering
CREATE INDEX IF NOT EXISTS idx_leads_lead_origin 
  ON public.leads (lead_origin) WHERE lead_origin IS NOT NULL;

-- Index for search by name (trigram would be better but ilike is sufficient)
CREATE INDEX IF NOT EXISTS idx_leads_name_trgm 
  ON public.leads USING btree (name text_pattern_ops);

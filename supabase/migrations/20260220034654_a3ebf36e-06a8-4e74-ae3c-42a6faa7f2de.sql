-- Leads por broker + status (Kanban, filtros)
CREATE INDEX IF NOT EXISTS idx_leads_broker_id_status ON leads(broker_id, status);

-- Leads por data de criacao (Admin, Analytics, Intelligence)
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- Leads por projeto
CREATE INDEX IF NOT EXISTS idx_leads_project_id ON leads(project_id);

-- Interacoes por lead (Timeline, detalhes)
CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead_id ON lead_interactions(lead_id, created_at DESC);

-- Interacoes por data (Analytics, Intelligence)
CREATE INDEX IF NOT EXISTS idx_lead_interactions_created_at ON lead_interactions(created_at DESC);

-- Page views por data (Analytics)
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at DESC);

-- Fila WhatsApp por status (processamento)
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_status ON whatsapp_message_queue(status, scheduled_at);
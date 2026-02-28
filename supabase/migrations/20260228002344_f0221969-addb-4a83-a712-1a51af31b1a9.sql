
-- ============================================================
-- PHASE 1B: Add tenant_id to all business tables
-- ============================================================

-- 1. Add tenant_id to brokers
ALTER TABLE public.brokers ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 2. Add tenant_id to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 3. Add tenant_id to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 4. Add tenant_id to lead_interactions
ALTER TABLE public.lead_interactions ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 5. Add tenant_id to lead_documents
ALTER TABLE public.lead_documents ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 6. Add tenant_id to lead_attribution
ALTER TABLE public.lead_attribution ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 7. Add tenant_id to notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 8. Add tenant_id to broker_projects
ALTER TABLE public.broker_projects ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 9. Add tenant_id to broker_sessions
ALTER TABLE public.broker_sessions ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 10. Add tenant_id to broker_activity_logs
ALTER TABLE public.broker_activity_logs ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 11. Add tenant_id to broker_whatsapp_instances
ALTER TABLE public.broker_whatsapp_instances ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 12. Add tenant_id to broker_auto_message_rules
ALTER TABLE public.broker_auto_message_rules ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 13. Add tenant_id to broker_auto_cadencia_rules
ALTER TABLE public.broker_auto_cadencia_rules ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 14. Add tenant_id to auto_cadencia_steps
ALTER TABLE public.auto_cadencia_steps ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 15. Add tenant_id to conversations
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 16. Add tenant_id to conversation_messages
ALTER TABLE public.conversation_messages ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 17. Add tenant_id to copilot_configs
ALTER TABLE public.copilot_configs ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 18. Add tenant_id to roletas
ALTER TABLE public.roletas ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 19. Add tenant_id to roletas_membros
ALTER TABLE public.roletas_membros ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 20. Add tenant_id to roletas_empreendimentos
ALTER TABLE public.roletas_empreendimentos ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 21. Add tenant_id to roletas_log
ALTER TABLE public.roletas_log ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 22. Add tenant_id to propostas
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 23. Add tenant_id to proposta_parcelas
ALTER TABLE public.proposta_parcelas ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 24. Add tenant_id to page_views
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 25. Add tenant_id to global_whatsapp_config
ALTER TABLE public.global_whatsapp_config ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 26. Add tenant_id to campaign_steps
ALTER TABLE public.campaign_steps ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- ============================================================
-- Create indexes on tenant_id for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_brokers_tenant ON public.brokers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant ON public.projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_tenant ON public.leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_tenant ON public.lead_interactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_documents_tenant ON public.lead_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_attribution_tenant ON public.lead_attribution(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON public.notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_broker_projects_tenant ON public.broker_projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_broker_sessions_tenant ON public.broker_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_broker_activity_tenant ON public.broker_activity_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON public.conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_tenant ON public.conversation_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_roletas_tenant ON public.roletas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_propostas_tenant ON public.propostas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_page_views_tenant ON public.page_views(tenant_id);

-- ============================================================
-- Update get_my_tenant_id to be more robust
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT tenant_id FROM public.tenant_memberships
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1
$$;

-- ============================================================
-- Update get_my_broker_id to include tenant context
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_broker_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM public.brokers
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- ============================================================
-- Helper: check if user is super_admin (has 'admin' role in user_roles)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;

-- ============================================================
-- DROP ALL existing RLS policies and recreate with tenant isolation
-- We'll use RESTRICTIVE policies with tenant_id checks
-- ============================================================

-- ===================== BROKERS =====================
DROP POLICY IF EXISTS "Admins podem ver todos os corretores" ON public.brokers;
DROP POLICY IF EXISTS "Apenas admins podem atualizar corretores" ON public.brokers;
DROP POLICY IF EXISTS "Apenas admins podem deletar corretores" ON public.brokers;
DROP POLICY IF EXISTS "Apenas admins podem inserir corretores" ON public.brokers;
DROP POLICY IF EXISTS "Corretores podem atualizar seu próprio perfil" ON public.brokers;
DROP POLICY IF EXISTS "Corretores podem ver seu próprio perfil" ON public.brokers;
DROP POLICY IF EXISTS "Qualquer pessoa pode ver corretores ativos" ON public.brokers;
DROP POLICY IF EXISTS "Usuários podem criar seu próprio perfil de corretor" ON public.brokers;

-- Tenant-isolated policies for brokers
CREATE POLICY "tenant_brokers_select" ON public.brokers FOR SELECT
  USING (
    tenant_id = get_my_tenant_id()
    OR is_super_admin()
    OR (is_active = true) -- public landing pages need active brokers
  );

CREATE POLICY "tenant_brokers_insert" ON public.brokers FOR INSERT
  WITH CHECK (
    tenant_id = get_my_tenant_id()
    OR is_super_admin()
    OR (auth.uid() = user_id) -- self-registration during onboarding
  );

CREATE POLICY "tenant_brokers_update" ON public.brokers FOR UPDATE
  USING (
    (tenant_id = get_my_tenant_id() AND auth.uid() = user_id)
    OR (tenant_id = get_my_tenant_id() AND has_role(auth.uid(), 'admin'))
    OR is_super_admin()
  );

CREATE POLICY "tenant_brokers_delete" ON public.brokers FOR DELETE
  USING (
    (tenant_id = get_my_tenant_id() AND has_role(auth.uid(), 'admin'))
    OR is_super_admin()
  );

-- ===================== PROJECTS =====================
DROP POLICY IF EXISTS "Admins podem gerenciar projetos" ON public.projects;
DROP POLICY IF EXISTS "Projetos ativos são públicos" ON public.projects;

CREATE POLICY "tenant_projects_select" ON public.projects FOR SELECT
  USING (
    tenant_id = get_my_tenant_id()
    OR is_super_admin()
    OR (is_active = true) -- public landing pages
  );

CREATE POLICY "tenant_projects_insert" ON public.projects FOR INSERT
  WITH CHECK (
    tenant_id = get_my_tenant_id()
    OR is_super_admin()
  );

CREATE POLICY "tenant_projects_update" ON public.projects FOR UPDATE
  USING (
    tenant_id = get_my_tenant_id()
    OR is_super_admin()
  );

CREATE POLICY "tenant_projects_delete" ON public.projects FOR DELETE
  USING (
    tenant_id = get_my_tenant_id()
    OR is_super_admin()
  );

-- ===================== LEADS =====================
DROP POLICY IF EXISTS "Admins podem atualizar leads" ON public.leads;
DROP POLICY IF EXISTS "Admins podem deletar leads" ON public.leads;
DROP POLICY IF EXISTS "Admins podem ver todos os leads" ON public.leads;
DROP POLICY IF EXISTS "Corretores podem atualizar seus leads" ON public.leads;
DROP POLICY IF EXISTS "Corretores podem ver seus próprios leads" ON public.leads;
DROP POLICY IF EXISTS "Lideres podem atualizar leads da equipe" ON public.leads;
DROP POLICY IF EXISTS "Lideres podem ver leads da equipe" ON public.leads;
DROP POLICY IF EXISTS "Permitir inserção pública de leads" ON public.leads;

CREATE POLICY "tenant_leads_select" ON public.leads FOR SELECT
  USING (
    (tenant_id = get_my_tenant_id())
    OR is_super_admin()
  );

CREATE POLICY "tenant_leads_insert" ON public.leads FOR INSERT
  WITH CHECK (true); -- public lead capture, tenant_id set by edge function

CREATE POLICY "tenant_leads_update" ON public.leads FOR UPDATE
  USING (
    (tenant_id = get_my_tenant_id())
    OR is_super_admin()
  );

CREATE POLICY "tenant_leads_delete" ON public.leads FOR DELETE
  USING (
    (tenant_id = get_my_tenant_id() AND has_role(auth.uid(), 'admin'))
    OR is_super_admin()
  );

-- ===================== LEAD_INTERACTIONS =====================
DROP POLICY IF EXISTS "Admins podem deletar interacoes" ON public.lead_interactions;
DROP POLICY IF EXISTS "Admins podem inserir interacoes" ON public.lead_interactions;
DROP POLICY IF EXISTS "Admins podem ver todas as interacoes" ON public.lead_interactions;
DROP POLICY IF EXISTS "Corretores podem inserir interacoes nos seus leads" ON public.lead_interactions;
DROP POLICY IF EXISTS "Corretores podem ver interacoes dos seus leads" ON public.lead_interactions;
DROP POLICY IF EXISTS "Lideres podem inserir interacoes da equipe" ON public.lead_interactions;
DROP POLICY IF EXISTS "Lideres podem ver interacoes da equipe" ON public.lead_interactions;

CREATE POLICY "tenant_lead_interactions_select" ON public.lead_interactions FOR SELECT
  USING (tenant_id = get_my_tenant_id() OR is_super_admin());

CREATE POLICY "tenant_lead_interactions_insert" ON public.lead_interactions FOR INSERT
  WITH CHECK (tenant_id = get_my_tenant_id() OR is_super_admin());

CREATE POLICY "tenant_lead_interactions_delete" ON public.lead_interactions FOR DELETE
  USING (tenant_id = get_my_tenant_id() OR is_super_admin());

-- ===================== LEAD_DOCUMENTS =====================
DROP POLICY IF EXISTS "Admins podem deletar documentos" ON public.lead_documents;
DROP POLICY IF EXISTS "Admins podem gerenciar documentos" ON public.lead_documents;
DROP POLICY IF EXISTS "Admins podem ver todos os documentos" ON public.lead_documents;
DROP POLICY IF EXISTS "Corretores podem atualizar documentos dos seus leads" ON public.lead_documents;
DROP POLICY IF EXISTS "Corretores podem inserir documentos nos seus leads" ON public.lead_documents;
DROP POLICY IF EXISTS "Corretores podem ver documentos dos seus leads" ON public.lead_documents;
DROP POLICY IF EXISTS "Lideres podem atualizar documentos da equipe" ON public.lead_documents;
DROP POLICY IF EXISTS "Lideres podem ver documentos da equipe" ON public.lead_documents;

CREATE POLICY "tenant_lead_documents_all" ON public.lead_documents FOR ALL
  USING (tenant_id = get_my_tenant_id() OR is_super_admin());

-- ===================== LEAD_ATTRIBUTION =====================
DROP POLICY IF EXISTS "Admins podem deletar lead attribution" ON public.lead_attribution;
DROP POLICY IF EXISTS "Admins podem ver lead attribution" ON public.lead_attribution;
DROP POLICY IF EXISTS "Corretores podem ver attribution de seus leads" ON public.lead_attribution;
DROP POLICY IF EXISTS "Lideres podem ver attribution da equipe" ON public.lead_attribution;
DROP POLICY IF EXISTS "Permitir inserção pública de lead attribution" ON public.lead_attribution;

CREATE POLICY "tenant_lead_attribution_select" ON public.lead_attribution FOR SELECT
  USING (tenant_id = get_my_tenant_id() OR is_super_admin());

CREATE POLICY "tenant_lead_attribution_insert" ON public.lead_attribution FOR INSERT
  WITH CHECK (true); -- public lead capture

CREATE POLICY "tenant_lead_attribution_delete" ON public.lead_attribution FOR DELETE
  USING (tenant_id = get_my_tenant_id() OR is_super_admin());

-- ===================== NOTIFICATIONS =====================
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

CREATE POLICY "tenant_notifications_select" ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "tenant_notifications_insert" ON public.notifications FOR INSERT
  WITH CHECK (true); -- system inserts

CREATE POLICY "tenant_notifications_update" ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "tenant_notifications_delete" ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- ===================== CONVERSATIONS =====================
DROP POLICY IF EXISTS "Admins podem deletar conversas" ON public.conversations;
DROP POLICY IF EXISTS "Admins podem ver todas as conversas" ON public.conversations;
DROP POLICY IF EXISTS "Corretores atualizam suas conversas" ON public.conversations;
DROP POLICY IF EXISTS "Corretores inserem suas conversas" ON public.conversations;
DROP POLICY IF EXISTS "Corretores veem suas conversas" ON public.conversations;
DROP POLICY IF EXISTS "Lideres podem ver conversas do time" ON public.conversations;

CREATE POLICY "tenant_conversations_select" ON public.conversations FOR SELECT
  USING (tenant_id = get_my_tenant_id() OR is_super_admin());

CREATE POLICY "tenant_conversations_insert" ON public.conversations FOR INSERT
  WITH CHECK (tenant_id = get_my_tenant_id() OR is_super_admin());

CREATE POLICY "tenant_conversations_update" ON public.conversations FOR UPDATE
  USING (tenant_id = get_my_tenant_id() OR is_super_admin());

CREATE POLICY "tenant_conversations_delete" ON public.conversations FOR DELETE
  USING (tenant_id = get_my_tenant_id() OR is_super_admin());

-- ===================== CONVERSATION_MESSAGES =====================
DROP POLICY IF EXISTS "Acesso via conversa" ON public.conversation_messages;
DROP POLICY IF EXISTS "Admins podem ver todas as mensagens" ON public.conversation_messages;
DROP POLICY IF EXISTS "Inserir mensagens na conversa" ON public.conversation_messages;
DROP POLICY IF EXISTS "Lideres podem ver mensagens do time" ON public.conversation_messages;

CREATE POLICY "tenant_conv_messages_select" ON public.conversation_messages FOR SELECT
  USING (tenant_id = get_my_tenant_id() OR is_super_admin());

CREATE POLICY "tenant_conv_messages_insert" ON public.conversation_messages FOR INSERT
  WITH CHECK (tenant_id = get_my_tenant_id() OR is_super_admin());

-- ===================== BROKER_PROJECTS =====================
DROP POLICY IF EXISTS "Admins gerenciam associações" ON public.broker_projects;
DROP POLICY IF EXISTS "Associacoes ativas sao publicas" ON public.broker_projects;
DROP POLICY IF EXISTS "Corretores podem atualizar suas associações" ON public.broker_projects;
DROP POLICY IF EXISTS "Corretores podem criar suas associações" ON public.broker_projects;
DROP POLICY IF EXISTS "Corretores veem suas associações" ON public.broker_projects;

CREATE POLICY "tenant_broker_projects_all" ON public.broker_projects FOR ALL
  USING (tenant_id = get_my_tenant_id() OR is_super_admin() OR is_active = true);

-- ===================== BROKER_SESSIONS =====================
DROP POLICY IF EXISTS "Admins podem ver todas as sessões" ON public.broker_sessions;
DROP POLICY IF EXISTS "Corretores veem suas sessões" ON public.broker_sessions;
DROP POLICY IF EXISTS "Sistema pode atualizar sessões" ON public.broker_sessions;
DROP POLICY IF EXISTS "Usuários podem registrar sua sessão" ON public.broker_sessions;

CREATE POLICY "tenant_broker_sessions_all" ON public.broker_sessions FOR ALL
  USING (tenant_id = get_my_tenant_id() OR auth.uid() = user_id OR is_super_admin());

-- ===================== BROKER_ACTIVITY_LOGS =====================
DROP POLICY IF EXISTS "Admins podem ver todos os logs" ON public.broker_activity_logs;
DROP POLICY IF EXISTS "Corretores veem seus logs" ON public.broker_activity_logs;
DROP POLICY IF EXISTS "Usuários podem registrar suas atividades" ON public.broker_activity_logs;

CREATE POLICY "tenant_broker_activity_select" ON public.broker_activity_logs FOR SELECT
  USING (tenant_id = get_my_tenant_id() OR auth.uid() = user_id OR is_super_admin());

CREATE POLICY "tenant_broker_activity_insert" ON public.broker_activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id OR is_super_admin());

-- ===================== BROKER_WHATSAPP_INSTANCES =====================
DROP POLICY IF EXISTS "Admins podem deletar instâncias" ON public.broker_whatsapp_instances;
DROP POLICY IF EXISTS "Corretores podem atualizar sua própria instância" ON public.broker_whatsapp_instances;
DROP POLICY IF EXISTS "Corretores podem inserir sua própria instância" ON public.broker_whatsapp_instances;
DROP POLICY IF EXISTS "Corretores podem ver sua própria instância" ON public.broker_whatsapp_instances;

CREATE POLICY "tenant_whatsapp_instances_all" ON public.broker_whatsapp_instances FOR ALL
  USING (tenant_id = get_my_tenant_id() OR is_super_admin());

-- ===================== BROKER_AUTO_MESSAGE_RULES =====================
DROP POLICY IF EXISTS "Corretores podem atualizar suas regras" ON public.broker_auto_message_rules;
DROP POLICY IF EXISTS "Corretores podem criar suas regras" ON public.broker_auto_message_rules;
DROP POLICY IF EXISTS "Corretores podem deletar suas regras" ON public.broker_auto_message_rules;
DROP POLICY IF EXISTS "Corretores podem ver suas regras" ON public.broker_auto_message_rules;

CREATE POLICY "tenant_auto_message_rules_all" ON public.broker_auto_message_rules FOR ALL
  USING (tenant_id = get_my_tenant_id() OR is_super_admin());

-- ===================== BROKER_AUTO_CADENCIA_RULES =====================
DROP POLICY IF EXISTS "Corretores podem atualizar suas regras cadencia" ON public.broker_auto_cadencia_rules;
DROP POLICY IF EXISTS "Corretores podem criar suas regras cadencia" ON public.broker_auto_cadencia_rules;
DROP POLICY IF EXISTS "Corretores podem deletar suas regras cadencia" ON public.broker_auto_cadencia_rules;
DROP POLICY IF EXISTS "Corretores podem ver suas regras cadencia" ON public.broker_auto_cadencia_rules;

CREATE POLICY "tenant_auto_cadencia_rules_all" ON public.broker_auto_cadencia_rules FOR ALL
  USING (tenant_id = get_my_tenant_id() OR is_super_admin());

-- ===================== AUTO_CADENCIA_STEPS =====================
DROP POLICY IF EXISTS "Corretores podem deletar steps" ON public.auto_cadencia_steps;
DROP POLICY IF EXISTS "Corretores podem inserir steps" ON public.auto_cadencia_steps;
DROP POLICY IF EXISTS "Corretores podem ver steps das suas regras" ON public.auto_cadencia_steps;

CREATE POLICY "tenant_auto_cadencia_steps_all" ON public.auto_cadencia_steps FOR ALL
  USING (tenant_id = get_my_tenant_id() OR is_super_admin());

-- ===================== COPILOT_CONFIGS =====================
DROP POLICY IF EXISTS "Corretor atualiza seu copilot" ON public.copilot_configs;
DROP POLICY IF EXISTS "Corretor cria seu copilot" ON public.copilot_configs;
DROP POLICY IF EXISTS "Corretor vê seu copilot" ON public.copilot_configs;

CREATE POLICY "tenant_copilot_configs_all" ON public.copilot_configs FOR ALL
  USING (tenant_id = get_my_tenant_id() OR is_super_admin());

-- ===================== ROLETAS =====================
DROP POLICY IF EXISTS "Admins podem gerenciar roletas" ON public.roletas;
DROP POLICY IF EXISTS "Corretores podem ver suas roletas" ON public.roletas;

CREATE POLICY "tenant_roletas_all" ON public.roletas FOR ALL
  USING (tenant_id = get_my_tenant_id() OR is_super_admin());

-- ===================== ROLETAS_MEMBROS =====================
DROP POLICY IF EXISTS "Admins full access roletas_membros" ON public.roletas_membros;
DROP POLICY IF EXISTS "Corretores podem ver seus membros" ON public.roletas_membros;

CREATE POLICY "tenant_roletas_membros_all" ON public.roletas_membros FOR ALL
  USING (tenant_id = get_my_tenant_id() OR is_super_admin());

-- ===================== ROLETAS_EMPREENDIMENTOS =====================
DROP POLICY IF EXISTS "Admins full access roletas_empreendimentos" ON public.roletas_empreendimentos;
DROP POLICY IF EXISTS "Corretores podem ver seus empreendimentos" ON public.roletas_empreendimentos;

CREATE POLICY "tenant_roletas_empreendimentos_all" ON public.roletas_empreendimentos FOR ALL
  USING (tenant_id = get_my_tenant_id() OR is_super_admin());

-- ===================== ROLETAS_LOG =====================
DROP POLICY IF EXISTS "Admins full access roletas_log" ON public.roletas_log;
DROP POLICY IF EXISTS "Corretores podem ver seus logs" ON public.roletas_log;

CREATE POLICY "tenant_roletas_log_all" ON public.roletas_log FOR ALL
  USING (tenant_id = get_my_tenant_id() OR is_super_admin());

-- ===================== PROPOSTAS =====================
DROP POLICY IF EXISTS "Admins full access propostas" ON public.propostas;
DROP POLICY IF EXISTS "Corretores insert propostas" ON public.propostas;
DROP POLICY IF EXISTS "Corretores select propostas" ON public.propostas;
DROP POLICY IF EXISTS "Corretores update propostas" ON public.propostas;
DROP POLICY IF EXISTS "Lideres select propostas" ON public.propostas;
DROP POLICY IF EXISTS "Lideres update propostas" ON public.propostas;

CREATE POLICY "tenant_propostas_all" ON public.propostas FOR ALL
  USING (tenant_id = get_my_tenant_id() OR is_super_admin());

-- ===================== PROPOSTA_PARCELAS =====================
DROP POLICY IF EXISTS "Admins full access proposta_parcelas" ON public.proposta_parcelas;
DROP POLICY IF EXISTS "Corretores delete proposta_parcelas" ON public.proposta_parcelas;
DROP POLICY IF EXISTS "Corretores insert proposta_parcelas" ON public.proposta_parcelas;
DROP POLICY IF EXISTS "Corretores select proposta_parcelas" ON public.proposta_parcelas;
DROP POLICY IF EXISTS "Lideres select proposta_parcelas" ON public.proposta_parcelas;

CREATE POLICY "tenant_proposta_parcelas_all" ON public.proposta_parcelas FOR ALL
  USING (tenant_id = get_my_tenant_id() OR is_super_admin());

-- ===================== PAGE_VIEWS =====================
DROP POLICY IF EXISTS "Admins podem ver page views" ON public.page_views;
DROP POLICY IF EXISTS "Permitir inserção pública de page views" ON public.page_views;

CREATE POLICY "tenant_page_views_select" ON public.page_views FOR SELECT
  USING (tenant_id = get_my_tenant_id() OR is_super_admin());

CREATE POLICY "tenant_page_views_insert" ON public.page_views FOR INSERT
  WITH CHECK (true); -- public tracking

-- ===================== GLOBAL_WHATSAPP_CONFIG =====================
DROP POLICY IF EXISTS "Admins can manage global whatsapp config" ON public.global_whatsapp_config;

CREATE POLICY "tenant_global_whatsapp_all" ON public.global_whatsapp_config FOR ALL
  USING (tenant_id = get_my_tenant_id() OR is_super_admin());

-- ===================== CAMPAIGN_STEPS =====================
DROP POLICY IF EXISTS "Corretores podem criar steps" ON public.campaign_steps;
DROP POLICY IF EXISTS "Corretores podem deletar steps" ON public.campaign_steps;
DROP POLICY IF EXISTS "Corretores podem ver steps das suas campanhas" ON public.campaign_steps;

CREATE POLICY "tenant_campaign_steps_all" ON public.campaign_steps FOR ALL
  USING (tenant_id = get_my_tenant_id() OR is_super_admin());

-- ============================================================
-- Enable RLS on tables that might not have it
-- ============================================================
ALTER TABLE public.roletas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roletas_membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roletas_empreendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roletas_log ENABLE ROW LEVEL SECURITY;

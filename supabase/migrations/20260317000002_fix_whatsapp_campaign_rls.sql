-- Fix RLS for whatsapp_campaigns and whatsapp_message_queue.
-- The old policies used an inline subquery on brokers which runs under RLS
-- and can return NULL (causing broker_id = NULL → always false → 403).
-- Replace with a SECURITY DEFINER function that bypasses RLS.

CREATE OR REPLACE FUNCTION public.get_my_broker_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM public.brokers WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ── whatsapp_campaigns ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Corretores podem ver suas campanhas"       ON public.whatsapp_campaigns;
DROP POLICY IF EXISTS "Corretores podem criar campanhas"          ON public.whatsapp_campaigns;
DROP POLICY IF EXISTS "Corretores podem atualizar suas campanhas" ON public.whatsapp_campaigns;
DROP POLICY IF EXISTS "Corretores podem deletar suas campanhas"   ON public.whatsapp_campaigns;

CREATE POLICY "broker_campaigns_select" ON public.whatsapp_campaigns FOR SELECT
  USING (broker_id = get_my_broker_id() OR is_super_admin() OR tenant_id = get_my_tenant_id());

CREATE POLICY "broker_campaigns_insert" ON public.whatsapp_campaigns FOR INSERT
  WITH CHECK (broker_id = get_my_broker_id() OR is_super_admin() OR tenant_id = get_my_tenant_id());

CREATE POLICY "broker_campaigns_update" ON public.whatsapp_campaigns FOR UPDATE
  USING (broker_id = get_my_broker_id() OR is_super_admin() OR tenant_id = get_my_tenant_id());

CREATE POLICY "broker_campaigns_delete" ON public.whatsapp_campaigns FOR DELETE
  USING (broker_id = get_my_broker_id() OR is_super_admin() OR tenant_id = get_my_tenant_id());

-- ── whatsapp_message_queue ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Corretores podem ver sua fila"         ON public.whatsapp_message_queue;
DROP POLICY IF EXISTS "Corretores podem criar itens na fila"  ON public.whatsapp_message_queue;
DROP POLICY IF EXISTS "Corretores podem atualizar sua fila"   ON public.whatsapp_message_queue;

CREATE POLICY "broker_queue_select" ON public.whatsapp_message_queue FOR SELECT
  USING (broker_id = get_my_broker_id() OR is_super_admin());

CREATE POLICY "broker_queue_insert" ON public.whatsapp_message_queue FOR INSERT
  WITH CHECK (broker_id = get_my_broker_id() OR is_super_admin());

CREATE POLICY "broker_queue_update" ON public.whatsapp_message_queue FOR UPDATE
  USING (broker_id = get_my_broker_id() OR is_super_admin());

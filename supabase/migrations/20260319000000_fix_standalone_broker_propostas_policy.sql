-- Allow standalone brokers (no tenant) to manage their own propostas and parcelas
-- Same pattern as standalone_broker_can_insert_project

CREATE POLICY "standalone_broker_propostas_all"
ON public.propostas FOR ALL
USING (
  tenant_id IS NULL
  AND get_my_tenant_id() IS NULL
  AND (
    created_by = auth.uid()
    OR broker_id IN (
      SELECT id FROM public.brokers WHERE user_id = auth.uid()
    )
    OR lead_id IN (
      SELECT id FROM public.leads WHERE broker_id IN (
        SELECT id FROM public.brokers WHERE user_id = auth.uid()
      )
    )
  )
)
WITH CHECK (
  tenant_id IS NULL
  AND get_my_tenant_id() IS NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'broker'
  )
);

CREATE POLICY "standalone_broker_proposta_parcelas_all"
ON public.proposta_parcelas FOR ALL
USING (
  tenant_id IS NULL
  AND get_my_tenant_id() IS NULL
  AND proposta_id IN (
    SELECT id FROM public.propostas
    WHERE created_by = auth.uid()
      OR broker_id IN (SELECT id FROM public.brokers WHERE user_id = auth.uid())
  )
)
WITH CHECK (
  tenant_id IS NULL
  AND get_my_tenant_id() IS NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'broker'
  )
);

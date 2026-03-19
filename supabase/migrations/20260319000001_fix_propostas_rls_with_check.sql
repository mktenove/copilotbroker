-- Recreate propostas and proposta_parcelas policies with explicit WITH CHECK
-- The implicit WITH CHECK from USING-only FOR ALL was not applying correctly for INSERT

DROP POLICY IF EXISTS "tenant_propostas_all" ON public.propostas;
CREATE POLICY "tenant_propostas_all" ON public.propostas FOR ALL
  USING (tenant_id = get_my_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = get_my_tenant_id() OR is_super_admin());

DROP POLICY IF EXISTS "tenant_proposta_parcelas_all" ON public.proposta_parcelas;
CREATE POLICY "tenant_proposta_parcelas_all" ON public.proposta_parcelas FOR ALL
  USING (tenant_id = get_my_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = get_my_tenant_id() OR is_super_admin());

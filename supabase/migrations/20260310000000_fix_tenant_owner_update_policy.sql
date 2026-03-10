
-- Allow tenant owners to update their own tenant (e.g. set the company name during onboarding)
CREATE POLICY "Owners podem atualizar seu tenant"
ON public.tenants
FOR UPDATE
USING (
  id IN (
    SELECT tenant_id FROM public.tenant_memberships
    WHERE user_id = auth.uid() AND role = 'owner' AND is_active = true
  )
)
WITH CHECK (
  id IN (
    SELECT tenant_id FROM public.tenant_memberships
    WHERE user_id = auth.uid() AND role = 'owner' AND is_active = true
  )
);

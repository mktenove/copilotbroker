-- Allow tenant owners/admins to insert their own broker record during onboarding
CREATE POLICY "owner_insert_own_broker"
ON public.brokers FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND tenant_id IN (
    SELECT tenant_id FROM public.tenant_memberships
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND is_active = true
  )
);

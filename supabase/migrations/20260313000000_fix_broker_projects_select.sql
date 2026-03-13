-- Add explicit SELECT policy for brokers to see their own associations
-- This uses the existing SECURITY DEFINER get_my_broker_id() function
-- to ensure the broker can always read their own broker_projects rows

CREATE POLICY "broker_sees_own_associations"
ON public.broker_projects FOR SELECT
USING (
  broker_id = get_my_broker_id()
  OR is_super_admin()
  OR (tenant_id IS NOT NULL AND tenant_id = get_my_tenant_id())
  OR is_active = true
);

-- Allow standalone brokers (no tenant membership) to create projects with tenant_id = NULL
-- This fixes the 403 RLS error for plan_type='broker' accounts created without Stripe webhook

CREATE POLICY "standalone_broker_can_insert_project"
ON public.projects FOR INSERT
WITH CHECK (
  tenant_id IS NULL
  AND get_my_tenant_id() IS NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'broker'
  )
);

-- Allow standalone brokers to update/delete projects associated with their broker account
CREATE POLICY "standalone_broker_can_update_project"
ON public.projects FOR UPDATE
USING (
  tenant_id IS NULL
  AND get_my_tenant_id() IS NULL
  AND EXISTS (
    SELECT 1 FROM public.broker_projects bp
    JOIN public.brokers b ON b.id = bp.broker_id
    WHERE b.user_id = auth.uid()
      AND bp.project_id = projects.id
      AND bp.is_active = true
  )
);

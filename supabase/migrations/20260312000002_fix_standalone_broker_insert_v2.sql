-- Replace the RLS subquery with a SECURITY DEFINER function (mirrors is_super_admin pattern)
-- This ensures the user_roles lookup bypasses any RLS restrictions

CREATE OR REPLACE FUNCTION public.is_standalone_broker()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    get_my_tenant_id() IS NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'broker'
    )
$$;

-- Drop the previous policy that used an inline subquery (may fail silently under RLS)
DROP POLICY IF EXISTS "standalone_broker_can_insert_project" ON public.projects;
DROP POLICY IF EXISTS "standalone_broker_can_update_project" ON public.projects;

-- Recreate using the SECURITY DEFINER function
CREATE POLICY "standalone_broker_can_insert_project"
ON public.projects FOR INSERT
WITH CHECK (
  tenant_id IS NULL AND is_standalone_broker()
);

CREATE POLICY "standalone_broker_can_update_project"
ON public.projects FOR UPDATE
USING (
  tenant_id IS NULL AND is_standalone_broker()
  AND EXISTS (
    SELECT 1 FROM public.broker_projects bp
    JOIN public.brokers b ON b.id = bp.broker_id
    WHERE b.user_id = auth.uid()
      AND bp.project_id = projects.id
      AND bp.is_active = true
  )
);

-- Fix: Super admin policy should be PERMISSIVE so it works independently
-- Drop the restrictive policy and recreate as permissive

DROP POLICY IF EXISTS "Super admins podem gerenciar tenants" ON public.tenants;

CREATE POLICY "Super admins podem gerenciar tenants"
ON public.tenants
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Also fix the member policy to be permissive
DROP POLICY IF EXISTS "Membros podem ver seu tenant" ON public.tenants;

CREATE POLICY "Membros podem ver seu tenant"
ON public.tenants
FOR SELECT
USING (id IN (
  SELECT tenant_id FROM tenant_memberships
  WHERE user_id = auth.uid() AND is_active = true
));

-- 1. Add role column to invites
ALTER TABLE public.invites ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'broker';

-- 2. Ensure unique on token (may already exist)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'invites_token_key') THEN
    ALTER TABLE public.invites ADD CONSTRAINT invites_token_key UNIQUE (token);
  END IF;
END $$;

-- 3. Index on (tenant_id, status)
CREATE INDEX IF NOT EXISTS idx_invites_tenant_status ON public.invites (tenant_id, status);

-- 4. Index on email
CREATE INDEX IF NOT EXISTS idx_invites_email ON public.invites (email);

-- 5. Partial unique: no duplicate "sent" invites for same email+tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_invites_unique_sent 
  ON public.invites (tenant_id, email) 
  WHERE status = 'sent';

-- 6. Drop old RLS policies
DROP POLICY IF EXISTS "Owners veem invites do tenant" ON public.invites;
DROP POLICY IF EXISTS "Super admins gerenciam invites" ON public.invites;

-- 7. New RLS policies

-- Super admin full access
CREATE POLICY "super_admin_invites_all"
  ON public.invites FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Tenant owners/admins can SELECT invites of their tenant
CREATE POLICY "tenant_admin_invites_select"
  ON public.invites FOR SELECT
  USING (
    tenant_id = get_my_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = invites.tenant_id
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = true
    )
  );

-- Tenant owners/admins can INSERT invites for their tenant
CREATE POLICY "tenant_admin_invites_insert"
  ON public.invites FOR INSERT
  WITH CHECK (
    tenant_id = get_my_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = invites.tenant_id
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = true
    )
  );

-- Tenant owners/admins can UPDATE invites (cancel)
CREATE POLICY "tenant_admin_invites_update"
  ON public.invites FOR UPDATE
  USING (
    tenant_id = get_my_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = invites.tenant_id
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = true
    )
  );


-- Create invites table for broker invitation management
CREATE TABLE public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  invited_by uuid NOT NULL,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'opened', 'accepted', 'expired', 'cancelled')),
  message text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins gerenciam invites"
  ON public.invites FOR ALL
  USING (is_super_admin());

CREATE POLICY "Owners veem invites do tenant"
  ON public.invites FOR SELECT
  USING (tenant_id = get_my_tenant_id());

CREATE INDEX idx_invites_email ON public.invites(email);
CREATE INDEX idx_invites_tenant ON public.invites(tenant_id);
CREATE INDEX idx_invites_token ON public.invites(token);
CREATE INDEX idx_invites_status ON public.invites(status);

-- Create audit_logs table for super admin actions
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action text NOT NULL,
  target_tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  target_user_id uuid,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins gerenciam audit_logs"
  ON public.audit_logs FOR ALL
  USING (is_super_admin());

CREATE INDEX idx_audit_logs_tenant ON public.audit_logs(target_tenant_id);
CREATE INDEX idx_audit_logs_admin ON public.audit_logs(admin_user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- Add notes column to tenants for internal admin notes
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS admin_notes text;

-- Add trial_ends_at to tenants for trial management
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

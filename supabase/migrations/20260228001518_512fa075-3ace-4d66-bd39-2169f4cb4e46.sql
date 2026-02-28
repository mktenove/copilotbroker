
-- =============================================
-- FASE 1A: Fundação Multi-Tenant — Copilot Broker
-- =============================================

-- 1. Enum para tipos de plano
CREATE TYPE public.plan_type AS ENUM ('broker', 'real_estate');

-- 2. Enum para status do tenant
CREATE TYPE public.tenant_status AS ENUM ('active', 'past_due', 'suspended', 'canceled', 'trialing');

-- 3. Tabela principal de tenants
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan_type public.plan_type NOT NULL DEFAULT 'broker',
  status public.tenant_status NOT NULL DEFAULT 'active',
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  included_users INTEGER NOT NULL DEFAULT 1,
  extra_users INTEGER NOT NULL DEFAULT 0,
  owner_user_id UUID,
  grace_period_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tabela de memberships (usuários dentro de um tenant)
CREATE TABLE public.tenant_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- 5. Tabela de entitlements (limites e features por tenant)
CREATE TABLE public.tenant_entitlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  max_users INTEGER NOT NULL DEFAULT 1,
  max_leads INTEGER, -- null = ilimitado
  max_projects INTEGER, -- null = ilimitado
  features JSONB NOT NULL DEFAULT '{"whatsapp": true, "copilot": true, "roletas": true, "campaigns": true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Tabela de billing events (idempotência Stripe)
CREATE TABLE public.billing_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- RLS Policies
-- =============================================

-- Tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins podem gerenciar tenants"
ON public.tenants FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Membros podem ver seu tenant"
ON public.tenants FOR SELECT
USING (id IN (
  SELECT tenant_id FROM public.tenant_memberships 
  WHERE user_id = auth.uid() AND is_active = true
));

-- Tenant Memberships
ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins podem gerenciar memberships"
ON public.tenant_memberships FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Membros podem ver memberships do seu tenant"
ON public.tenant_memberships FOR SELECT
USING (tenant_id IN (
  SELECT tenant_id FROM public.tenant_memberships AS tm
  WHERE tm.user_id = auth.uid() AND tm.is_active = true
));

CREATE POLICY "Owners podem gerenciar memberships do seu tenant"
ON public.tenant_memberships FOR ALL
USING (tenant_id IN (
  SELECT tenant_id FROM public.tenant_memberships AS tm
  WHERE tm.user_id = auth.uid() AND tm.role = 'owner' AND tm.is_active = true
));

-- Tenant Entitlements
ALTER TABLE public.tenant_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins podem gerenciar entitlements"
ON public.tenant_entitlements FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Membros podem ver entitlements do seu tenant"
ON public.tenant_entitlements FOR SELECT
USING (tenant_id IN (
  SELECT tenant_id FROM public.tenant_memberships
  WHERE user_id = auth.uid() AND is_active = true
));

-- Billing Events (somente super admin)
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins podem ver billing events"
ON public.billing_events FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- Funções auxiliares
-- =============================================

-- Função para obter tenant_id do usuário atual
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_memberships
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1
$$;

-- Função para verificar limite de usuários
CREATE OR REPLACE FUNCTION public.check_user_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _max_users INTEGER;
  _current_count INTEGER;
BEGIN
  SELECT max_users INTO _max_users
  FROM public.tenant_entitlements
  WHERE tenant_id = NEW.tenant_id;

  SELECT COUNT(*) INTO _current_count
  FROM public.tenant_memberships
  WHERE tenant_id = NEW.tenant_id AND is_active = true;

  IF _current_count >= _max_users THEN
    RAISE EXCEPTION 'USER_LIMIT_EXCEEDED: Tenant reached max users (%)' , _max_users;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER check_user_limit_before_insert
BEFORE INSERT ON public.tenant_memberships
FOR EACH ROW
EXECUTE FUNCTION public.check_user_limit();

-- Trigger para updated_at
CREATE TRIGGER update_tenants_updated_at
BEFORE UPDATE ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.update_leads_updated_at();

CREATE TRIGGER update_memberships_updated_at
BEFORE UPDATE ON public.tenant_memberships
FOR EACH ROW
EXECUTE FUNCTION public.update_leads_updated_at();

CREATE TRIGGER update_entitlements_updated_at
BEFORE UPDATE ON public.tenant_entitlements
FOR EACH ROW
EXECUTE FUNCTION public.update_leads_updated_at();

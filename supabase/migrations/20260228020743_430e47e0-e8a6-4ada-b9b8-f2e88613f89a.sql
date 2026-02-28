
-- Add owner_email to tenants for pending invitations
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS owner_email text;

-- Create function to auto-link broker to pending tenant on signup
CREATE OR REPLACE FUNCTION public.auto_link_broker_to_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id uuid;
  _tenant record;
BEGIN
  -- Check if there's a tenant with this broker's email as owner_email
  SELECT id, owner_user_id INTO _tenant
  FROM public.tenants
  WHERE owner_email = NEW.email
  LIMIT 1;

  IF _tenant.id IS NOT NULL THEN
    -- Update broker with tenant_id
    NEW.tenant_id = _tenant.id;

    -- Create membership if not exists
    INSERT INTO public.tenant_memberships (tenant_id, user_id, role, is_active)
    VALUES (_tenant.id, NEW.user_id, 'member', true)
    ON CONFLICT DO NOTHING;

    -- Update tenant owner if not set
    IF _tenant.owner_user_id IS NULL THEN
      UPDATE public.tenants SET owner_user_id = NEW.user_id WHERE id = _tenant.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on brokers insert
DROP TRIGGER IF EXISTS trg_auto_link_broker ON public.brokers;
CREATE TRIGGER trg_auto_link_broker
  BEFORE INSERT ON public.brokers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_link_broker_to_tenant();

-- Create a security definer function to get roleta IDs for a broker
CREATE OR REPLACE FUNCTION public.get_my_roleta_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT roleta_id FROM public.roletas_membros
  WHERE corretor_id = get_my_broker_id() AND ativo = true
$$;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Corretores veem membros das suas roletas" ON public.roletas_membros;

-- Recreate using the security definer function
CREATE POLICY "Corretores veem membros das suas roletas" 
ON public.roletas_membros 
FOR SELECT 
USING (
  corretor_id = get_my_broker_id()
  OR roleta_id IN (SELECT get_my_roleta_ids())
);

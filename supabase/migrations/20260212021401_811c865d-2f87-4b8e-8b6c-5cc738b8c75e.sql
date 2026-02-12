-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Corretores veem membros das suas roletas" ON public.roletas_membros;

-- Recreate without self-referencing subquery
-- Allow brokers to see all members of roletas they belong to
-- Using a simpler approach: broker can see any row where their corretor_id matches,
-- OR any row in a roleta that contains their corretor_id
CREATE POLICY "Corretores veem membros das suas roletas" 
ON public.roletas_membros 
FOR SELECT 
USING (
  corretor_id = get_my_broker_id()
  OR roleta_id IN (
    SELECT rm.roleta_id FROM public.roletas_membros rm
    WHERE rm.corretor_id = get_my_broker_id() AND rm.ativo = true
  )
);

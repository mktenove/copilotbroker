-- Fix roletas_log broker SELECT policy to use security definer function
DROP POLICY IF EXISTS "Corretores veem logs das suas roletas" ON public.roletas_log;
CREATE POLICY "Corretores veem logs das suas roletas"
ON public.roletas_log
FOR SELECT
USING (roleta_id IN (SELECT get_my_roleta_ids()));

-- Fix roletas_empreendimentos broker SELECT policy
DROP POLICY IF EXISTS "Corretores veem empreendimentos das suas roletas" ON public.roletas_empreendimentos;
CREATE POLICY "Corretores veem empreendimentos das suas roletas"
ON public.roletas_empreendimentos
FOR SELECT
USING (roleta_id IN (SELECT get_my_roleta_ids()));

-- Fix roletas broker SELECT policy
DROP POLICY IF EXISTS "Corretores podem ver roletas onde sao membros" ON public.roletas;
CREATE POLICY "Corretores podem ver roletas onde sao membros"
ON public.roletas
FOR SELECT
USING (id IN (SELECT get_my_roleta_ids()));

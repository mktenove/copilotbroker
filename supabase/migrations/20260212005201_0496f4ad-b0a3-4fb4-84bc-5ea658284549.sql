CREATE POLICY "Associacoes ativas sao publicas"
  ON public.broker_projects
  FOR SELECT
  USING (is_active = true);
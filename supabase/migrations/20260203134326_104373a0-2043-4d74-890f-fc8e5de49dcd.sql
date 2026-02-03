-- Política para corretores criarem suas próprias associações
CREATE POLICY "Corretores podem criar suas associações"
ON public.broker_projects FOR INSERT
WITH CHECK (
  broker_id = (SELECT id FROM brokers WHERE user_id = auth.uid())
);

-- Política para corretores atualizarem suas próprias associações (ativar/desativar)
CREATE POLICY "Corretores podem atualizar suas associações"
ON public.broker_projects FOR UPDATE
USING (
  broker_id = (SELECT id FROM brokers WHERE user_id = auth.uid())
)
WITH CHECK (
  broker_id = (SELECT id FROM brokers WHERE user_id = auth.uid())
);
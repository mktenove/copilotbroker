CREATE POLICY "Corretores e admins podem ver respostas"
  ON public.whatsapp_lead_replies FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM whatsapp_campaigns
      WHERE broker_id = (SELECT id FROM brokers WHERE user_id = auth.uid())
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );
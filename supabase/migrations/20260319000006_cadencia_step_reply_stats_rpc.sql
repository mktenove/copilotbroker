-- RPC: returns how many leads replied after each cadência step
-- "step_number" = last sent step before the lead replied
CREATE OR REPLACE FUNCTION get_cadencia_step_reply_stats(p_broker_id uuid DEFAULT NULL)
RETURNS TABLE(step_number int, reply_count bigint)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT
    sq.step_number,
    COUNT(*) AS reply_count
  FROM (
    -- For each (phone, campaign) reply, find the last step that was sent before/at the time of reply
    SELECT
      wlr.phone,
      wlr.campaign_id,
      MAX(wmq.step_number) AS step_number
    FROM whatsapp_lead_replies wlr
    JOIN whatsapp_message_queue wmq
      ON wmq.phone = wlr.phone
      AND wmq.campaign_id = wlr.campaign_id
      AND wmq.status = 'sent'
    WHERE (p_broker_id IS NULL OR wmq.broker_id = p_broker_id)
    GROUP BY wlr.phone, wlr.campaign_id
  ) sq
  GROUP BY sq.step_number
  ORDER BY sq.step_number
$$;

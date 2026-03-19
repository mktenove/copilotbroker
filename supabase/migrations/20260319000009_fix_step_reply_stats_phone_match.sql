-- Fix phone format mismatch in step reply stats RPC
-- whatsapp_lead_replies.phone comes from webhook (e.g. 5551999999)
-- whatsapp_message_queue.phone may be stored with +55 prefix
-- Normalize both sides by stripping non-digits for comparison

CREATE OR REPLACE FUNCTION get_cadencia_step_reply_stats(
  p_broker_id uuid DEFAULT NULL,
  p_since timestamptz DEFAULT NULL
)
RETURNS TABLE(step_number int, reply_count bigint)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT
    sq.step_number,
    COUNT(*) AS reply_count
  FROM (
    SELECT
      wlr.phone,
      wlr.campaign_id,
      MAX(wmq.step_number) AS step_number
    FROM whatsapp_lead_replies wlr
    JOIN whatsapp_message_queue wmq
      ON regexp_replace(wmq.phone, '[^0-9]', '', 'g') = regexp_replace(wlr.phone, '[^0-9]', '', 'g')
      AND wmq.campaign_id = wlr.campaign_id
      AND wmq.status = 'sent'
    JOIN whatsapp_campaigns wc ON wc.id = wlr.campaign_id
    WHERE (p_broker_id IS NULL OR wc.broker_id = p_broker_id)
      AND (p_since IS NULL OR wlr.replied_at >= p_since)
    GROUP BY wlr.phone, wlr.campaign_id
  ) sq
  GROUP BY sq.step_number
  ORDER BY sq.step_number
$$;

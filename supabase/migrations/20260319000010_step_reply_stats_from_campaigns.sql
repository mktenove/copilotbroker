-- Rewrite step reply stats using campaigns directly
-- Logic: if a campaign has reply_count > 0 and sent N messages → reply happened at step N
-- No phone join needed, avoids phone format mismatch issues entirely

CREATE OR REPLACE FUNCTION get_cadencia_step_reply_stats(
  p_broker_id uuid DEFAULT NULL,
  p_since timestamptz DEFAULT NULL
)
RETURNS TABLE(step_number int, reply_count bigint)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT
    step_counts.sent_count::int AS step_number,
    COUNT(DISTINCT step_counts.campaign_id) AS reply_count
  FROM (
    SELECT
      wc.id AS campaign_id,
      COUNT(wmq.id) AS sent_count
    FROM whatsapp_campaigns wc
    JOIN whatsapp_message_queue wmq
      ON wmq.campaign_id = wc.id
      AND wmq.status = 'sent'
    WHERE wc.reply_count > 0
      AND (p_broker_id IS NULL OR wc.broker_id = p_broker_id)
    GROUP BY wc.id
  ) step_counts
  GROUP BY step_counts.sent_count
  ORDER BY step_counts.sent_count
$$;

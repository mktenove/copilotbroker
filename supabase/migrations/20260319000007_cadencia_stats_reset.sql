-- Add reset timestamp to broker whatsapp instances
ALTER TABLE public.broker_whatsapp_instances
  ADD COLUMN IF NOT EXISTS cadencia_stats_reset_at timestamptz;

-- Update RPC to support p_since filter
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
      ON wmq.phone = wlr.phone
      AND wmq.campaign_id = wlr.campaign_id
      AND wmq.status = 'sent'
    WHERE (p_broker_id IS NULL OR wmq.broker_id = p_broker_id)
      AND (p_since IS NULL OR wlr.replied_at >= p_since)
    GROUP BY wlr.phone, wlr.campaign_id
  ) sq
  GROUP BY sq.step_number
  ORDER BY sq.step_number
$$;

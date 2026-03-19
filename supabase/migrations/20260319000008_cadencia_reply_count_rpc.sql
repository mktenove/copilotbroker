-- RPC: count unique leads who replied (deduped by phone+campaign)
CREATE OR REPLACE FUNCTION get_cadencia_reply_count(
  p_broker_id uuid DEFAULT NULL,
  p_since timestamptz DEFAULT NULL
)
RETURNS bigint
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT COUNT(DISTINCT (wlr.phone, wlr.campaign_id))
  FROM whatsapp_lead_replies wlr
  JOIN whatsapp_campaigns wc ON wc.id = wlr.campaign_id
  WHERE (p_broker_id IS NULL OR wc.broker_id = p_broker_id)
    AND (p_since IS NULL OR wlr.replied_at >= p_since)
$$;

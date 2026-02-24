-- First, clean up duplicate campaigns: keep only the earliest campaign per lead
-- Cancel duplicate campaigns (keep the first one created per lead)
WITH ranked_campaigns AS (
  SELECT id, lead_id,
    ROW_NUMBER() OVER (PARTITION BY lead_id ORDER BY created_at ASC) as rn
  FROM whatsapp_campaigns
  WHERE lead_id IS NOT NULL
    AND status IN ('running', 'scheduled')
),
duplicates AS (
  SELECT id FROM ranked_campaigns WHERE rn > 1
)
UPDATE whatsapp_campaigns
SET status = 'cancelled', updated_at = now()
WHERE id IN (SELECT id FROM duplicates);

-- Cancel queued messages from cancelled campaigns
UPDATE whatsapp_message_queue
SET status = 'cancelled',
    error_message = 'Campanha duplicada cancelada',
    updated_at = now()
WHERE campaign_id IN (
  SELECT id FROM whatsapp_campaigns WHERE status = 'cancelled' AND lead_id IS NOT NULL
)
AND status IN ('scheduled', 'queued');

-- Create partial unique index to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_cadencia_per_lead
ON whatsapp_campaigns (lead_id)
WHERE lead_id IS NOT NULL
  AND status IN ('running', 'scheduled');
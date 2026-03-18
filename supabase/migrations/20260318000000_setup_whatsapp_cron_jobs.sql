-- Set up cron jobs for WhatsApp message queue processing.
-- Uses pg_cron + pg_net to call the whatsapp-message-sender Edge Function.

-- Ensure extensions exist (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remove old jobs if they exist (safe re-run)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'whatsapp-process-queue') THEN
    PERFORM cron.unschedule('whatsapp-process-queue');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'whatsapp-reset-hourly') THEN
    PERFORM cron.unschedule('whatsapp-reset-hourly');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'whatsapp-reset-daily') THEN
    PERFORM cron.unschedule('whatsapp-reset-daily');
  END IF;
END $$;

-- Process message queue every minute
SELECT cron.schedule(
  'whatsapp-process-queue',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://nckzxwxxtyeydolmdijn.supabase.co/functions/v1/whatsapp-message-sender/process',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ja3p4d3h4dHlleWRvbG1kaWpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NjU4NDksImV4cCI6MjA4MzA0MTg0OX0.fjECugk1tkmhBNrR-030CJo6kB-_t8BLPYzhKCzTf1E"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Reset hourly send counters at the top of every hour
SELECT cron.schedule(
  'whatsapp-reset-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://nckzxwxxtyeydolmdijn.supabase.co/functions/v1/whatsapp-message-sender/reset-hourly',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ja3p4d3h4dHlleWRvbG1kaWpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NjU4NDksImV4cCI6MjA4MzA0MTg0OX0.fjECugk1tkmhBNrR-030CJo6kB-_t8BLPYzhKCzTf1E"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Reset daily send counters at midnight UTC (= 21h BRT)
SELECT cron.schedule(
  'whatsapp-reset-daily',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://nckzxwxxtyeydolmdijn.supabase.co/functions/v1/whatsapp-message-sender/reset-daily',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ja3p4d3h4dHlleWRvbG1kaWpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NjU4NDksImV4cCI6MjA4MzA0MTg0OX0.fjECugk1tkmhBNrR-030CJo6kB-_t8BLPYzhKCzTf1E"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

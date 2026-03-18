-- Fix cron jobs: correct Supabase project URL and anon key.
-- Previous migration used wrong project ID (nckzxwxxtyeydolmdijn → rsbkcuyvnzpqqcbbaoqc).

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
    url := 'https://rsbkcuyvnzpqqcbbaoqc.supabase.co/functions/v1/whatsapp-message-sender/process',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzYmtjdXl2bnpwcXFjYmJhb3FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzQzNjMsImV4cCI6MjA4ODA1MDM2M30.vDUejoegOYtZM872b6opLiuCrSSdyV59NESjTiwa1Rw"}'::jsonb,
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
    url := 'https://rsbkcuyvnzpqqcbbaoqc.supabase.co/functions/v1/whatsapp-message-sender/reset-hourly',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzYmtjdXl2bnpwcXFjYmJhb3FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzQzNjMsImV4cCI6MjA4ODA1MDM2M30.vDUejoegOYtZM872b6opLiuCrSSdyV59NESjTiwa1Rw"}'::jsonb,
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
    url := 'https://rsbkcuyvnzpqqcbbaoqc.supabase.co/functions/v1/whatsapp-message-sender/reset-daily',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzYmtjdXl2bnpwcXFjYmJhb3FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzQzNjMsImV4cCI6MjA4ODA1MDM2M30.vDUejoegOYtZM872b6opLiuCrSSdyV59NESjTiwa1Rw"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

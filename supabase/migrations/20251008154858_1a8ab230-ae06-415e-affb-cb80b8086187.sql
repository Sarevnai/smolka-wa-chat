-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to process scheduled campaigns every minute
SELECT cron.schedule(
  'process-scheduled-campaigns',
  '* * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://wpjxsgxxhogzkkuznyke.supabase.co/functions/v1/process-scheduled-campaigns',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwanhzZ3h4aG9nemtrdXpueWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDk3NjcsImV4cCI6MjA3MzAyNTc2N30.tTbVFi-CkgJZroJa-V0QPAPU5sYU3asmD-2yn2ytca0"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

COMMENT ON EXTENSION pg_cron IS 'Enables scheduled job execution for campaign processing';
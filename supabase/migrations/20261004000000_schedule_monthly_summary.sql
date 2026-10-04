-- Schedules the monthly-summary Edge Function for 03:00 UTC (08:45 Nepal time) on the 1st of each month.
--
-- Before running this, store the secrets it reads in Vault (SQL editor, run once; don't commit the values):
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<same value as the CRON_SECRET function secret>', 'monthly_summary_cron_secret');

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('monthly-summary')
where exists (select 1 from cron.job where jobname = 'monthly-summary');

select cron.schedule(
  'monthly-summary',
  '0 3 1 * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/monthly-summary',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'monthly_summary_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) as request_id;
  $$
);

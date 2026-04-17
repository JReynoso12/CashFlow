-- Schedules the savings-reminder edge function to run on days 27-31 of
-- every month at 13:00 UTC (9pm Manila), so users who haven't funded their
-- monthly goals get an email before the month ends. Uses pg_net to POST
-- and Supabase Vault to hold a shared secret that the edge function
-- verifies via its CRON_SECRET env var.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'savings_reminder_cron_secret') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
      'savings_reminder_cron_secret',
      'Shared secret between pg_cron and the savings-reminder edge function'
    );
  end if;
end $$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'savings-reminder-monthly') then
    perform cron.unschedule('savings-reminder-monthly');
  end if;
end $$;

select cron.schedule(
  'savings-reminder-monthly',
  '0 13 27-31 * *',
  $cmd$
    select net.http_post(
      url := 'https://cqqwtllgixywcmhmrhzc.supabase.co/functions/v1/savings-reminder',
      headers := jsonb_build_object(
        'Authorization',
          'Bearer ' || (
            select decrypted_secret
              from vault.decrypted_secrets
             where name = 'savings_reminder_cron_secret'
             limit 1
          ),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  $cmd$
);

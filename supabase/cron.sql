-- Scheduled server-side sync (so scores update even when nobody has the app open).
-- Run AFTER the app is deployed to Vercel.
--
-- 1. In Supabase: Database -> Extensions -> enable "pg_cron" and "pg_net".
-- 2. Replace YOUR_APP_URL and YOUR_CRON_SECRET below, then run this in the SQL Editor.
--
-- Polls every 2 minutes. API-Football quota note: 30 calls/hour from this alone
-- (sync makes 1-2 calls per run) — fine on the paid tier, tight on free.

select cron.schedule(
  'sync-scores',
  '*/2 * * * *',
  $$
  select net.http_get(
    url := 'https://YOUR_APP_URL.vercel.app/api/sync?secret=YOUR_CRON_SECRET'
  );
  $$
);

-- To stop it later: select cron.unschedule('sync-scores');

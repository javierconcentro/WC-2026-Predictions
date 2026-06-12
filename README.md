# WC 2026 Office Pool

World Cup 2026 prediction pool for the office. Next.js + Supabase + API-Football.

Three parts: outright picks (champion, runner-up, top scorer, MVP, golden glove — 80 pts),
group rankings (3/2/1/1 per group × 12 — 84 pts), and a forgiving knockout bracket
(3/5/8/12 per team per round + 10 bronze — 154 pts). Total pool: 318.

## Deploy checklist (in order)

### 1. Supabase (free tier)
1. supabase.com → New project (any name/region, save the DB password somewhere).
2. SQL Editor → paste the whole of `supabase/schema.sql` → Run.
3. Project Settings → API → copy the **Project URL** and the **service_role key**.

### 2. Vercel
1. vercel.com → sign in with GitHub → Add New → Project → import this repo.
2. Add environment variables before deploying:
   - `SUPABASE_URL` — the project URL
   - `SUPABASE_SERVICE_ROLE_KEY` — the service_role key
   - `SHARED_PASSCODE` — what the office types to join
   - `ADMIN_PASSCODE` — admin-only passcode
   - `FOOTBALLDATA_KEY` — from football-data.org (free tier covers the World Cup; takes priority)
     — or `APIFOOTBALL_KEY` from dashboard.api-football.com (paid plan required for season 2026)
   - `CRON_SECRET` — any long random string
3. Deploy → you get `https://<project>.vercel.app`.

### 3. First data load
1. Open the app → Leaderboard tab → tap the faint **admin** link at the bottom → enter `ADMIN_PASSCODE`.
2. Click **Sync scores now** (seeds teams, groups, all fixtures, standings).
3. Click **Load squads** once (fills the player-name typeahead; 48 API calls).

### 4. Scheduled score updates
1. Supabase → Database → Extensions → enable `pg_cron` and `pg_net`.
2. Edit `supabase/cron.sql` (your Vercel URL + `CRON_SECRET`), paste into the SQL Editor, Run.

### 5. Share
Send colleagues the URL + `SHARED_PASSCODE`. They enter a name and predict.
Picks auto-save and stay editable until the lock (defaults to Sat Jun 13, 2:30 pm ET —
adjustable in the admin panel).

## Local dev

```
npm install
copy .env.example .env.local   # then fill it in
npm run dev
```

## Notes
- All scoring recomputes on read from `(picks, actuals)` — nothing is stored.
- Locks are enforced server-side in the API routes.
- Manual fixture overrides set `manual_override=true`; the sync never touches those rows.
- Other players' picks are hidden until the lock so nobody copies.
- Part 3 (bracket UI + knockout drill-down in Live Games) ships before June 27.

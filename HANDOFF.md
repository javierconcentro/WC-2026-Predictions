# WC 2026 Pool — Handoff (as of 2026-06-29)

Office World Cup 2026 prediction pool for ~10 colleagues. This doc hands off to a fresh Claude Code session.

## ⚠️ Handover note (2026 tournament is over)
The original author has left Concentro. The work GitHub account
(`javierconcentro`), and possibly the Supabase and Vercel projects tied to that
work identity, will go away. If you are the new owner:
1. **Push this repo to your own GitHub** — it was delivered as a `.bundle` (full
   history): `git clone wc2026-pool.bundle WC_2026_Pool`, then set your own
   remote: `git remote set-url origin <your-repo-url>` and `git push -u origin main`.
2. **Stand up your own backend** — create your own Supabase project and run
   `supabase/schema.sql`, get your own free football-data.org key, and write your
   own `.env.local` from `.env.example`. See `README.md`.
3. **The pool data does NOT live in this repo** — players, picks, fixtures and
   results are all rows in Supabase. If the original project is gone, the app
   will start empty (a working app, no history). A SQL export is needed to keep
   the 2026 results.
4. **Rotate every secret** (see "Access / secrets" below).

## How to work on this
- **Project root:** `C:\Users\JavierMarazuela\OneDrive - Concentro\Claude\WC_2026_Pool` (original author's machine)
- **Repo:** github.com/javierconcentro/WC-2026-Predictions (branch `main`) — **work account, being closed; move to a new remote**
- **Deploy:** Vercel auto-deploys on push to `main` (~1 min). There is no local dev server in this workflow.
- **Loop for every change:** edit → `npx tsc --noEmit` (and `npx next build` for anything non-trivial) → `git add -A && git commit && git push`. **You commit & push on the user's behalf** — they don't run an interactive terminal here. End commit messages with the `Co-Authored-By` trailer.
- **DB access:** Supabase via REST with the service-role key in `.env.local` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). Config/data tweaks are done with `curl` PATCH/POST against the REST API. Read `.env.local` for the key — do not paste it into files or chat.
- **Timezone:** the user speaks in ET (UTC-4). Convert to UTC for the DB.
- **There is a detailed auto-memory** at `…/memory/wc2026-pool-app.md` (loaded via MEMORY.md each session) — read it; it has the deeper history.

## Stack
Next.js 15 App Router + TypeScript + Tailwind v4, Supabase (service-role key, server-side only), Vercel. Sports data: **football-data.org free tier** (provider auto-selects on `FOOTBALLDATA_KEY` in `lib/provider/index.ts`). API-Football free has **no** access to season 2026.

## Access / secrets
- **Join:** name only — the shared passcode was removed. `SHARED_PASSCODE` env is now unused.
- **Admin:** passcode `javier-admin-2026` (`ADMIN_PASSCODE`). "Admin log in" link is at the bottom of the join screen; admin works without a player account. Admin panel (bottom of Leaderboard) has Sync, Load squads, manual result override, awards entry, and a config form (lock dates + payout) that pre-fills current values.
  - ⚠️ **CHANGE THIS BEFORE ANY FUTURE RUN.** This passcode is written in cleartext in this doc and was only ever a low-stakes gate for a finished office pool. If you reuse this app for another tournament, set a new `ADMIN_PASSCODE` (and don't commit it here). Same goes for rotating `SUPABASE_SERVICE_ROLE_KEY`, `FOOTBALLDATA_KEY` and `CRON_SECRET` if this project changes hands.
- Logo: `public/Concentro-Logo/concentro-logo_navy.png` in the header.

## Scoring (recomputed on read in `lib/scoring.ts`; total 318)
- **Part 1 — Awards (80):** champ 25 / runner-up 15 / top scorer 20 / MVP 10 / golden glove 10.
- **Part 2 — Group rankings (84):** 3/2/1/1 per group ×12. **Scores off the CURRENT live standings position** (changed from "all 6 matches done"; points shift each matchday).
- **Part 3 — Bracket (154):** reaching R16/QF/SF/F = 3/5/8/12 per team + 10 bronze. Champion deliberately excluded (it's Part 1). Path-independent / forgiving (scores a pick if that team actually reached the round).
- **Parts 1 & 2 only score once `config.lock_part12_at` has passed** (editable picks must not score). They're locked now (lock was 2026-06-17).
- Tiebreak: champion pick, then runner-up, else shared rank.

## Current config (config table, single row id=1)
- `lock_part12_at` = **2026-06-17T00:00Z** (passed → Awards + Groups locked and scoring).
- `bracket_open_at` = **2026-06-23T00:00Z** (bracket open).
- `bracket_lock_at` = **2026-06-29T17:00Z** = **1pm ET today** — whole bracket freezes then, AND others' brackets become visible then (player page hides others' bracket until `bracketLocked(cfg)`).
- `payout_text` = "🏆 Prize for Top 3 — to be determined".

## The bracket (most recent, most fiddly area)
- Built from the **real R32 fixtures** via `r32FromFixtures(fixtures, teams)` in `lib/bracket.ts`, used by `app/picks/page.tsx` → `PicksEditor` → `components/BracketEditor.tsx`.
- **Slot ↔ fixture binding (robust, no kickoff dependency):**
  - **R32:** `R32_MATCHUPS` is the fixed pairing list *by provider team id* (slot order defines the tree; R16-k is fed by R32-(2k-1) and R32-(2k)). A game binds to its slot by matching those two team ids — so a feed reschedule can **never** unbind a game. (This replaced the old fragile "match by exact kickoff" approach after the Mexico–Ecuador game silently unbound when its kickoff moved +1h.)
  - **R16/QF/SF:** `knockoutFixtureSlots(fixtures)` binds by the *real matchup* — the two teams that actually won the feeder slots. Exact once a round is decided (survives reschedules). For games not yet decided it falls back to `KO_SLOT_KICKOFFS` (scheduled kickoff) so future picks still attach. Editor numbers R16 slots sequentially by R32 order; `KO_SLOT_KICKOFFS` maps each kickoff to the editor slot whose **region** it is (not the venue's printed game number).
  - **Final / third-place:** unique per stage (`F` → champion slot `F-1`, `bronze`).
- **Per-match locks:** `r32SlotLocks(fixtures)` returns slot→kickoff read **live from the fixtures**, so a reschedule moves the lock too. Used by the page (UI greys the box) and `app/api/picks/bracket/route.ts` (server preserves locked-slot picks on the replace-all save). Global `bracket_lock_at` freezes everything regardless.
- **Pre-fill finished winners:** `r32ResolvedWinners(fixtures)` returns slot→actual winner for finished matches (matched by pairing). A locked+finished match a player left blank shows the real winner in the editor **for display/tree only — it is NOT saved as a pick** (an unmade pick scores 0). Genuine picks are never overwritten.
- **Auto-fill suppression:** `lib/autofilled-picks.ts` (`AUTOFILLED_PICKS`) voids specific historical platform-inserted picks (scoring + display); `lib/bracket-locked-players.ts` locks players who already submitted after the bracket was reopened.
- **Visual:** two-sided tree (Final centered, 3rd place below), SVG connectors from real box positions, fixed 130px boxes, full-bleed width. Selected winners = darker grey + bold; the leaderboard/profile viewer additionally shows green for picks that scored; the My-Picks editor shows green (advanced) / red (eliminated) / grey (pending) from `/api/bracket-actuals`. Champion is pickable here (slot `F-1`) but the scored 25-pt champion is the Awards pick.

## Live scores
- football-data **free tier has NO live minute field** and serves **delayed** data — confirmed by querying the API. The `LIVE '80` minute is a kickoff-based **estimate**. Real-time + exact minute would need a paid plan (API-Football paid gives `fixture.status.elapsed`); user declined to pay.
- **No cron is set up.** Instead, `/api/fixtures` does an on-demand throttled (~20s) live sync whenever someone has the Live tab open (`runLiveSync` in `lib/sync.ts`, fixtures only, 1 API call). `supabase/cron.sql` exists for pg_cron but isn't enabled (optional — only needed for updates when nobody's watching).

## Open / possible next tasks
- As R32 games finish, winners auto-fill blanks (until 1pm freeze). After R32 completes, R16+ fixtures populate and bracket points start accruing.
- **Player detail page** bracket section still lists raw `slot: team` — could get the round-by-round + points treatment that Awards/Groups have. (Awards/Groups already show per-pick points, green for correct, red actual-position tag.)
- **Knockout drill-down** in `components/LiveGames.tsx` (`ExpandedGame`) is still a placeholder for KO stages.
- Optionally enable pg_cron (`supabase/cron.sql`, needs the Vercel URL + `CRON_SECRET`) so scores update when nobody's on the app.
- Payout text is a placeholder ("Prize for Top 3 — to be determined").

## Gotchas
- Bracket slot binding is the #1 trap — R32 binds by fixed team-id pairings (`R32_MATCHUPS`), R16+ by real matchup with a `KO_SLOT_KICKOFFS` fallback. Never bind R32 by kickoff time (feed reschedules break it) and never raw-sort fixtures by kickoff.
- Config/lock changes: either the admin UI form, or REST PATCH on the `config` row.
- Don't reintroduce a join passcode unless asked.
- Windows shell: prefer the Bash tool with the service key inline for Supabase curl; `node -e` for JSON parsing (no `python`).

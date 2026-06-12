-- World Cup 2026 Prediction Pool — database schema
-- Paste this whole file into the Supabase SQL Editor and click Run.

create table if not exists teams (
  id integer primary key,              -- provider (API-Football) team id
  name text not null,
  code text,
  group_letter text,                   -- 'A'..'L'
  flag_url text
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists fixtures (
  id integer primary key,              -- provider fixture id
  stage text not null check (stage in ('group','R32','R16','QF','SF','F','bronze')),
  group_letter text,
  home_team_id integer references teams(id),
  away_team_id integer references teams(id),
  home_team_name text,                 -- fallback while knockout pairings are TBD
  away_team_name text,
  kickoff_utc timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','live','finished')),
  home_score integer,
  away_score integer,
  home_penalties integer,
  away_penalties integer,
  winner_team_id integer references teams(id),  -- decisive winner incl. ET/pens (knockout)
  manual_override boolean not null default false,
  last_synced_at timestamptz
);

-- Live/current group standings, refreshed by sync
create table if not exists standings (
  group_letter text not null,
  position integer not null,
  team_id integer not null references teams(id),
  played integer not null default 0,
  points integer not null default 0,
  goal_diff integer not null default 0,
  goals_for integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (group_letter, position)
);

-- Part 1 picks (one row per player)
create table if not exists part1_picks (
  player_id uuid primary key references players(id) on delete cascade,
  champion_team_id integer references teams(id),
  runnerup_team_id integer references teams(id),
  top_scorer_provider_id integer,
  top_scorer_name text,
  mvp_name text,
  golden_glove_name text,
  updated_at timestamptz not null default now()
);

-- Part 2 picks (48 rows per player: 12 groups x 4 positions)
create table if not exists group_rankings (
  player_id uuid not null references players(id) on delete cascade,
  group_letter text not null,
  team_id integer not null references teams(id),
  predicted_position integer not null check (predicted_position between 1 and 4),
  primary key (player_id, group_letter, predicted_position)
);

-- Part 3 picks (bracket; built after groups conclude)
create table if not exists bracket_picks (
  player_id uuid not null references players(id) on delete cascade,
  slot text not null,                  -- e.g. 'R32-1', 'R16-3', 'QF-2', 'SF-1', 'F-1'
  picked_team_id integer not null references teams(id),
  primary key (player_id, slot)
);

create table if not exists bronze_picks (
  player_id uuid primary key references players(id) on delete cascade,
  bronze_winner_team_id integer references teams(id)
);

-- Single row: end-of-tournament truths that scoring reads
create table if not exists actuals (
  id integer primary key default 1 check (id = 1),
  champion_team_id integer references teams(id),
  runnerup_team_id integer references teams(id),
  bronze_winner_team_id integer references teams(id),
  top_scorer_provider_id integer,
  top_scorer_name text,
  mvp_name text,
  golden_glove_name text,
  updated_at timestamptz not null default now()
);
insert into actuals (id) values (1) on conflict do nothing;

-- Single config row
create table if not exists config (
  id integer primary key default 1 check (id = 1),
  lock_part12_at timestamptz not null default '2026-06-13 18:30:00+00',  -- Sat Jun 13, 2:30pm ET
  bracket_open_at timestamptz not null default '2026-06-27 23:59:00+00',
  bracket_lock_at timestamptz not null default '2026-06-28 16:00:00+00', -- adjust to first R32 kickoff
  payout_text text not null default '$10 buy-in · 1st $60 / 2nd $30 / 3rd $10',
  updated_at timestamptz not null default now()
);
insert into config (id) values (1) on conflict do nothing;

-- Squad players for the top scorer / MVP / golden glove typeahead
create table if not exists squad_players (
  provider_id integer primary key,
  name text not null,
  team_id integer references teams(id),
  position text
);
create index if not exists squad_players_name_idx on squad_players using gin (to_tsvector('simple', name));

-- The app talks to the database exclusively through the service-role key
-- on the server, so RLS stays disabled-by-simplicity but the anon key is
-- never shipped to the browser. Do not expose the service key client-side.

import type { Fixture, StandingRow, Team } from "./types";

// Bracket seeding for the knockout stage. WC 2026: 32 teams reach the Round of
// 32 = top 2 of each of the 12 groups (24) + the 8 best third-placed teams.
// Pairings here are a simple 1-vs-32 seed (good enough — scoring is
// path-independent, so the tree is for UX, not correctness).

export interface SeedTeam {
  id: number;
  name: string;
  code: string | null;
}

export interface Matchup {
  slot: string; // R32-1 .. R32-16
  a: SeedTeam | null;
  b: SeedTeam | null;
}

export function seedQualifiers(standings: StandingRow[], teams: Team[]): SeedTeam[] {
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const seed = (id: number): SeedTeam => ({
    id,
    name: teamById.get(id)?.name ?? "TBD",
    code: teamById.get(id)?.code ?? null,
  });

  const byGroupPos = new Map<string, number>();
  for (const s of standings) byGroupPos.set(`${s.group_letter}-${s.position}`, s.team_id);
  const groups = [...new Set(standings.map((s) => s.group_letter))].sort();

  const winners: number[] = [];
  const runnersUp: number[] = [];
  const thirdRows: StandingRow[] = [];
  for (const g of groups) {
    const w = byGroupPos.get(`${g}-1`);
    if (w) winners.push(w);
    const r = byGroupPos.get(`${g}-2`);
    if (r) runnersUp.push(r);
    const third = standings.find((s) => s.group_letter === g && s.position === 3);
    if (third) thirdRows.push(third);
  }
  // Best 8 third-placed teams by points, then goal difference, then goals for.
  thirdRows.sort(
    (a, b) => b.points - a.points || b.goal_diff - a.goal_diff || b.goals_for - a.goals_for
  );
  const bestThirds = thirdRows.slice(0, 8).map((s) => s.team_id);

  return [...winners, ...runnersUp, ...bestThirds].map(seed);
}

// The actual Round-of-32 bracket (official pairings). null = TBD until the
// feeding group finishes. Order = bracket position (R32-1..16); adjacent pairs
// feed the same Round-of-16 match. Update names here as TBDs are decided.
const R32_FIXED: [string | null, string | null][] = [
  ["South Africa", "Canada"],
  ["Netherlands", "Morocco"],
  ["Germany", null],
  [null, null],
  [null, null],
  ["United States", "Bosnia-Herzegovina"],
  [null, null],
  [null, null],
  ["Brazil", "Japan"],
  ["Ivory Coast", null],
  ["Mexico", null],
  [null, null],
  ["Switzerland", null],
  [null, null],
  ["Australia", null],
  ["Argentina", null],
];

// Per-slot lock overrides (ISO UTC) for matches that kick off BEFORE the global
// bracket lock — that slot freezes at this time so nobody picks it after it
// starts. Everything without an entry locks at the global bracket_lock_at.
export const R32_SLOT_LOCKS: Record<string, string> = {
  "R32-1": "2026-06-28T19:00:00Z", // South Africa vs Canada — locks at kickoff (Sun 3pm ET)
};

// Official bracket order: each R32 slot's kickoff (UTC), taken from the source
// bracket. Used to map bracket positions to real fixtures (by kickoff) so the
// halves/sides match the official draw — e.g. Spain (slot 7, left) is opposite
// Argentina (slot 16, right). Each slot also locks at this time.
const R32_SLOT_KICKOFFS: string[] = [
  "2026-06-28T19:00:00Z", // 1  South Africa vs Canada
  "2026-06-30T01:00:00Z", // 2  Netherlands vs Morocco
  "2026-06-29T20:30:00Z", // 3  Germany vs Paraguay
  "2026-06-30T21:00:00Z", // 4  France vs Sweden
  "2026-07-01T20:00:00Z", // 5  Belgium vs Senegal
  "2026-07-02T00:00:00Z", // 6  USA vs Bosnia-Herzegovina
  "2026-07-02T19:00:00Z", // 7  Spain vs Austria
  "2026-07-02T23:00:00Z", // 8  Portugal vs Croatia
  "2026-06-29T17:00:00Z", // 9  Brazil vs Japan
  "2026-06-30T17:00:00Z", // 10 Ivory Coast vs Norway
  "2026-07-01T01:00:00Z", // 11 Mexico vs Ecuador
  "2026-07-01T16:00:00Z", // 12 England vs Congo DR
  "2026-07-03T03:00:00Z", // 13 Switzerland vs Algeria
  "2026-07-04T01:30:00Z", // 14 Colombia vs Ghana
  "2026-07-03T18:00:00Z", // 15 Australia vs Egypt
  "2026-07-03T22:00:00Z", // 16 Argentina vs Cape Verde Islands
];

// Each R32 slot locks at its own kickoff. Page and API both call this so they
// agree on slot numbering and lock times.
export function r32SlotLocks(): Record<string, string> {
  const locks: Record<string, string> = {};
  R32_SLOT_KICKOFFS.forEach((t, i) => {
    locks[`R32-${i + 1}`] = t;
  });
  return locks;
}

// Actual winners of finished R32 matches, by slot — used to pre-fill a slot a
// player left blank once that match is over (so it flows into the next round).
export function r32ResolvedWinners(fixtures: Fixture[]): Record<string, number> {
  const byKickoff = new Map(fixtures.map((f) => [Date.parse(f.kickoff_utc), f]));
  const out: Record<string, number> = {};
  R32_SLOT_KICKOFFS.forEach((t, i) => {
    const f = byKickoff.get(Date.parse(t));
    if (f && f.status === "finished" && f.winner_team_id) out[`R32-${i + 1}`] = f.winner_team_id;
  });
  return out;
}

// Build the bracket's Round-of-32 from the real fixtures (all 32 teams) in the
// official slot order, by matching each slot's kickoff to its fixture.
export function r32FromFixtures(
  fixtures: Fixture[],
  teams: Team[]
): { matchups: Matchup[]; slotLocks: Record<string, string> } {
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const seed = (id: number | null): SeedTeam | null => {
    if (!id) return null;
    const t = teamById.get(id);
    return t ? { id: t.id, name: t.name, code: t.code ?? null } : null;
  };
  const byKickoff = new Map(fixtures.map((f) => [Date.parse(f.kickoff_utc), f]));
  const matchups: Matchup[] = R32_SLOT_KICKOFFS.map((t, i) => {
    const f = byKickoff.get(Date.parse(t));
    return {
      slot: `R32-${i + 1}`,
      a: f ? seed(f.home_team_id) : null,
      b: f ? seed(f.away_team_id) : null,
    };
  });
  return { matchups, slotLocks: r32SlotLocks() };
}

export function fixedR32Matchups(teams: Team[]): Matchup[] {
  const byName = new Map(teams.map((t) => [t.name, t]));
  const seed = (name: string | null): SeedTeam | null => {
    if (!name) return null;
    const t = byName.get(name);
    return t ? { id: t.id, name: t.name, code: t.code ?? null } : null;
  };
  return R32_FIXED.map(([a, b], i) => ({ slot: `R32-${i + 1}`, a: seed(a), b: seed(b) }));
}

export function r32Matchups(seeds: SeedTeam[]): Matchup[] {
  const matchups: Matchup[] = [];
  const half = Math.floor(seeds.length / 2);
  for (let i = 0; i < Math.max(half, 16); i++) {
    matchups.push({
      slot: `R32-${i + 1}`,
      a: seeds[i] ?? null,
      b: seeds[seeds.length - 1 - i] ?? null,
    });
    if (matchups.length === 16) break;
  }
  return matchups;
}

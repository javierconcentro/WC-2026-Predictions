import type { StandingRow, Team } from "./types";

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

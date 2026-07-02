import type { Fixture, Team } from "./types";

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

// Official Round-of-32 pairings, by provider team id. Slot order defines the
// bracket TREE: adjacent slots feed the same R16 match (editor numbering, i.e.
// R16-k is fed by R32-(2k-1) and R32-(2k)). Games bind to slots by matching
// these team ids — the pairing is what's fixed, so a kickoff reschedule can
// never unbind a game.
const R32_MATCHUPS: [number, number][] = [
  [774, 828], //   R32-1  South Africa v Canada
  [8601, 815], //  R32-2  Netherlands v Morocco
  [759, 761], //   R32-3  Germany v Paraguay
  [773, 792], //   R32-4  France v Sweden
  [805, 804], //   R32-5  Belgium v Senegal
  [771, 1060], //  R32-6  United States v Bosnia-Herzegovina
  [760, 816], //   R32-7  Spain v Austria
  [765, 799], //   R32-8  Portugal v Croatia
  [764, 766], //   R32-9  Brazil v Japan
  [1935, 8872], // R32-10 Ivory Coast v Norway
  [769, 791], //   R32-11 Mexico v Ecuador
  [770, 1934], //  R32-12 England v Congo DR
  [788, 778], //   R32-13 Switzerland v Algeria
  [818, 763], //   R32-14 Colombia v Ghana
  [779, 825], //   R32-15 Australia v Egypt
  [762, 1930], //  R32-16 Argentina v Cape Verde Islands
];

// The R32 fixture for a pairing, matched by team ids (order-independent).
function r32FixtureFor(
  fixtures: Fixture[],
  [x, y]: [number, number]
): Fixture | undefined {
  return fixtures.find(
    (f) =>
      f.stage === "R32" &&
      ((f.home_team_id === x && f.away_team_id === y) ||
        (f.home_team_id === y && f.away_team_id === x))
  );
}

// Each R32 slot locks at its own kickoff, read LIVE from the fixture — so if the
// feed reschedules a game, the lock moves with it. A slot whose fixture isn't
// found simply isn't locked early (it still freezes at the global bracket lock).
// Page and API both call this so they agree on slot numbering and lock times.
export function r32SlotLocks(fixtures: Fixture[]): Record<string, string> {
  const locks: Record<string, string> = {};
  R32_MATCHUPS.forEach((pair, i) => {
    const f = r32FixtureFor(fixtures, pair);
    if (f?.kickoff_utc) locks[`R32-${i + 1}`] = f.kickoff_utc;
  });
  return locks;
}

// Actual winners of finished R32 matches, by slot — used to pre-fill a slot a
// player left blank once that match is over (so it flows into the next round).
export function r32ResolvedWinners(fixtures: Fixture[]): Record<string, number> {
  const out: Record<string, number> = {};
  R32_MATCHUPS.forEach((pair, i) => {
    const f = r32FixtureFor(fixtures, pair);
    if (f && f.status === "finished" && f.winner_team_id) {
      out[`R32-${i + 1}`] = f.winner_team_id;
    }
  });
  return out;
}

// Build the bracket's Round-of-32 (all 16 pairings, in slot order) from the real
// fixtures, matched by the fixed pairing. a/b follow the fixture's home/away
// (falling back to the pairing order before the fixture exists).
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
  const matchups: Matchup[] = R32_MATCHUPS.map((pair, i) => {
    const f = r32FixtureFor(fixtures, pair);
    return {
      slot: `R32-${i + 1}`,
      a: seed(f ? f.home_team_id : pair[0]),
      b: seed(f ? f.away_team_id : pair[1]),
    };
  });
  return { matchups, slotLocks: r32SlotLocks(fixtures) };
}

// Scheduled kickoff (ISO UTC) for the LATER rounds only. R32 binds by pairing
// (above); R16/QF/SF bind by the real matchup once their feeder round is decided
// and fall back to this schedule for games not yet decided, so future picks
// still attach to a game. Editor numbers R16 slots sequentially by R32 order
// (R16-k <- R32-(2k-1) + R32-(2k)); the physical schedule labels the games
// differently, so each kickoff is matched to the editor slot whose REGION it is
// — not the venue's printed game number.
export const KO_SLOT_KICKOFFS: Record<string, string> = {
  "R16-1": "2026-07-04T17:00:00Z", // Houston          (R32-1 + R32-2:  SA/Canada · Neth/Morocco)
  "R16-2": "2026-07-04T21:00:00Z", // Philadelphia     (R32-3 + R32-4:  Germany/Paraguay · France/Sweden)
  "R16-3": "2026-07-07T00:00:00Z", // Seattle          (R32-5 + R32-6:  Belgium/Senegal · USA/Bosnia)
  "R16-4": "2026-07-06T19:00:00Z", // Arlington TX     (R32-7 + R32-8:  Spain/Austria · Portugal/Croatia)
  "R16-5": "2026-07-05T20:00:00Z", // East Rutherford  (R32-9 + R32-10: Brazil/Japan · Ivory Coast/Norway)
  "R16-6": "2026-07-06T00:00:00Z", // Mexico City      (R32-11 + R32-12: Mexico/Ecuador · England/DR Congo)
  "R16-7": "2026-07-07T20:00:00Z", // Vancouver        (R32-13 + R32-14: Switzerland/Algeria · Colombia/Ghana)
  "R16-8": "2026-07-07T16:00:00Z", // Atlanta          (R32-15 + R32-16: Australia/Egypt · Argentina/Cape Verde)
  "QF-1": "2026-07-09T20:00:00Z", //  Foxborough/Boston (R16-1 + R16-2: R32-1..4)
  "QF-2": "2026-07-10T19:00:00Z", //  Inglewood/LA      (R16-3 + R16-4: R32-5..8)
  "QF-3": "2026-07-11T21:00:00Z", //  Miami             (R16-5 + R16-6: R32-9..12)
  "QF-4": "2026-07-12T01:00:00Z", //  Kansas City       (R16-7 + R16-8: R32-13..16)
  "SF-1": "2026-07-14T19:00:00Z", //  Arlington TX      (QF-1 + QF-2: R32-1..8)
  "SF-2": "2026-07-15T19:00:00Z", //  Atlanta           (QF-3 + QF-4: R32-9..16)
};

// Map each knockout fixture to its bracket slot.
//  • R32 binds by the fixed pairing (team ids) — immune to kickoff changes.
//  • R16/QF/SF bind by the real matchup: the two teams that actually won the
//    feeder slots. Once a round is decided this is exact and survives a
//    reschedule; for games not yet decided we fall back to the scheduled
//    kickoff (KO_SLOT_KICKOFFS) so future picks still attach.
//  • Final and third-place are unique per stage (F -> the champion slot F-1).
export function knockoutFixtureSlots(fixtures: Fixture[]): Map<number, string> {
  const out = new Map<number, string>();
  const winnerBySlot: Record<string, number | null> = {};
  const byKickoff = new Map(fixtures.map((f) => [Date.parse(f.kickoff_utc), f]));

  R32_MATCHUPS.forEach((pair, i) => {
    const slot = `R32-${i + 1}`;
    const f = r32FixtureFor(fixtures, pair);
    if (f) out.set(f.id, slot);
    winnerBySlot[slot] = f && f.status === "finished" ? f.winner_team_id : null;
  });

  const bindRound = (stage: string, count: number, prefix: string, feeder: string) => {
    const roundFixtures = fixtures.filter((f) => f.stage === stage);
    for (let k = 1; k <= count; k++) {
      const slot = `${prefix}-${k}`;
      const a = winnerBySlot[`${feeder}-${2 * k - 1}`];
      const b = winnerBySlot[`${feeder}-${2 * k}`];
      let f: Fixture | undefined;
      if (a && b) {
        f = roundFixtures.find(
          (x) =>
            (x.home_team_id === a && x.away_team_id === b) ||
            (x.home_team_id === b && x.away_team_id === a)
        );
      }
      if (!f) {
        const t = KO_SLOT_KICKOFFS[slot];
        const cand = t ? byKickoff.get(Date.parse(t)) : undefined;
        if (cand && cand.stage === stage && !out.has(cand.id)) f = cand;
      }
      if (f && !out.has(f.id)) {
        out.set(f.id, slot);
        winnerBySlot[slot] = f.status === "finished" ? f.winner_team_id : null;
      } else if (winnerBySlot[slot] === undefined) {
        winnerBySlot[slot] = null;
      }
    }
  };
  bindRound("R16", 8, "R16", "R32");
  bindRound("QF", 4, "QF", "R16");
  bindRound("SF", 2, "SF", "QF");

  for (const f of fixtures) {
    if (f.stage === "F" && !out.has(f.id)) out.set(f.id, "F-1");
    else if (f.stage === "bronze" && !out.has(f.id)) out.set(f.id, "bronze");
  }

  return out;
}

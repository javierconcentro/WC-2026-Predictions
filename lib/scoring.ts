import {
  Actuals,
  BracketPick,
  Fixture,
  GroupRankingRow,
  Part1Picks,
  POINTS,
  StandingRow,
} from "./types";

// Pure functions over (picks, actuals). Totals are always recomputed on
// read — never stored (spec §11).

export interface ScoreBreakdown {
  part1: number;
  part2: number;
  part3: number;
  total: number;
  championCorrect: boolean;
  runnerupCorrect: boolean;
}

function nameMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function scorePart1(picks: Part1Picks | null, actuals: Actuals): {
  points: number;
  championCorrect: boolean;
  runnerupCorrect: boolean;
} {
  if (!picks) return { points: 0, championCorrect: false, runnerupCorrect: false };
  let pts = 0;
  const championCorrect = Boolean(
    actuals.champion_team_id && picks.champion_team_id === actuals.champion_team_id
  );
  const runnerupCorrect = Boolean(
    actuals.runnerup_team_id && picks.runnerup_team_id === actuals.runnerup_team_id
  );
  if (championCorrect) pts += POINTS.part1.champion;
  if (runnerupCorrect) pts += POINTS.part1.runnerup;

  const scorerById =
    actuals.top_scorer_provider_id &&
    picks.top_scorer_provider_id === actuals.top_scorer_provider_id;
  if (scorerById || nameMatch(picks.top_scorer_name, actuals.top_scorer_name)) {
    pts += POINTS.part1.topScorer;
  }
  if (nameMatch(picks.mvp_name, actuals.mvp_name)) pts += POINTS.part1.mvp;
  if (nameMatch(picks.golden_glove_name, actuals.golden_glove_name)) {
    pts += POINTS.part1.goldenGlove;
  }
  return { points: pts, championCorrect, runnerupCorrect };
}

// Group rankings score against the CURRENT live standings — points accrue as
// soon as a team holds a predicted position, and rise/fall as standings change
// through the group stage (no longer gated on all 6 matches being finished).
export function scorePart2(
  rankings: GroupRankingRow[],
  standings: StandingRow[]
): number {
  const positionPoints = [0, POINTS.part2.pos1, POINTS.part2.pos2, POINTS.part2.pos3, POINTS.part2.pos4];
  const actualAt = new Map<string, number>(); // `${group}-${position}` -> team_id
  for (const s of standings) actualAt.set(`${s.group_letter}-${s.position}`, s.team_id);

  let pts = 0;
  for (const r of rankings) {
    if (actualAt.get(`${r.group_letter}-${r.predicted_position}`) === r.team_id) {
      pts += positionPoints[r.predicted_position] ?? 0;
    }
  }
  return pts;
}

// The tournament is over once the Final has been played. Awards (Part 1 —
// champion, runner-up, top scorer, best player, golden glove) only score at
// that point: some resolve progressively during the tournament (e.g. the live
// top scorer changes game to game), so counting them early would award points
// that can still change.
export function tournamentFinished(fixtures: Fixture[]): boolean {
  return fixtures.some((f) => f.stage === "F" && f.status === "finished");
}

// Teams that actually reached each knockout round, derived from finished
// results in the PREVIOUS round — not from future fixtures appearing.
// "Reached R16" = won a finished R32 match, etc.
export function actualRoundMembers(fixtures: Fixture[]): Record<"R16" | "QF" | "SF" | "F", Set<number>> {
  const rounds: Record<"R16" | "QF" | "SF" | "F", Set<number>> = {
    R16: new Set(),
    QF: new Set(),
    SF: new Set(),
    F: new Set(),
  };
  for (const f of fixtures) {
    if (f.status !== "finished" || !f.winner_team_id) continue;
    if (f.stage === "R32") rounds.R16.add(f.winner_team_id);
    else if (f.stage === "R16") rounds.QF.add(f.winner_team_id);
    else if (f.stage === "QF") rounds.SF.add(f.winner_team_id);
    else if (f.stage === "SF") rounds.F.add(f.winner_team_id);
  }
  return rounds;
}

// Forgiving bracket: a player's "teams advanced to round R" are the winners
// they picked in the previous round's slots. Path-independent (spec §5).
export function scorePart3(
  picks: BracketPick[],
  bronzeWinnerPick: number | null,
  fixtures: Fixture[],
  actuals: Actuals
): number {
  if (picks.length === 0 && !bronzeWinnerPick) return 0;
  const actual = actualRoundMembers(fixtures);
  const roundPoints: Array<{ prefix: string; reach: keyof typeof actual; pts: number }> = [
    { prefix: "R32-", reach: "R16", pts: POINTS.part3.reachR16 },
    { prefix: "R16-", reach: "QF", pts: POINTS.part3.reachQF },
    { prefix: "QF-", reach: "SF", pts: POINTS.part3.reachSF },
    { prefix: "SF-", reach: "F", pts: POINTS.part3.reachF },
  ];
  let pts = 0;
  for (const { prefix, reach, pts: per } of roundPoints) {
    for (const p of picks) {
      if (p.slot.startsWith(prefix) && actual[reach].has(p.picked_team_id)) pts += per;
    }
  }
  if (
    bronzeWinnerPick &&
    actuals.bronze_winner_team_id &&
    bronzeWinnerPick === actuals.bronze_winner_team_id
  ) {
    pts += POINTS.part3.bronze;
  }
  return pts;
}

export function scorePlayer(
  part1: Part1Picks | null,
  rankings: GroupRankingRow[],
  bracket: BracketPick[],
  bronzePick: number | null,
  fixtures: Fixture[],
  standings: StandingRow[],
  actuals: Actuals,
  // Parts 1 & 2 stay editable until the lock, so they must not score (and
  // must not feed tiebreakers) before then — otherwise someone could see a
  // result and edit their pick. Part 3 has its own lock and is unaffected.
  part12Locked: boolean
): ScoreBreakdown {
  const p1 = scorePart1(part1, actuals);
  const p2 = scorePart2(rankings, standings);
  const p3 = scorePart3(bracket, bronzePick, fixtures, actuals);
  // Awards (Part 1) only count once the tournament has finished; Part 2 still
  // accrues progressively from the group stage once locked.
  const awardsCount = part12Locked && tournamentFinished(fixtures);
  const part1Pts = awardsCount ? p1.points : 0;
  const part2Pts = part12Locked ? p2 : 0;
  return {
    part1: part1Pts,
    part2: part2Pts,
    part3: p3,
    total: part1Pts + part2Pts + p3,
    championCorrect: awardsCount && p1.championCorrect,
    runnerupCorrect: awardsCount && p1.runnerupCorrect,
  };
}

// Leaderboard sort: total desc, then champion-correct, then runnerup-correct.
// Players still level after that share a rank (spec §6).
export function compareForLeaderboard(a: ScoreBreakdown, b: ScoreBreakdown): number {
  if (b.total !== a.total) return b.total - a.total;
  if (a.championCorrect !== b.championCorrect) return a.championCorrect ? -1 : 1;
  if (a.runnerupCorrect !== b.runnerupCorrect) return a.runnerupCorrect ? -1 : 1;
  return 0;
}

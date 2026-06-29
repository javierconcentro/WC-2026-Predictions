import { db } from "./db";
import { part12Locked } from "./auth";
import { compareForLeaderboard, ScoreBreakdown, scorePlayer } from "./scoring";
import { filterAutofilledPicks } from "./autofilled-picks";
import type {
  Actuals,
  BracketPick,
  Fixture,
  GroupRankingRow,
  Part1Picks,
  Player,
  PoolConfig,
  StandingRow,
} from "./types";

export interface LeaderboardEntry {
  player: Player;
  score: ScoreBreakdown;
  rank: number;
}

export async function buildLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = db();
  const [players, part1, rankings, brackets, bronzes, fixtures, standings, actualsRow, configRow] =
    await Promise.all([
      supabase.from("players").select("*"),
      supabase.from("part1_picks").select("*"),
      supabase.from("group_rankings").select("*"),
      supabase.from("bracket_picks").select("*"),
      supabase.from("bronze_picks").select("*"),
      supabase.from("fixtures").select("*"),
      supabase.from("standings").select("*"),
      supabase.from("actuals").select("*").eq("id", 1).single(),
      supabase.from("config").select("*").eq("id", 1).single(),
    ]);

  const actuals = (actualsRow.data ?? {}) as Actuals;
  const allFixtures = (fixtures.data ?? []) as Fixture[];
  const allStandings = (standings.data ?? []) as StandingRow[];
  const locked = configRow.data ? part12Locked(configRow.data as PoolConfig) : false;

  const entries = ((players.data ?? []) as Player[]).map((player) => {
    const p1 = ((part1.data ?? []) as Part1Picks[]).find((p) => p.player_id === player.id) ?? null;
    const ranks = ((rankings.data ?? []) as GroupRankingRow[]).filter(
      (r) => r.player_id === player.id
    );
    const bracket = filterAutofilledPicks(
      player.id,
      ((brackets.data ?? []) as BracketPick[]).filter((b) => b.player_id === player.id)
    );
    const bronze =
      (bronzes.data ?? []).find((b: any) => b.player_id === player.id)?.bronze_winner_team_id ??
      null;
    return {
      player,
      score: scorePlayer(p1, ranks, bracket, bronze, allFixtures, allStandings, actuals, locked),
      rank: 0,
    };
  });

  entries.sort((a, b) => {
    const cmp = compareForLeaderboard(a.score, b.score);
    if (cmp !== 0) return cmp;
    return a.player.name.localeCompare(b.player.name);
  });

  // Shared rank when fully tied (including tiebreakers)
  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && compareForLeaderboard(entries[i - 1].score, entries[i].score) === 0) {
      entries[i].rank = entries[i - 1].rank;
    } else {
      entries[i].rank = i + 1;
    }
  }
  return entries;
}

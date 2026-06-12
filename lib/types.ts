export type Stage = "group" | "R32" | "R16" | "QF" | "SF" | "F" | "bronze";
export type FixtureStatus = "scheduled" | "live" | "finished";

export interface Team {
  id: number;
  name: string;
  code: string | null;
  group_letter: string | null;
  flag_url: string | null;
}

export interface Player {
  id: string;
  name: string;
  created_at: string;
}

export interface Fixture {
  id: number;
  stage: Stage;
  group_letter: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_team_name: string | null;
  away_team_name: string | null;
  kickoff_utc: string;
  status: FixtureStatus;
  home_score: number | null;
  away_score: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
  winner_team_id: number | null;
  manual_override: boolean;
  last_synced_at: string | null;
}

export interface StandingRow {
  group_letter: string;
  position: number;
  team_id: number;
  played: number;
  points: number;
  goal_diff: number;
  goals_for: number;
}

export interface Part1Picks {
  player_id: string;
  champion_team_id: number | null;
  runnerup_team_id: number | null;
  top_scorer_provider_id: number | null;
  top_scorer_name: string | null;
  mvp_name: string | null;
  golden_glove_name: string | null;
}

export interface GroupRankingRow {
  player_id: string;
  group_letter: string;
  team_id: number;
  predicted_position: number;
}

export interface BracketPick {
  player_id: string;
  slot: string;
  picked_team_id: number;
}

export interface Actuals {
  champion_team_id: number | null;
  runnerup_team_id: number | null;
  bronze_winner_team_id: number | null;
  top_scorer_provider_id: number | null;
  top_scorer_name: string | null;
  mvp_name: string | null;
  golden_glove_name: string | null;
}

export interface PoolConfig {
  lock_part12_at: string;
  bracket_open_at: string;
  bracket_lock_at: string;
  payout_text: string;
}

export interface SquadPlayer {
  provider_id: number;
  name: string;
  team_id: number | null;
  position: string | null;
}

// Scoring constants — the single place point values live (spec §5)
export const POINTS = {
  part1: { champion: 25, runnerup: 15, topScorer: 20, mvp: 10, goldenGlove: 10 },
  part2: { pos1: 3, pos2: 2, pos3: 1, pos4: 1 },
  part3: { reachR16: 3, reachQF: 5, reachSF: 8, reachF: 12, bronze: 10 },
} as const;

export const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"] as const;

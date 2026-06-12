import type { Stage, FixtureStatus } from "../types";

// Swappable data-source interface (spec §8). The app only ever talks to
// this; API-Football is one implementation.

export interface ProviderTeam {
  id: number;
  name: string;
  code: string | null;
  group_letter: string | null;
  flag_url: string | null;
}

export interface ProviderFixture {
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
}

export interface ProviderStanding {
  group_letter: string;
  position: number;
  team_id: number;
  played: number;
  points: number;
  goal_diff: number;
  goals_for: number;
}

export interface ProviderSquadPlayer {
  provider_id: number;
  name: string;
  team_id: number;
  position: string | null;
}

export interface SportsDataProvider {
  getTeamsAndGroups(): Promise<ProviderTeam[]>;
  getFixtures(): Promise<ProviderFixture[]>;
  getGroupStandings(): Promise<ProviderStanding[]>;
  getTopScorer(): Promise<{ provider_id: number; name: string } | null>;
  getSquads(teamIds: number[]): Promise<ProviderSquadPlayer[]>;
}

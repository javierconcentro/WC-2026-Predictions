import type { Stage, FixtureStatus } from "../types";
import type {
  ProviderFixture,
  ProviderSquadPlayer,
  ProviderStanding,
  ProviderTeam,
  SportsDataProvider,
} from "./types";

const BASE = "https://v3.football.api-sports.io";
const LEAGUE = 1; // FIFA World Cup
const SEASON = 2026;

async function apiGet(path: string): Promise<any> {
  const key = process.env.APIFOOTBALL_KEY;
  if (!key) throw new Error("APIFOOTBALL_KEY not configured");
  const res = await fetch(`${BASE}${path}`, {
    headers: { "x-apisports-key": key },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API-Football ${path} -> HTTP ${res.status}`);
  const body = await res.json();
  if (body.errors && Object.keys(body.errors).length > 0) {
    throw new Error(`API-Football ${path} -> ${JSON.stringify(body.errors)}`);
  }
  return body.response;
}

function mapStatus(short: string): FixtureStatus {
  if (["FT", "AET", "PEN", "AWD", "WO"].includes(short)) return "finished";
  if (["1H", "HT", "2H", "ET", "BT", "P", "INT", "LIVE", "SUSP"].includes(short)) return "live";
  return "scheduled";
}

function mapStage(round: string): { stage: Stage; group_letter: string | null } {
  const r = round.toLowerCase();
  if (r.includes("group")) {
    const m = round.match(/group\s+([a-l])/i);
    return { stage: "group", group_letter: m ? m[1].toUpperCase() : null };
  }
  if (r.includes("round of 32") || r.includes("1/16")) return { stage: "R32", group_letter: null };
  if (r.includes("round of 16") || r.includes("1/8")) return { stage: "R16", group_letter: null };
  if (r.includes("quarter")) return { stage: "QF", group_letter: null };
  if (r.includes("semi")) return { stage: "SF", group_letter: null };
  if (r.includes("3rd") || r.includes("third")) return { stage: "bronze", group_letter: null };
  return { stage: "F", group_letter: null };
}

export class ApiFootballProvider implements SportsDataProvider {
  async getTeamsAndGroups(): Promise<ProviderTeam[]> {
    // Standings carry both the 12 groups and the teams in them.
    const response = await apiGet(`/standings?league=${LEAGUE}&season=${SEASON}`);
    const teams: ProviderTeam[] = [];
    const groups: any[][] = response?.[0]?.league?.standings ?? [];
    for (const group of groups) {
      for (const row of group) {
        const m = String(row.group ?? "").match(/group\s+([a-l])/i);
        teams.push({
          id: row.team.id,
          name: row.team.name,
          code: null,
          group_letter: m ? m[1].toUpperCase() : null,
          flag_url: row.team.logo ?? null,
        });
      }
    }
    return teams;
  }

  async getFixtures(): Promise<ProviderFixture[]> {
    const response = await apiGet(`/fixtures?league=${LEAGUE}&season=${SEASON}`);
    return (response ?? []).map((item: any): ProviderFixture => {
      const { stage, group_letter } = mapStage(item.league?.round ?? "");
      const homeWin = item.teams?.home?.winner === true;
      const awayWin = item.teams?.away?.winner === true;
      return {
        id: item.fixture.id,
        stage,
        group_letter,
        home_team_id: item.teams?.home?.id ?? null,
        away_team_id: item.teams?.away?.id ?? null,
        home_team_name: item.teams?.home?.name ?? null,
        away_team_name: item.teams?.away?.name ?? null,
        kickoff_utc: item.fixture.date,
        status: mapStatus(item.fixture?.status?.short ?? "NS"),
        home_score: item.goals?.home ?? null,
        away_score: item.goals?.away ?? null,
        home_penalties: item.score?.penalty?.home ?? null,
        away_penalties: item.score?.penalty?.away ?? null,
        winner_team_id: homeWin
          ? item.teams.home.id
          : awayWin
            ? item.teams.away.id
            : null,
      };
    });
  }

  async getGroupStandings(): Promise<ProviderStanding[]> {
    const response = await apiGet(`/standings?league=${LEAGUE}&season=${SEASON}`);
    const out: ProviderStanding[] = [];
    const groups: any[][] = response?.[0]?.league?.standings ?? [];
    for (const group of groups) {
      for (const row of group) {
        const m = String(row.group ?? "").match(/group\s+([a-l])/i);
        if (!m) continue;
        out.push({
          group_letter: m[1].toUpperCase(),
          position: row.rank,
          team_id: row.team.id,
          played: row.all?.played ?? 0,
          points: row.points ?? 0,
          goal_diff: row.goalsDiff ?? 0,
          goals_for: row.all?.goals?.for ?? 0,
        });
      }
    }
    return out;
  }

  async getTopScorer(): Promise<{ provider_id: number; name: string } | null> {
    const response = await apiGet(`/players/topscorers?league=${LEAGUE}&season=${SEASON}`);
    const top = response?.[0];
    if (!top) return null;
    return { provider_id: top.player.id, name: top.player.name };
  }

  async getSquads(teamIds: number[]): Promise<ProviderSquadPlayer[]> {
    const out: ProviderSquadPlayer[] = [];
    for (const teamId of teamIds) {
      const response = await apiGet(`/players/squads?team=${teamId}`);
      const squad = response?.[0]?.players ?? [];
      for (const p of squad) {
        out.push({
          provider_id: p.id,
          name: p.name,
          team_id: teamId,
          position: p.position ?? null,
        });
      }
    }
    return out;
  }
}

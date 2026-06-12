import type { Stage, FixtureStatus } from "../types";
import type {
  ProviderFixture,
  ProviderSquadPlayer,
  ProviderStanding,
  ProviderTeam,
  SportsDataProvider,
} from "./types";

// football-data.org v4 — free tier includes the FIFA World Cup.
// Rate limit: 10 requests/minute, hence the spacing in getSquads.

const BASE = "https://api.football-data.org/v4";
const COMPETITION = "WC";

async function apiGet(path: string): Promise<any> {
  const key = process.env.FOOTBALLDATA_KEY;
  if (!key) throw new Error("FOOTBALLDATA_KEY not configured");
  const res = await fetch(`${BASE}${path}`, {
    headers: { "X-Auth-Token": key },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`football-data.org ${path} -> HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

function mapStatus(status: string): FixtureStatus {
  if (["FINISHED", "AWARDED"].includes(status)) return "finished";
  if (["IN_PLAY", "PAUSED", "LIVE"].includes(status)) return "live";
  return "scheduled"; // SCHEDULED, TIMED, POSTPONED, SUSPENDED, CANCELLED
}

function mapStage(stage: string): Stage {
  switch (stage) {
    case "GROUP_STAGE":
      return "group";
    case "LAST_32":
      return "R32";
    case "LAST_16":
      return "R16";
    case "QUARTER_FINALS":
      return "QF";
    case "SEMI_FINALS":
      return "SF";
    case "THIRD_PLACE":
      return "bronze";
    default:
      return "F";
  }
}

function groupLetter(group: string | null): string | null {
  const m = (group ?? "").match(/GROUP[_\s]([A-L])/i);
  return m ? m[1].toUpperCase() : null;
}

export class FootballDataProvider implements SportsDataProvider {
  async getTeamsAndGroups(): Promise<ProviderTeam[]> {
    const body = await apiGet(`/competitions/${COMPETITION}/standings`);
    const teams: ProviderTeam[] = [];
    for (const standing of body.standings ?? []) {
      if (standing.type && standing.type !== "TOTAL") continue;
      const letter = groupLetter(standing.group);
      for (const row of standing.table ?? []) {
        teams.push({
          id: row.team.id,
          name: row.team.name,
          code: row.team.tla ?? null,
          group_letter: letter,
          flag_url: row.team.crest ?? null,
        });
      }
    }
    return teams;
  }

  async getFixtures(): Promise<ProviderFixture[]> {
    const body = await apiGet(`/competitions/${COMPETITION}/matches`);
    return (body.matches ?? []).map((m: any): ProviderFixture => {
      const winner =
        m.score?.winner === "HOME_TEAM"
          ? m.homeTeam?.id
          : m.score?.winner === "AWAY_TEAM"
            ? m.awayTeam?.id
            : null;
      return {
        id: m.id,
        stage: mapStage(m.stage ?? ""),
        group_letter: groupLetter(m.group),
        home_team_id: m.homeTeam?.id ?? null,
        away_team_id: m.awayTeam?.id ?? null,
        home_team_name: m.homeTeam?.name ?? null,
        away_team_name: m.awayTeam?.name ?? null,
        kickoff_utc: m.utcDate,
        status: mapStatus(m.status ?? "SCHEDULED"),
        home_score: m.score?.fullTime?.home ?? null,
        away_score: m.score?.fullTime?.away ?? null,
        home_penalties: m.score?.penalties?.home ?? null,
        away_penalties: m.score?.penalties?.away ?? null,
        winner_team_id: winner ?? null,
      };
    });
  }

  async getGroupStandings(): Promise<ProviderStanding[]> {
    const body = await apiGet(`/competitions/${COMPETITION}/standings`);
    const out: ProviderStanding[] = [];
    for (const standing of body.standings ?? []) {
      if (standing.type && standing.type !== "TOTAL") continue;
      const letter = groupLetter(standing.group);
      if (!letter) continue;
      // The API reports tied positions (e.g. four teams all "1" before any
      // games) — use the sorted table order instead, which is always unique.
      (standing.table ?? []).forEach((row: any, idx: number) => {
        out.push({
          group_letter: letter,
          position: idx + 1,
          team_id: row.team.id,
          played: row.playedGames ?? 0,
          points: row.points ?? 0,
          goal_diff: row.goalDifference ?? 0,
          goals_for: row.goalsFor ?? 0,
        });
      });
    }
    return out;
  }

  async getTopScorer(): Promise<{ provider_id: number; name: string } | null> {
    const body = await apiGet(`/competitions/${COMPETITION}/scorers?limit=1`);
    const top = body.scorers?.[0];
    if (!top) return null;
    return { provider_id: top.player.id, name: top.player.name };
  }

  async getSquads(teamIds: number[]): Promise<ProviderSquadPlayer[]> {
    const out: ProviderSquadPlayer[] = [];
    for (let i = 0; i < teamIds.length; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 6500)); // 10 req/min limit
      const body = await apiGet(`/teams/${teamIds[i]}`);
      for (const p of body.squad ?? []) {
        out.push({
          provider_id: p.id,
          name: p.name,
          team_id: teamIds[i],
          position: p.position ?? null,
        });
      }
    }
    return out;
  }
}

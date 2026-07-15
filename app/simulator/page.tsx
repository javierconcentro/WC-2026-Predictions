import { db, dbConfigured } from "@/lib/db";
import { getConfig, isAdmin, currentPlayer, part12Locked } from "@/lib/auth";
import JoinGate from "@/components/JoinGate";
import Simulator from "@/components/Simulator";
import type {
  Actuals,
  BracketPick,
  Fixture,
  GroupRankingRow,
  Part1Picks,
  StandingRow,
  Team,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SimulatorPage() {
  if (!dbConfigured()) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
        <p className="font-semibold">Setup needed</p>
        <p>Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your environment, then reload.</p>
      </div>
    );
  }

  const [me, admin] = await Promise.all([currentPlayer(), isAdmin()]);
  if (!me && !admin) return <JoinGate />;

  const supabase = db();
  const [players, part1, rankings, brackets, bronzes, fixtures, standings, teams, actualsRow, cfg] =
    await Promise.all([
      supabase.from("players").select("id,name"),
      supabase.from("part1_picks").select("*"),
      supabase.from("group_rankings").select("*"),
      supabase.from("bracket_picks").select("*"),
      supabase.from("bronze_picks").select("*"),
      supabase.from("fixtures").select("*"),
      supabase.from("standings").select("*"),
      supabase.from("teams").select("*"),
      supabase.from("actuals").select("*").eq("id", 1).maybeSingle(),
      getConfig(),
    ]);

  return (
    <Simulator
      players={(players.data ?? []) as { id: string; name: string }[]}
      part1={(part1.data ?? []) as Part1Picks[]}
      rankings={(rankings.data ?? []) as GroupRankingRow[]}
      brackets={(brackets.data ?? []) as BracketPick[]}
      bronzes={(bronzes.data ?? []) as { player_id: string; bronze_winner_team_id: number | null }[]}
      fixtures={(fixtures.data ?? []) as Fixture[]}
      standings={(standings.data ?? []) as StandingRow[]}
      teams={(teams.data ?? []) as Team[]}
      actuals={(actualsRow.data ?? {}) as Actuals}
      part12Locked={part12Locked(cfg)}
      meId={me?.id ?? null}
    />
  );
}

import { db } from "./db";
import { getProvider } from "./provider/apiFootball";

// Idempotent sync: first run seeds teams + fixtures, later runs refresh
// scores/standings. Fixtures with manual_override=true are never clobbered.
export async function runSync(): Promise<{ teams: number; fixtures: number; standings: number }> {
  const provider = getProvider();
  const supabase = db();

  const [teams, fixtures, standings] = await Promise.all([
    provider.getTeamsAndGroups(),
    provider.getFixtures(),
    provider.getGroupStandings(),
  ]);

  if (teams.length > 0) {
    const { error } = await supabase.from("teams").upsert(
      teams.map((t) => ({
        id: t.id,
        name: t.name,
        code: t.code,
        group_letter: t.group_letter,
        flag_url: t.flag_url,
      }))
    );
    if (error) throw error;
  }

  // Knockout fixtures may reference teams not yet in `teams` (TBD pairings) —
  // null the FK and keep the placeholder name.
  const teamIds = new Set(teams.map((t) => t.id));
  const { data: existingTeams } = await supabase.from("teams").select("id");
  for (const row of existingTeams ?? []) teamIds.add(row.id);

  const { data: overridden } = await supabase
    .from("fixtures")
    .select("id")
    .eq("manual_override", true);
  const skip = new Set((overridden ?? []).map((r) => r.id));

  const fixtureRows = fixtures
    .filter((f) => !skip.has(f.id))
    .map((f) => ({
      id: f.id,
      stage: f.stage,
      group_letter: f.group_letter,
      home_team_id: f.home_team_id && teamIds.has(f.home_team_id) ? f.home_team_id : null,
      away_team_id: f.away_team_id && teamIds.has(f.away_team_id) ? f.away_team_id : null,
      home_team_name: f.home_team_name,
      away_team_name: f.away_team_name,
      kickoff_utc: f.kickoff_utc,
      status: f.status,
      home_score: f.home_score,
      away_score: f.away_score,
      home_penalties: f.home_penalties,
      away_penalties: f.away_penalties,
      winner_team_id: f.winner_team_id && teamIds.has(f.winner_team_id) ? f.winner_team_id : null,
      manual_override: false,
      last_synced_at: new Date().toISOString(),
    }));
  if (fixtureRows.length > 0) {
    const { error } = await supabase.from("fixtures").upsert(fixtureRows);
    if (error) throw error;
  }

  if (standings.length > 0) {
    const { error } = await supabase.from("standings").upsert(
      standings.map((s) => ({ ...s, updated_at: new Date().toISOString() }))
    );
    if (error) throw error;
  }

  // Keep the live top scorer in actuals so Part 1 scores progressively.
  try {
    const scorer = await getProvider().getTopScorer();
    if (scorer) {
      await supabase
        .from("actuals")
        .update({
          top_scorer_provider_id: scorer.provider_id,
          top_scorer_name: scorer.name,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);
    }
  } catch {
    // Top scorer endpoint failing should never break the score sync.
  }

  // Derive champion / runner-up / bronze from finished finals (admin can
  // still override via the actuals row).
  const { data: finals } = await supabase
    .from("fixtures")
    .select("*")
    .in("stage", ["F", "bronze"])
    .eq("status", "finished");
  for (const f of finals ?? []) {
    if (!f.winner_team_id) continue;
    if (f.stage === "F") {
      const loser = f.winner_team_id === f.home_team_id ? f.away_team_id : f.home_team_id;
      await supabase
        .from("actuals")
        .update({ champion_team_id: f.winner_team_id, runnerup_team_id: loser })
        .eq("id", 1);
    } else {
      await supabase
        .from("actuals")
        .update({ bronze_winner_team_id: f.winner_team_id })
        .eq("id", 1);
    }
  }

  return { teams: teams.length, fixtures: fixtureRows.length, standings: standings.length };
}

// Separate from runSync to protect API quota: 48 squad calls, run once
// from the admin panel.
export async function loadSquads(): Promise<number> {
  const supabase = db();
  const { data: teams, error } = await supabase.from("teams").select("id");
  if (error) throw error;
  const ids = (teams ?? []).map((t) => t.id);
  if (ids.length === 0) throw new Error("No teams in DB yet — run a sync first.");
  const players = await getProvider().getSquads(ids);
  if (players.length > 0) {
    const { error: upErr } = await supabase.from("squad_players").upsert(players);
    if (upErr) throw upErr;
  }
  return players.length;
}

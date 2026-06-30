import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AUTOFILLED_PICKS } from "@/lib/autofilled-picks";

export const dynamic = "force-dynamic";

// All players' knockout predictions, for the per-game voter lists on the Live
// tab. The bracket is locked by the time any knockout game is in view, so picks
// are final and safe to reveal. Auto-filled picks are stripped so a player who
// never made a pick isn't shown as having voted (mirrors leaderboard scoring).
export async function GET() {
  const supabase = db();
  const [players, brackets, part1, bronzes] = await Promise.all([
    supabase.from("players").select("id,name"),
    supabase.from("bracket_picks").select("player_id,slot,picked_team_id"),
    supabase
      .from("part1_picks")
      .select(
        "player_id,champion_team_id,runnerup_team_id,top_scorer_name,mvp_name,golden_glove_name"
      ),
    supabase.from("bronze_picks").select("player_id,bronze_winner_team_id"),
  ]);

  const bracketPicks = (brackets.data ?? []).filter(
    (b: any) => !AUTOFILLED_PICKS.has(`${b.player_id}:${b.slot}`)
  );

  return NextResponse.json({
    players: players.data ?? [],
    bracketPicks,
    awards: part1.data ?? [],
    bronzePicks: bronzes.data ?? [],
  });
}

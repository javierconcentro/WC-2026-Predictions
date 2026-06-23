import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentPlayer, getConfig, bracketLocked } from "@/lib/auth";

export async function GET() {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const supabase = db();
  const [{ data: picks }, { data: bronze }] = await Promise.all([
    supabase.from("bracket_picks").select("*").eq("player_id", player.id),
    supabase.from("bronze_picks").select("*").eq("player_id", player.id).maybeSingle(),
  ]);
  return NextResponse.json({
    picks: picks ?? [],
    bronze_winner_team_id: bronze?.bronze_winner_team_id ?? null,
  });
}

// Body: { picks: [{ slot, picked_team_id }], bronze_winner_team_id }
// Replaces the player's whole bracket each save (the editor sends the full set).
export async function POST(req: NextRequest) {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const cfg = await getConfig();
  if (bracketLocked(cfg)) {
    return NextResponse.json({ error: "Bracket is locked." }, { status: 403 });
  }

  const { picks, bronze_winner_team_id } = await req.json();
  const supabase = db();

  await supabase.from("bracket_picks").delete().eq("player_id", player.id);
  const rows = (Array.isArray(picks) ? picks : [])
    .filter((p: any) => p && typeof p.slot === "string" && Number.isInteger(p.picked_team_id))
    .map((p: any) => ({ player_id: player.id, slot: p.slot, picked_team_id: p.picked_team_id }));
  if (rows.length > 0) {
    const { error } = await supabase.from("bracket_picks").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (Number.isInteger(bronze_winner_team_id)) {
    const { error } = await supabase
      .from("bronze_picks")
      .upsert({ player_id: player.id, bronze_winner_team_id });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    await supabase.from("bronze_picks").delete().eq("player_id", player.id);
  }

  return NextResponse.json({ ok: true });
}

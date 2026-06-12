import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentPlayer, getConfig, part12Locked } from "@/lib/auth";
import { GROUPS } from "@/lib/types";

export async function GET() {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { data } = await db().from("group_rankings").select("*").eq("player_id", player.id);
  return NextResponse.json({ rankings: data ?? [] });
}

// Body: { group_letter: "A", team_ids: [id1, id2, id3, id4] } in predicted order 1->4
export async function POST(req: NextRequest) {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const cfg = await getConfig();
  if (part12Locked(cfg)) {
    return NextResponse.json({ error: "Predictions are locked." }, { status: 403 });
  }

  const { group_letter, team_ids } = await req.json();
  if (!GROUPS.includes(group_letter) || !Array.isArray(team_ids) || team_ids.length !== 4) {
    return NextResponse.json({ error: "Invalid group ranking." }, { status: 400 });
  }

  // Validate the 4 teams really belong to this group
  const { data: groupTeams } = await db()
    .from("teams")
    .select("id")
    .eq("group_letter", group_letter);
  const valid = new Set((groupTeams ?? []).map((t) => t.id));
  if (valid.size !== 4 || !team_ids.every((id: number) => valid.has(id))) {
    return NextResponse.json({ error: "Teams don't match this group." }, { status: 400 });
  }

  const supabase = db();
  await supabase
    .from("group_rankings")
    .delete()
    .eq("player_id", player.id)
    .eq("group_letter", group_letter);
  const { error } = await supabase.from("group_rankings").insert(
    team_ids.map((team_id: number, i: number) => ({
      player_id: player.id,
      group_letter,
      team_id,
      predicted_position: i + 1,
    }))
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

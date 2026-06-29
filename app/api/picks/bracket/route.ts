import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentPlayer, getConfig, bracketLocked } from "@/lib/auth";
import { r32SlotLocks } from "@/lib/bracket";

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

  // Slots whose individual lock time has already passed can't be changed —
  // preserve whatever's in the DB for them regardless of what the client sends.
  const now = Date.now();
  const lockedSlots = new Set(
    Object.entries(r32SlotLocks())
      .filter(([, t]) => now >= Date.parse(t))
      .map(([slot]) => slot)
  );
  let preserved: { slot: string; picked_team_id: number }[] = [];
  if (lockedSlots.size > 0) {
    const { data } = await supabase
      .from("bracket_picks")
      .select("slot,picked_team_id")
      .eq("player_id", player.id);
    preserved = (data ?? []).filter((r: any) => lockedSlots.has(r.slot));
  }

  await supabase.from("bracket_picks").delete().eq("player_id", player.id);
  const incoming = (Array.isArray(picks) ? picks : [])
    .filter(
      (p: any) =>
        p && typeof p.slot === "string" && Number.isInteger(p.picked_team_id) && !lockedSlots.has(p.slot)
    )
    .map((p: any) => ({ player_id: player.id, slot: p.slot, picked_team_id: p.picked_team_id }));
  const rows = [
    ...incoming,
    ...preserved.map((p) => ({ player_id: player.id, slot: p.slot, picked_team_id: p.picked_team_id })),
  ];
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

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentPlayer, getConfig, bracketLocked } from "@/lib/auth";
import { r32SlotLocks } from "@/lib/bracket";
import { bracketLockedForPlayer } from "@/lib/bracket-locked-players";
import type { Fixture } from "@/lib/types";

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
  // Reopened bracket: players who already submitted stay locked; only players
  // who hadn't made picks may create them now.
  if (bracketLockedForPlayer(player.id)) {
    return NextResponse.json(
      { error: "Your bracket is already locked in and can't be changed." },
      { status: 403 }
    );
  }

  const { picks, bronze_winner_team_id } = await req.json();
  const supabase = db();

  // Slots whose individual lock time has already passed can't be changed —
  // preserve whatever's in the DB for them regardless of what the client sends.
  // Lock times come from the live R32 fixtures (each slot locks at its kickoff).
  const { data: r32 } = await supabase.from("fixtures").select("*").eq("stage", "R32");
  const now = Date.now();
  const lockedSlots = new Set(
    Object.entries(r32SlotLocks((r32 ?? []) as Fixture[]))
      .filter(([, t]) => now >= Date.parse(t))
      .map(([slot]) => slot)
  );
  let preserved: { slot: string; picked_team_id: number }[] = [];
  if (lockedSlots.size > 0) {
    const { data: existing } = await supabase
      .from("bracket_picks")
      .select("slot,picked_team_id")
      .eq("player_id", player.id);
    const existingBySlot = new Map((existing ?? []).map((r: any) => [r.slot, r.picked_team_id]));
    // Keep a locked slot ONLY if the player genuinely picked it before it locked
    // (the client can't change locked picks). A slot they left blank is NOT
    // auto-filled with the actual winner anymore — a pick the player never made
    // must score 0, so we simply don't create one. The bracket tree still shows
    // the real winner in that spot for display; it just isn't the player's pick.
    for (const slot of lockedSlots) {
      const teamId = existingBySlot.get(slot);
      if (Number.isInteger(teamId)) preserved.push({ slot, picked_team_id: teamId as number });
    }
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

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentPlayer, getConfig, part12Locked } from "@/lib/auth";

export async function GET() {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { data } = await db()
    .from("part1_picks")
    .select("*")
    .eq("player_id", player.id)
    .maybeSingle();
  return NextResponse.json({ picks: data ?? null });
}

export async function POST(req: NextRequest) {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const cfg = await getConfig();
  if (part12Locked(cfg)) {
    return NextResponse.json({ error: "Predictions are locked." }, { status: 403 });
  }

  const body = await req.json();
  const row = {
    player_id: player.id,
    champion_team_id: body.champion_team_id ?? null,
    runnerup_team_id: body.runnerup_team_id ?? null,
    top_scorer_provider_id: body.top_scorer_provider_id ?? null,
    top_scorer_name: body.top_scorer_name ?? null,
    mvp_name: body.mvp_name ?? null,
    golden_glove_name: body.golden_glove_name ?? null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await db().from("part1_picks").upsert(row);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

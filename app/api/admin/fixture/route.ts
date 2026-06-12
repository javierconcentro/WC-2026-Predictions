import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

// Manual result override. Sets manual_override=true so sync won't clobber it.
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Admin only." }, { status: 401 });

  const body = await req.json();
  const { fixture_id, home_score, away_score, status, winner_team_id, clear_override } = body;
  if (!fixture_id) return NextResponse.json({ error: "fixture_id required." }, { status: 400 });

  if (clear_override) {
    const { error } = await db()
      .from("fixtures")
      .update({ manual_override: false })
      .eq("id", fixture_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { error } = await db()
    .from("fixtures")
    .update({
      home_score: home_score ?? null,
      away_score: away_score ?? null,
      status: status ?? "finished",
      winner_team_id: winner_team_id ?? null,
      manual_override: true,
    })
    .eq("id", fixture_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

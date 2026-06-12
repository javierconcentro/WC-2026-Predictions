import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

// Admin-entered end-of-tournament truths: MVP, golden glove, plus optional
// overrides for champion / runner-up / bronze / top scorer.
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Admin only." }, { status: 401 });

  const body = await req.json();
  const allowed = [
    "champion_team_id",
    "runnerup_team_id",
    "bronze_winner_team_id",
    "top_scorer_provider_id",
    "top_scorer_name",
    "mvp_name",
    "golden_glove_name",
  ];
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }
  const { error } = await db().from("actuals").update(update).eq("id", 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

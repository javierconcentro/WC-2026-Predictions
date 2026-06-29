import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { actualRoundMembers } from "@/lib/scoring";

export const dynamic = "force-dynamic";

// Lightweight read-only endpoint polled by BracketViewer to get fresh scoring
// data without a full page reload. Returns which teams have reached each
// knockout round plus the actual bronze winner (if known).
export async function GET() {
  const supabase = db();
  const [{ data: fixtures }, { data: actuals }] = await Promise.all([
    supabase.from("fixtures").select("*"),
    supabase
      .from("actuals")
      .select("bronze_winner_team_id")
      .eq("id", 1)
      .maybeSingle(),
  ]);

  const rounds = actualRoundMembers(fixtures ?? []);
  return NextResponse.json({
    R16: [...rounds.R16],
    QF: [...rounds.QF],
    SF: [...rounds.SF],
    F: [...rounds.F],
    bronzeWinner: (actuals as { bronze_winner_team_id?: number } | null)
      ?.bronze_winner_team_id ?? null,
  });
}

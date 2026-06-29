import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runLiveSync } from "@/lib/sync";
import { actualRoundMembers } from "@/lib/scoring";
import type { Fixture } from "@/lib/types";

export const dynamic = "force-dynamic";

// Same gap as /api/fixtures — both share the football-data.org free-tier quota
// enforced via fixtures.last_synced_at (shared state in the DB).
const SYNC_GAP_MS = 20_000;

export async function GET() {
  const supabase = db();

  const { data: raw } = await supabase.from("fixtures").select("*");
  let fixtures = (raw ?? []) as Fixture[];

  // Trigger a lightweight sync whenever there are active or recently-started
  // matches, so bracket scores update without anyone needing the Live tab open.
  const now = Date.now();
  const cutoff = now - 3 * 60 * 60 * 1000;
  const active = fixtures.filter((f) => {
    if (f.status === "finished") return false;
    if (f.status === "live") return true;
    const ko = new Date(f.kickoff_utc).getTime();
    return ko <= now && ko >= cutoff;
  });

  if (active.length > 0) {
    const freshest = active.reduce((max, f) => {
      const t = (f as any).last_synced_at
        ? new Date((f as any).last_synced_at).getTime()
        : 0;
      return t > max ? t : max;
    }, 0);
    if (now - freshest > SYNC_GAP_MS) {
      try {
        await runLiveSync();
        const { data: fresh } = await supabase.from("fixtures").select("*");
        fixtures = (fresh ?? []) as Fixture[];
      } catch {
        // Provider error — return whatever is cached in the DB.
      }
    }
  }

  const rounds = actualRoundMembers(fixtures);
  const { data: actualsRow } = await supabase
    .from("actuals")
    .select("bronze_winner_team_id")
    .eq("id", 1)
    .maybeSingle();

  return NextResponse.json({
    R16: [...rounds.R16],
    QF: [...rounds.QF],
    SF: [...rounds.SF],
    F: [...rounds.F],
    bronzeWinner:
      (actualsRow as { bronze_winner_team_id?: number } | null)
        ?.bronze_winner_team_id ?? null,
  });
}

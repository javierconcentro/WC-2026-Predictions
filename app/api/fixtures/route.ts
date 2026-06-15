import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runLiveSync } from "@/lib/sync";

// Don't hit the provider more than once per this window, no matter how many
// people have the live tab open — protects the free-tier rate limit. The
// throttle is enforced via fixtures.last_synced_at, which is shared state.
const LIVE_SYNC_MIN_GAP_MS = 30_000;

async function readFeed() {
  const supabase = db();
  const [fixtures, standings, teams] = await Promise.all([
    supabase.from("fixtures").select("*").order("kickoff_utc", { ascending: true }),
    supabase.from("standings").select("*"),
    supabase.from("teams").select("*"),
  ]);
  return {
    fixtures: (fixtures.data ?? []) as any[],
    standings: standings.data ?? [],
    teams: teams.data ?? [],
  };
}

// Feed for the live tab: fixtures + current standings + team lookup.
// While a match is in progress, this also opportunistically refreshes scores
// from the provider (throttled) so the page stays live without a cron.
export async function GET() {
  let feed = await readFeed();

  const now = Date.now();
  const threeHoursAgo = now - 3 * 60 * 60 * 1000;
  // Active = currently live, or should have kicked off recently but the DB
  // still shows it scheduled (i.e. we need a sync to catch the transition).
  const active = feed.fixtures.filter((f) => {
    if (f.status === "finished") return false;
    if (f.status === "live") return true;
    const ko = new Date(f.kickoff_utc).getTime();
    return ko <= now && ko >= threeHoursAgo;
  });

  if (active.length > 0) {
    const freshest = active.reduce((max, f) => {
      const t = f.last_synced_at ? new Date(f.last_synced_at).getTime() : 0;
      return t > max ? t : max;
    }, 0);
    if (now - freshest > LIVE_SYNC_MIN_GAP_MS) {
      try {
        await runLiveSync();
        feed = await readFeed();
      } catch {
        // Provider error / quota hit — serve the cached feed instead of failing.
      }
    }
  }

  return NextResponse.json(feed);
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Feed for the live tab: fixtures + current standings + team lookup.
export async function GET() {
  const supabase = db();
  const [fixtures, standings, teams] = await Promise.all([
    supabase.from("fixtures").select("*").order("kickoff_utc", { ascending: true }),
    supabase.from("standings").select("*"),
    supabase.from("teams").select("*"),
  ]);
  return NextResponse.json({
    fixtures: fixtures.data ?? [],
    standings: standings.data ?? [],
    teams: teams.data ?? [],
  });
}

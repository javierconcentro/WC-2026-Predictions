import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Names only, for the returning-player picker on the join screen.
// (Names are public on the leaderboard anyway.)
export async function GET() {
  const { data } = await db().from("players").select("name").order("name");
  return NextResponse.json({ names: (data ?? []).map((p) => p.name) });
}

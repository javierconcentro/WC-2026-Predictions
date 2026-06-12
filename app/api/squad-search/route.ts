import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Typeahead for player-type picks. Falls back to free text in the UI if
// squads were never loaded.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ players: [] });
  const { data } = await db()
    .from("squad_players")
    .select("provider_id, name, team_id, position")
    .ilike("name", `%${q}%`)
    .limit(10);
  return NextResponse.json({ players: data ?? [] });
}

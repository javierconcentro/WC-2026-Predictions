import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Enter your name (2+ characters)." }, { status: 400 });
  }

  const clean = name.trim();
  const supabase = db();
  const { data: existing } = await supabase
    .from("players")
    .select("*")
    .ilike("name", clean)
    .maybeSingle();

  let player = existing;
  if (!player) {
    const { data, error } = await supabase
      .from("players")
      .insert({ name: clean })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    player = data;
  }

  const res = NextResponse.json({ ok: true, player });
  res.cookies.set("player_id", player.id, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 60, // 60 days, covers the tournament
    path: "/",
  });
  return res;
}

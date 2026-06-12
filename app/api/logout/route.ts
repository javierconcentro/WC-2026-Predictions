import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("player_id");
  res.cookies.delete("admin");
  return res;
}

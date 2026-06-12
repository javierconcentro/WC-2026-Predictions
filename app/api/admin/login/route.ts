import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { passcode } = await req.json();
  if (!process.env.ADMIN_PASSCODE || passcode !== process.env.ADMIN_PASSCODE) {
    return NextResponse.json({ error: "Wrong admin passcode." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin", passcode, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 60,
    path: "/",
  });
  return res;
}

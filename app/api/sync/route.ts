import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { runSync } from "@/lib/sync";

// Called by the Supabase cron (with ?secret=) or from the admin panel.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const authorized =
    (process.env.CRON_SECRET && secret === process.env.CRON_SECRET) || (await isAdmin());
  if (!authorized) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const result = await runSync();
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Sync failed." }, { status: 500 });
  }
}

export const POST = GET;

import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { loadSquads } from "@/lib/sync";

// Squad load for the typeahead, batched 8 teams per call (rate limits +
// serverless timeout). Admin clicks until remaining = 0.
export const maxDuration = 60;

export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Admin only." }, { status: 401 });
  try {
    const result = await loadSquads();
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Squad load failed." }, { status: 500 });
  }
}

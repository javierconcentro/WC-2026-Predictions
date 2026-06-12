import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { loadSquads } from "@/lib/sync";

// One-shot squad load for the typeahead (48 API calls — admin button only).
export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Admin only." }, { status: 401 });
  try {
    const count = await loadSquads();
    return NextResponse.json({ ok: true, players: count });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Squad load failed." }, { status: 500 });
  }
}

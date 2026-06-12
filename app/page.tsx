import Link from "next/link";
import { dbConfigured } from "@/lib/db";
import { buildLeaderboard } from "@/lib/leaderboard";
import { getConfig, isAdmin, currentPlayer } from "@/lib/auth";
import AdminPanel from "@/components/AdminPanel";
import AdminUnlock from "@/components/AdminUnlock";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  if (!dbConfigured()) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
        <p className="font-semibold">Setup needed</p>
        <p>Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your environment, then reload.</p>
      </div>
    );
  }

  const [entries, cfg, admin, me] = await Promise.all([
    buildLeaderboard(),
    getConfig(),
    isAdmin(),
    currentPlayer(),
  ]);

  return (
    <div className="space-y-4">
      {entries.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          Nobody has joined yet. Head to{" "}
          <Link href="/picks" className="font-medium text-emerald-700 underline">
            My Picks
          </Link>{" "}
          to enter your name and start predicting.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2 w-10">#</th>
                <th className="px-3 py-2">Player</th>
                <th className="px-3 py-2 text-right">Part 1</th>
                <th className="px-3 py-2 text-right">Groups</th>
                <th className="px-3 py-2 text-right">Bracket</th>
                <th className="px-3 py-2 text-right font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr
                  key={e.player.id}
                  className={`border-b border-slate-100 last:border-0 ${
                    me?.id === e.player.id ? "bg-emerald-50/60" : ""
                  }`}
                >
                  <td className="px-3 py-2.5 font-semibold text-slate-400">{e.rank}</td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/player/${e.player.id}`}
                      className="font-medium text-emerald-700 hover:underline"
                    >
                      {e.player.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-500">{e.score.part1}</td>
                  <td className="px-3 py-2.5 text-right text-slate-500">{e.score.part2}</td>
                  <td className="px-3 py-2.5 text-right text-slate-500">{e.score.part3}</td>
                  <td className="px-3 py-2.5 text-right font-bold">{e.score.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-center text-xs text-slate-400">
        Tap a name to see their full predictions. Ties break on champion, then runner-up.
      </p>

      <p className="rounded-lg bg-emerald-50 px-4 py-2 text-center text-sm font-medium text-emerald-800">
        {cfg.payout_text}
      </p>

      {admin ? <AdminPanel /> : <AdminUnlock />}
    </div>
  );
}

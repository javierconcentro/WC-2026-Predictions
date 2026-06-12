import Link from "next/link";
import { dbConfigured } from "@/lib/db";
import { buildLeaderboard } from "@/lib/leaderboard";
import { getConfig, isAdmin, currentPlayer } from "@/lib/auth";
import AdminPanel from "@/components/AdminPanel";
import AdminUnlock from "@/components/AdminUnlock";
import JoinGate from "@/components/JoinGate";

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

  const me = await currentPlayer();
  if (!me) return <JoinGate />;

  const [entries, cfg, admin] = await Promise.all([
    buildLeaderboard(),
    getConfig(),
    isAdmin(),
  ]);

  return (
    <div className="space-y-4">
      {entries.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          Nobody has joined yet. Head to{" "}
          <Link href="/picks" className="font-semibold text-[#101828] underline">
            My Picks
          </Link>{" "}
          to enter your name and start predicting.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-[#101828] text-left text-xs uppercase tracking-wide text-slate-300">
                <th className="px-3 py-2 w-10">#</th>
                <th className="px-3 py-2">Player</th>
                <th className="px-3 py-2 text-right font-bold">Total</th>
                <th className="px-3 py-2 text-right">Awards</th>
                <th className="px-3 py-2 text-right">Group Stage</th>
                <th className="px-3 py-2 text-right">Bracket</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr
                  key={e.player.id}
                  className={`border-b border-slate-100 last:border-0 ${
                    me?.id === e.player.id ? "bg-[#e7eaf8]/70" : ""
                  }`}
                >
                  <td className="px-3 py-2.5 font-semibold text-slate-400">{e.rank}</td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/player/${e.player.id}`}
                      className="font-semibold text-[#101828] underline-offset-2 hover:underline"
                    >
                      {e.player.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-lg">{e.score.total}</td>
                  <td className="px-3 py-2.5 text-right text-slate-500">{e.score.part1}</td>
                  <td className="px-3 py-2.5 text-right text-slate-500">{e.score.part2}</td>
                  <td className="px-3 py-2.5 text-right text-slate-500">{e.score.part3}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-center text-xs text-slate-400">
        Tap a name to see their full predictions. Ties break on champion, then runner-up.
      </p>

      <p className="rounded-xl bg-[#101828] px-4 py-2.5 text-center text-sm font-semibold text-white">
        {cfg.payout_text}
      </p>

      {admin ? <AdminPanel /> : <AdminUnlock />}
    </div>
  );
}

import Link from "next/link";
import { db } from "@/lib/db";
import { currentPlayer, getConfig, part12Locked } from "@/lib/auth";
import { GROUPS } from "@/lib/types";
import type { GroupRankingRow, Part1Picks, Team } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = db();
  const [{ data: player }, cfg, me] = await Promise.all([
    supabase.from("players").select("*").eq("id", id).maybeSingle(),
    getConfig(),
    currentPlayer(),
  ]);

  if (!player) {
    return <p className="text-sm text-slate-500">Player not found.</p>;
  }

  // Other people's picks stay hidden until the lock so nobody copies.
  const isMe = me?.id === player.id;
  if (!isMe && !part12Locked(cfg)) {
    return (
      <div className="space-y-3">
        <Link href="/" className="text-sm text-emerald-700 hover:underline">← Leaderboard</Link>
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          <p className="font-semibold text-slate-700">{player.name}</p>
          <p className="mt-2">Predictions are hidden until picks lock, so nobody can copy. Check back after the deadline!</p>
        </div>
      </div>
    );
  }

  const [{ data: part1 }, { data: rankings }, { data: teams }, { data: bracket }, { data: bronze }] =
    await Promise.all([
      supabase.from("part1_picks").select("*").eq("player_id", id).maybeSingle(),
      supabase.from("group_rankings").select("*").eq("player_id", id),
      supabase.from("teams").select("*"),
      supabase.from("bracket_picks").select("*").eq("player_id", id),
      supabase.from("bronze_picks").select("*").eq("player_id", id).maybeSingle(),
    ]);

  const teamName = (tid: number | null | undefined) =>
    (teams as Team[] | null)?.find((t) => t.id === tid)?.name ?? "—";
  const p1 = part1 as Part1Picks | null;
  const ranks = (rankings ?? []) as GroupRankingRow[];

  const part1Rows = [
    { label: "Champion (25)", value: teamName(p1?.champion_team_id) },
    { label: "Runner-up (15)", value: teamName(p1?.runnerup_team_id) },
    { label: "Top scorer (20)", value: p1?.top_scorer_name ?? "—" },
    { label: "MVP (10)", value: p1?.mvp_name ?? "—" },
    { label: "Golden glove (10)", value: p1?.golden_glove_name ?? "—" },
  ];

  return (
    <div className="space-y-5">
      <Link href="/" className="text-sm text-emerald-700 hover:underline">← Leaderboard</Link>
      <h2 className="text-xl font-bold">{player.name}&apos;s predictions</h2>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Outright picks
        </h3>
        <dl className="divide-y divide-slate-100 text-sm">
          {part1Rows.map((row) => (
            <div key={row.label} className="flex justify-between py-1.5">
              <dt className="text-slate-500">{row.label}</dt>
              <dd className="font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Group rankings
        </h3>
        {ranks.length === 0 ? (
          <p className="text-sm text-slate-400">No group rankings submitted.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {GROUPS.map((g) => {
              const groupRanks = ranks
                .filter((r) => r.group_letter === g)
                .sort((a, b) => a.predicted_position - b.predicted_position);
              if (groupRanks.length === 0) return null;
              return (
                <div key={g} className="rounded border border-slate-100 p-2">
                  <p className="mb-1 text-xs font-bold text-slate-400">Group {g}</p>
                  <ol className="space-y-0.5 text-xs">
                    {groupRanks.map((r) => (
                      <li key={r.predicted_position}>
                        <span className="text-slate-400">{r.predicted_position}.</span>{" "}
                        {teamName(r.team_id)}
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Bracket
        </h3>
        {(bracket ?? []).length === 0 ? (
          <p className="text-sm text-slate-400">Bracket opens when the group stage finishes.</p>
        ) : (
          <div className="space-y-1 text-sm">
            {(bracket ?? []).map((b: any) => (
              <p key={b.slot}>
                <span className="text-slate-400">{b.slot}:</span> {teamName(b.picked_team_id)}
              </p>
            ))}
            {bronze && (
              <p>
                <span className="text-slate-400">Bronze:</span>{" "}
                {teamName((bronze as any).bronze_winner_team_id)}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

import Link from "next/link";
import { db } from "@/lib/db";
import { currentPlayer, getConfig, part12Locked, bracketLocked } from "@/lib/auth";
import { GROUPS, POINTS } from "@/lib/types";
import type { Actuals, Fixture, GroupRankingRow, Part1Picks, StandingRow, Team } from "@/lib/types";
import { r32FromFixtures, r32ResolvedWinners } from "@/lib/bracket";
import { actualRoundMembers, tournamentFinished } from "@/lib/scoring";
import { autofilledSlotsFor } from "@/lib/autofilled-picks";
import BracketViewer from "@/components/BracketViewer";

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
        <Link href="/" className="text-sm font-semibold text-[#101828] hover:underline">← Leaderboard</Link>
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          <p className="font-semibold text-slate-700">{player.name}</p>
          <p className="mt-2">Predictions are hidden until picks lock, so nobody can copy. Check back after the deadline!</p>
        </div>
      </div>
    );
  }

  const [
    { data: part1 },
    { data: rankings },
    { data: teams },
    { data: bracket },
    { data: bronze },
    { data: actualsRow },
    { data: standingsRows },
    { data: fixturesData },
  ] = await Promise.all([
    supabase.from("part1_picks").select("*").eq("player_id", id).maybeSingle(),
    supabase.from("group_rankings").select("*").eq("player_id", id),
    supabase.from("teams").select("*"),
    supabase.from("bracket_picks").select("*").eq("player_id", id),
    supabase.from("bronze_picks").select("*").eq("player_id", id).maybeSingle(),
    supabase.from("actuals").select("*").eq("id", 1).maybeSingle(),
    supabase.from("standings").select("*"),
    supabase.from("fixtures").select("*"),
  ]);

  const teamName = (tid: number | null | undefined) =>
    (teams as Team[] | null)?.find((t) => t.id === tid)?.name ?? "—";
  const p1 = part1 as Part1Picks | null;
  const ranks = (rankings ?? []) as GroupRankingRow[];

  // Per-item scoring mirrors lib/scoring.ts. Part 2 counts once locked; awards
  // (Part 1) only count once the tournament has finished.
  const locked = part12Locked(cfg);
  const awardsCount = locked && tournamentFinished((fixturesData ?? []) as Fixture[]);
  const actuals = (actualsRow ?? {}) as Actuals;
  const standings = (standingsRows ?? []) as StandingRow[];
  const nameMatch = (a?: string | null, b?: string | null) =>
    !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

  const scorerHit =
    awardsCount &&
    ((!!actuals.top_scorer_provider_id &&
      p1?.top_scorer_provider_id === actuals.top_scorer_provider_id) ||
      nameMatch(p1?.top_scorer_name, actuals.top_scorer_name));

  const awardRows = [
    {
      label: "Champion",
      value: teamName(p1?.champion_team_id),
      got: awardsCount && !!actuals.champion_team_id && p1?.champion_team_id === actuals.champion_team_id ? POINTS.part1.champion : 0,
      max: POINTS.part1.champion,
    },
    {
      label: "Runner-up",
      value: teamName(p1?.runnerup_team_id),
      got: awardsCount && !!actuals.runnerup_team_id && p1?.runnerup_team_id === actuals.runnerup_team_id ? POINTS.part1.runnerup : 0,
      max: POINTS.part1.runnerup,
    },
    {
      label: "Top scorer",
      value: p1?.top_scorer_name ?? "—",
      got: scorerHit ? POINTS.part1.topScorer : 0,
      max: POINTS.part1.topScorer,
    },
    {
      label: "Best player",
      value: p1?.mvp_name ?? "—",
      got: awardsCount && nameMatch(p1?.mvp_name, actuals.mvp_name) ? POINTS.part1.mvp : 0,
      max: POINTS.part1.mvp,
    },
    {
      label: "Golden glove",
      value: p1?.golden_glove_name ?? "—",
      got: awardsCount && nameMatch(p1?.golden_glove_name, actuals.golden_glove_name) ? POINTS.part1.goldenGlove : 0,
      max: POINTS.part1.goldenGlove,
    },
  ];

  // group-position -> team currently there, for the green "correct" check
  const actualAt = new Map<string, number>();
  for (const s of standings) actualAt.set(`${s.group_letter}-${s.position}`, s.team_id);
  const actualPosOf = new Map<number, number>(); // team_id -> its current standing position
  for (const s of standings) actualPosOf.set(s.team_id, s.position);
  const posPoints = [0, POINTS.part2.pos1, POINTS.part2.pos2, POINTS.part2.pos3, POINTS.part2.pos4];

  // Build bracket viewer data (only consumed when the bracket section renders).
  const { matchups } = r32FromFixtures(fixturesData ?? [], teams as Team[] ?? []);
  const resolvedWinners = r32ResolvedWinners(fixturesData ?? []);
  const bracketPicksMap: Record<string, number> = {};
  for (const b of (bracket ?? []) as { slot: string; picked_team_id: number }[]) {
    bracketPicksMap[b.slot] = b.picked_team_id;
  }
  // Pre-fill blank finished R32 slots with the actual winner so the bracket
  // tree stays connected visually — but track them: the player never made these
  // picks, so they must be shown greyed and score 0 (same as the leaderboard,
  // which has no pick there at all).
  const prefilledSlots: string[] = [];
  for (const [slot, winnerId] of Object.entries(resolvedWinners)) {
    if (bracketPicksMap[slot] == null) {
      bracketPicksMap[slot] = winnerId;
      prefilledSlots.push(slot);
    }
  }
  const bronzeTeamId = (bronze as { bronze_winner_team_id?: number } | null)?.bronze_winner_team_id ?? null;
  const roundMembers = actualRoundMembers(fixturesData ?? []);
  const actualRounds = {
    R16: [...roundMembers.R16],
    QF: [...roundMembers.QF],
    SF: [...roundMembers.SF],
    F: [...roundMembers.F],
  };

  return (
    <div className="space-y-5">
      <Link href="/" className="text-sm font-semibold text-[#101828] hover:underline">← Leaderboard</Link>
      <h2 className="text-xl font-bold">{player.name}&apos;s predictions</h2>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Awards
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {awardRows.slice(0, 2).map((row) => (
              <div key={row.label} className="rounded border border-slate-100 p-2">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">{row.label}</p>
                <p className="mt-0.5 truncate text-sm font-medium">{row.value}</p>
                <div className="mt-1 flex items-baseline justify-end gap-0.5 tabular-nums">
                  <span className={row.got > 0 ? "text-xs font-bold text-emerald-600" : "text-xs font-semibold text-slate-400"}>
                    {row.got}
                  </span>
                  <span className="text-[10px] text-slate-400">/{row.max}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {awardRows.slice(2).map((row) => (
              <div key={row.label} className="rounded border border-slate-100 p-2">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">{row.label}</p>
                <p className="mt-0.5 truncate text-sm font-medium">{row.value}</p>
                <div className="mt-1 flex items-baseline justify-end gap-0.5 tabular-nums">
                  <span className={row.got > 0 ? "text-xs font-bold text-emerald-600" : "text-xs font-semibold text-slate-400"}>
                    {row.got}
                  </span>
                  <span className="text-[10px] text-slate-400">/{row.max}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Bracket
        </h3>
        {!isMe && !bracketLocked(cfg) ? (
          <p className="text-sm text-slate-400">
            Hidden until the bracket locks so nobody can copy.
          </p>
        ) : (bracket ?? []).length === 0 ? (
          <p className="text-sm text-slate-400">No bracket picks submitted.</p>
        ) : (
          <BracketViewer
            matchups={matchups}
            teams={(teams as Team[]) ?? []}
            picks={bracketPicksMap}
            bronze={bronzeTeamId}
            actual={actualRounds}
            bronzeWinnerActual={(actualsRow as Actuals | null)?.bronze_winner_team_id ?? null}
            excludedSlots={[...autofilledSlotsFor(id), ...prefilledSlots]}
          />
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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
              const rows = groupRanks.map((r) => {
                const correct = locked && actualAt.get(`${g}-${r.predicted_position}`) === r.team_id;
                const actualPos = actualPosOf.get(r.team_id);
                return {
                  r,
                  correct,
                  actualPos: locked && !correct && actualPos != null ? actualPos : null,
                  pts: correct ? posPoints[r.predicted_position] ?? 0 : 0,
                };
              });
              const groupPts = rows.reduce((a, x) => a + x.pts, 0);
              return (
                <div key={g} className="rounded border border-slate-100 p-2">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-700">Group {g}</p>
                    <span className="text-xs font-semibold text-slate-600">{groupPts} pts</span>
                  </div>
                  <ol className="space-y-0.5 text-xs">
                    {rows.map(({ r, correct, actualPos }) => (
                      <li key={r.predicted_position} className="flex items-center gap-1">
                        <span className="font-bold text-slate-500">{r.predicted_position}.</span>
                        <span className={correct ? "font-semibold text-emerald-600" : "font-medium"}>
                          {teamName(r.team_id)}
                        </span>
                        {actualPos != null && (
                          <span className="text-[10px] font-normal text-red-400">({actualPos})</span>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

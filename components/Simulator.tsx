"use client";

import { useMemo, useState } from "react";
import type {
  Actuals,
  BracketPick,
  Fixture,
  GroupRankingRow,
  Part1Picks,
  StandingRow,
  Team,
} from "@/lib/types";
import { scorePlayer, compareForLeaderboard, type ScoreBreakdown } from "@/lib/scoring";
import { filterAutofilledPicks } from "@/lib/autofilled-picks";
import { knockoutFixtureSlots } from "@/lib/bracket";
import { flagUrl } from "@/lib/flags";
import PlayerPicker from "./PlayerPicker";
import {
  MVP_FEATURED,
  MVP_REST,
  SCORER_FEATURED,
  SCORER_REST,
  GK_FEATURED,
  GK_REST,
} from "@/lib/playerLists";

interface PlayerRow {
  id: string;
  name: string;
}
interface BronzePick {
  player_id: string;
  bronze_winner_team_id: number | null;
}

interface Props {
  players: PlayerRow[];
  part1: Part1Picks[];
  rankings: GroupRankingRow[];
  brackets: BracketPick[];
  bronzes: BronzePick[];
  fixtures: Fixture[];
  standings: StandingRow[];
  teams: Team[];
  actuals: Actuals;
  part12Locked: boolean;
  meId: string | null;
}

interface Ranked {
  player: PlayerRow;
  score: ScoreBreakdown;
  rank: number;
}

export default function Simulator({
  players,
  part1,
  rankings,
  brackets,
  bronzes,
  fixtures,
  standings,
  teams,
  actuals,
  part12Locked,
  meId,
}: Props) {
  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const nameOf = (id: number | null | undefined) => (id ? teamById.get(id)?.name ?? "TBD" : "TBD");

  // Derive the remaining knockout state from the fixtures (not hard-coded): one
  // semifinal is decided (its winner is a fixed finalist, its loser a fixed
  // third-place team); the other semifinal's two teams are the open toggle.
  const sf = fixtures.filter((f) => f.stage === "SF");
  const decidedSF = sf.find((f) => f.status === "finished" && f.winner_team_id);
  const openSF = sf.find((f) => f.status !== "finished" && f.home_team_id && f.away_team_id);
  const finalFx = fixtures.find((f) => f.stage === "F");
  const bronzeFx = fixtures.find((f) => f.stage === "bronze");
  const applicable = Boolean(decidedSF && openSF && finalFx && bronzeFx);

  const fixedFinalist = (decidedSF?.winner_team_id ?? 0) as number; // e.g. Spain
  const fixedThird = (decidedSF
    ? decidedSF.home_team_id === fixedFinalist
      ? decidedSF.away_team_id
      : decidedSF.home_team_id
    : 0) as number; // e.g. France
  const eaA = (openSF?.home_team_id ?? 0) as number;
  const eaB = (openSF?.away_team_id ?? 0) as number;

  const rankAll = (a: Actuals, fx: Fixture[], locked: boolean): Ranked[] => {
    const rows = players.map((player) => {
      const p1 = part1.find((x) => x.player_id === player.id) ?? null;
      const rks = rankings.filter((x) => x.player_id === player.id);
      const bkt = filterAutofilledPicks(
        player.id,
        brackets.filter((b) => b.player_id === player.id)
      );
      const brz = bronzes.find((b) => b.player_id === player.id)?.bronze_winner_team_id ?? null;
      return { player, score: scorePlayer(p1, rks, bkt, brz, fx, standings, a, locked), rank: 0 };
    });
    rows.sort((x, y) => {
      const c = compareForLeaderboard(x.score, y.score);
      return c !== 0 ? c : x.player.name.localeCompare(y.player.name);
    });
    rows.forEach((r, i) => {
      r.rank =
        i > 0 && compareForLeaderboard(rows[i - 1].score, r.score) === 0 ? rows[i - 1].rank : i + 1;
    });
    return rows;
  };

  // Live standings (real results so far) — the baseline every scenario moves from.
  const live = useMemo(() => rankAll(actuals, fixtures, part12Locked), []); // eslint-disable-line react-hooks/exhaustive-deps
  const liveByPlayer = useMemo(() => {
    const m = new Map<string, Ranked>();
    for (const r of live) m.set(r.player.id, r);
    return m;
  }, [live]);

  // --- Scenario inputs ---
  const [eaWinner, setEaWinner] = useState<number>(eaA);
  const [finalPick, setFinalPick] = useState<number>(fixedFinalist);
  const [thirdPick, setThirdPick] = useState<number>(fixedThird);
  const [topScorer, setTopScorer] = useState<string>(actuals.top_scorer_name ?? "");
  const [mvp, setMvp] = useState<string>(actuals.mvp_name ?? "");
  const [glove, setGlove] = useState<string>(actuals.golden_glove_name ?? "");

  // Rows expanded in the projected standings — independent, multiple at once.
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const toggleOpen = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // The bracket slot of the open semifinal, so we can read each player's pick
  // for it (their predicted England–Argentina winner).
  const slotByFixture = useMemo(() => knockoutFixtureSlots(fixtures), [fixtures]);
  const openSfSlot = openSF ? slotByFixture.get(openSF.id) ?? null : null;

  const eaLoser = eaWinner === eaA ? eaB : eaA;
  const finalists = [eaWinner, fixedFinalist];
  const thirdTeams = [eaLoser, fixedThird];
  // Keep the final/third picks valid as the semifinal toggle flips.
  const finalWinner = finalists.includes(finalPick) ? finalPick : fixedFinalist;
  const thirdWinner = thirdTeams.includes(thirdPick) ? thirdPick : fixedThird;
  const runnerUp = finalists.find((t) => t !== finalWinner) ?? null;

  // The only picks the simulator can move: the three remaining matches and the
  // three awards. Each is scored against the currently-set scenario, so these
  // recolour live as the left-panel toggles change.
  const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
  const nameEq = (a: string | null | undefined, b: string | null | undefined) =>
    !!norm(a) && norm(a) === norm(b);

  type LivePick =
    | { key: string; label: string; pts: number; kind: "team"; teamId: number | null; matches: boolean; cmp: string }
    | { key: string; label: string; pts: number; kind: "text"; text: string; matches: boolean; cmp: string };

  const livePicksFor = (playerId: string): LivePick[] => {
    const p1 = part1.find((x) => x.player_id === playerId) ?? null;
    const sfPick = brackets.find((b) => b.player_id === playerId && b.slot === openSfSlot)?.picked_team_id ?? null;
    const brz = bronzes.find((b) => b.player_id === playerId)?.bronze_winner_team_id ?? null;
    const champ = p1?.champion_team_id ?? null;
    const runner = p1?.runnerup_team_id ?? null;
    const team = (
      key: string,
      label: string,
      pts: number,
      teamId: number | null,
      matches: boolean
    ): LivePick => ({ key, label, pts, kind: "team", teamId, matches, cmp: teamId == null ? "∅" : String(teamId) });
    const text = (
      key: string,
      label: string,
      pts: number,
      value: string | null | undefined,
      matches: boolean
    ): LivePick => ({ key, label, pts, kind: "text", text: value ?? "", matches, cmp: norm(value) || "∅" });
    return [
      team("sf", "Semifinal", 12, sfPick, sfPick != null && sfPick === eaWinner),
      team("champ", "Champion", 25, champ, champ != null && champ === finalWinner),
      team("runner", "Runner-up", 15, runner, runner != null && runner === runnerUp),
      team("bronze", "Bronze", 10, brz, brz != null && brz === thirdWinner),
      text("scorer", "Top scorer", 20, p1?.top_scorer_name, nameEq(p1?.top_scorer_name, topScorer)),
      text("mvp", "Best player", 10, p1?.mvp_name, nameEq(p1?.mvp_name, mvp)),
      text("glove", "Golden glove", 10, p1?.golden_glove_name, nameEq(p1?.golden_glove_name, glove)),
    ];
  };

  // In compare mode (2+ rows open) mark the pick categories where the open
  // players disagree — that's where the standings gap is decided.
  const openList = [...openIds].filter((id) => players.some((p) => p.id === id));
  const diffKeys = new Set<string>();
  if (openList.length >= 2) {
    const perPlayer = openList.map((id) => livePicksFor(id));
    for (const lp of perPlayer[0]) {
      const vals = new Set(perPlayer.map((lps) => lps.find((x) => x.key === lp.key)?.cmp ?? "∅"));
      if (vals.size > 1) diffKeys.add(lp.key);
    }
  }
  const comparing = openList.length >= 2;

  const projected = useMemo(() => {
    if (!applicable) return live;
    const hypoActuals: Actuals = {
      ...actuals,
      champion_team_id: finalWinner,
      runnerup_team_id: runnerUp,
      bronze_winner_team_id: thirdWinner,
      top_scorer_name: topScorer || null,
      top_scorer_provider_id:
        topScorer && topScorer === actuals.top_scorer_name ? actuals.top_scorer_provider_id : null,
      mvp_name: mvp || null,
      golden_glove_name: glove || null,
    };
    const hypoFixtures = fixtures.map((f) => {
      if (f.id === openSF!.id) return { ...f, status: "finished" as const, winner_team_id: eaWinner };
      if (f.id === finalFx!.id)
        return { ...f, status: "finished" as const, winner_team_id: finalWinner };
      if (f.id === bronzeFx!.id)
        return { ...f, status: "finished" as const, winner_team_id: thirdWinner };
      return f;
    });
    return rankAll(hypoActuals, hypoFixtures, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eaWinner, finalWinner, thirdWinner, runnerUp, topScorer, mvp, glove]);

  const Flag = ({ id }: { id: number | null }) => {
    if (!id) return null;
    const t = teamById.get(id);
    const url = flagUrl(t?.code, t?.name);
    return url ? <img src={url} alt="" className="h-3.5 w-auto shrink-0 rounded-[2px]" /> : null;
  };

  const Toggle = ({
    options,
    value,
    onChange,
  }: {
    options: number[];
    value: number;
    onChange: (id: number) => void;
  }) => (
    <div className="grid grid-cols-2 gap-2">
      {options.map((id) => {
        const active = id === value;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
              active
                ? "border-[#101828] bg-[#101828] text-white"
                : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
            }`}
          >
            <Flag id={id} />
            <span className="truncate">{nameOf(id)}</span>
          </button>
        );
      })}
    </div>
  );

  const Derived = ({ label, id }: { label: string; id: number | null }) => (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
      <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
      <span className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
        <Flag id={id} />
        {nameOf(id)}
      </span>
    </div>
  );

  const PickLine = ({ lp, diff }: { lp: LivePick; diff: boolean }) => (
    <div
      className={`flex items-center justify-between gap-2 rounded px-2 py-1 ${
        diff ? "border-l-2 border-amber-400 bg-amber-50" : ""
      }`}
    >
      <span className="shrink-0 text-xs text-slate-500">{lp.label}</span>
      <span className="flex min-w-0 items-center justify-end gap-1.5">
        {lp.kind === "team" ? (
          lp.teamId ? (
            <>
              <Flag id={lp.teamId} />
              <span
                className={`truncate text-xs font-medium ${
                  lp.matches ? "text-emerald-700" : "text-slate-500"
                }`}
              >
                {nameOf(lp.teamId)}
              </span>
            </>
          ) : (
            <span className="text-xs text-slate-300">—</span>
          )
        ) : (
          <span
            className={`truncate text-xs font-medium ${
              lp.matches ? "text-emerald-700" : "text-slate-500"
            }`}
          >
            {lp.text || "—"}
          </span>
        )}
        <span
          className={`w-8 shrink-0 text-right text-[10px] font-semibold tabular-nums ${
            lp.matches ? "text-emerald-600" : "text-slate-300"
          }`}
        >
          {lp.matches ? `+${lp.pts}` : "0"}
        </span>
      </span>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-white">What-if Simulator</h2>
        <p className="text-xs text-slate-200">
          Still think you can win? Play out the last games and awards, and see exactly what has to
          happen for you to climb, and who to root against.
        </p>
      </div>

      {!applicable ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          The simulator becomes available once one semifinal is decided and the other is set.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {/* LEFT — inputs */}
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <p className="text-sm font-semibold text-slate-700">Remaining matches</p>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-slate-500">
                  Semifinal · {nameOf(eaA)} vs {nameOf(eaB)}
                </p>
                <Toggle options={[eaA, eaB]} value={eaWinner} onChange={setEaWinner} />
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-slate-500">
                  Final · {nameOf(finalists[0])} vs {nameOf(finalists[1])}
                </p>
                <Toggle options={finalists} value={finalWinner} onChange={setFinalPick} />
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-slate-500">
                  3rd place · {nameOf(thirdTeams[0])} vs {nameOf(thirdTeams[1])}
                </p>
                <Toggle options={thirdTeams} value={thirdWinner} onChange={setThirdPick} />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
              <p className="text-sm font-semibold text-slate-700">
                Derived <span className="font-normal text-slate-400">(from the results above)</span>
              </p>
              <Derived label="Champion" id={finalWinner} />
              <Derived label="Runner-up" id={runnerUp} />
              <Derived label="Bronze" id={thirdWinner} />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <p className="text-sm font-semibold text-slate-700">Awards</p>
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">⚽ Top scorer</p>
                <PlayerPicker
                  label=""
                  value={topScorer}
                  disabled={false}
                  featured={SCORER_FEATURED}
                  rest={SCORER_REST}
                  onChange={setTopScorer}
                />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">🌟 Best player</p>
                <PlayerPicker
                  label=""
                  value={mvp}
                  disabled={false}
                  featured={MVP_FEATURED}
                  rest={MVP_REST}
                  onChange={setMvp}
                />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">🧤 Golden glove</p>
                <PlayerPicker
                  label=""
                  value={glove}
                  disabled={false}
                  featured={GK_FEATURED}
                  rest={GK_REST}
                  onChange={setGlove}
                />
              </div>
            </div>
          </div>

          {/* RIGHT — projected leaderboard */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-[#101828] px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Projected standings
              </p>
              {comparing ? (
                <span className="text-[10px] font-medium text-amber-300">
                  Comparing {openList.length} · amber = differs
                </span>
              ) : (
                <span className="text-[10px] font-medium text-slate-400">Tap a row for picks</span>
              )}
            </div>
            <ul>
              {projected.map((r) => {
                const liveRow = liveByPlayer.get(r.player.id);
                const rankDelta = liveRow ? liveRow.rank - r.rank : 0; // + = moved up
                const ptsDelta = liveRow ? r.score.total - liveRow.score.total : 0;
                const open = openIds.has(r.player.id);
                const picks = open ? livePicksFor(r.player.id) : [];
                const matchPicks = picks.filter((p) =>
                  ["sf", "champ", "runner", "bronze"].includes(p.key)
                );
                const awardPicks = picks.filter((p) => ["scorer", "mvp", "glove"].includes(p.key));
                return (
                  <li key={r.player.id} className="border-b border-slate-100 last:border-0">
                    <button
                      onClick={() => toggleOpen(r.player.id)}
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-slate-50 ${
                        meId === r.player.id ? "bg-[#e7eaf8]/70" : ""
                      }`}
                    >
                      <span className="w-5 shrink-0 text-sm font-semibold text-slate-400">
                        {r.rank}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#101828]">
                        {r.player.name}
                      </span>
                      <span className="shrink-0 text-right">
                        {rankDelta > 0 ? (
                          <span className="text-xs font-semibold text-emerald-600">
                            ▲{rankDelta}
                          </span>
                        ) : rankDelta < 0 ? (
                          <span className="text-xs font-semibold text-rose-500">▼{-rankDelta}</span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </span>
                      <span className="w-12 shrink-0 text-right">
                        <span className="text-base font-bold tabular-nums">{r.score.total}</span>
                        {ptsDelta !== 0 && (
                          <span className="block text-[10px] font-medium text-slate-400">
                            {ptsDelta > 0 ? `+${ptsDelta}` : ptsDelta}
                          </span>
                        )}
                      </span>
                      <svg
                        className={`h-4 w-4 shrink-0 text-slate-300 transition-transform ${
                          open ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {open && (
                      <div className="border-t border-slate-100 bg-slate-50/70 px-3 py-2.5">
                        <div className="mb-2 flex items-baseline justify-between">
                          <span className="text-xs font-semibold text-slate-700">
                            {r.rank}. {r.player.name}
                          </span>
                          <span className="text-xs text-slate-500">
                            {r.score.total} pts projected
                          </span>
                        </div>

                        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Remaining matches
                        </p>
                        <div className="space-y-0.5">
                          {matchPicks.map((lp) => (
                            <PickLine key={lp.key} lp={lp} diff={diffKeys.has(lp.key)} />
                          ))}
                        </div>

                        <p className="mb-0.5 mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Awards
                        </p>
                        <div className="space-y-0.5">
                          {awardPicks.map((lp) => (
                            <PickLine key={lp.key} lp={lp} diff={diffKeys.has(lp.key)} />
                          ))}
                        </div>

                        <p className="mt-2 text-[10px] text-slate-400">
                          Group + earlier-round picks are already settled and don&apos;t change.
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-slate-200">
        Rank movement (▲/▼) and point change are versus the current live standings. Only the champion,
        runner-up, bronze, reached-final bracket points and the three awards change with your inputs;
        everything else stays locked to actual results.
      </p>
    </div>
  );
}

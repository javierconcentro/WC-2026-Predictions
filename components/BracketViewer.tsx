"use client";

import { useEffect, useRef, useState } from "react";
import type { Team } from "@/lib/types";
import type { Matchup } from "@/lib/bracket";
import { flagUrl } from "@/lib/flags";

const PREV: Record<string, string> = { R16: "R32", QF: "R16", SF: "QF" };
const NEXT: Record<string, string> = { R32: "R16", R16: "QF", QF: "SF" };
const LABEL: Record<string, string> = { R32: "R32", R16: "R16", QF: "QF", SF: "Semis" };
const SHORT_NAME: Record<string, string> = {
  "Cape Verde Islands": "Cape Verde",
  "Bosnia-Herzegovina": "Bosnia",
};
// Points per scoring round (bracket Part 3).
const ROUND_PTS: Record<string, number> = { R32: 3, R16: 5, QF: 8, SF: 12 };
// Which actual round a pick must reach to score.
const ROUND_REACH: Record<string, "R16" | "QF" | "SF" | "F"> = {
  R32: "R16",
  R16: "QF",
  QF: "SF",
  SF: "F",
};

const GOLD = "bg-[#fbe7a2] font-semibold text-[#7a5c00]";
const SILVER = "bg-[#e1e4e9] font-semibold text-[#5b6470]";
const BRONZE_CLS = "bg-[#ecc9a3] font-semibold text-[#80501f]";
const GREEN = "bg-emerald-50 font-semibold text-emerald-700";
const BOX_W = "130px";

// Serialisable form of actualRoundMembers (Sets can't cross server→client).
export interface ActualRounds {
  R16: number[];
  QF: number[];
  SF: number[];
  F: number[];
}

interface Props {
  matchups: Matchup[];
  teams: Team[];
  picks: Record<string, number>; // slot → picked_team_id
  bronze: number | null;
  actual: ActualRounds;
  bronzeWinnerActual: number | null;
  // Slots that were auto-filled (not entered by the player) — shown in grey, no pts.
  excludedSlots?: string[];
}

type BoxMode = "normal" | "final" | "bronze";

export default function BracketViewer({
  matchups,
  teams,
  picks,
  bronze,
  actual,
  bronzeWinnerActual,
  excludedSlots = [],
}: Props) {
  const teamMeta = new Map(teams.map((t) => [t.id, t]));
  const nameOf = (id: number | null | undefined) => {
    if (!id) return "TBD";
    const full = teamMeta.get(id)?.name ?? "TBD";
    return SHORT_NAME[full] ?? full;
  };

  // Live state — seeded from server props, refreshed by polling.
  const [liveActual, setLiveActual] = useState<ActualRounds>(actual);
  const [liveBronzeWinner, setLiveBronzeWinner] = useState<number | null>(bronzeWinnerActual);

  const actualSets: Record<"R16" | "QF" | "SF" | "F", Set<number>> = {
    R16: new Set(liveActual.R16),
    QF: new Set(liveActual.QF),
    SF: new Set(liveActual.SF),
    F: new Set(liveActual.F),
  };

  // SVG connector lines — same approach as BracketEditor, measured from DOM.
  const contentRef = useRef<HTMLDivElement>(null);
  const boxEls = useRef<Record<string, HTMLDivElement | null>>({});
  const [lines, setLines] = useState<string[]>([]);
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    const recompute = () => {
      const c = contentRef.current;
      if (!c) return;
      const cRect = c.getBoundingClientRect();
      const rounds: [string, number][] = [
        ["R32", 16],
        ["R16", 8],
        ["QF", 4],
        ["SF", 2],
      ];
      const segs: string[] = [];
      for (const [round, count] of rounds) {
        const targetRound = round === "SF" ? "F" : NEXT[round];
        for (let m = 0; m < count; m++) {
          const src = boxEls.current[`${round}-${m}`];
          const tgt =
            boxEls.current[
              round === "SF" ? "F" : `${targetRound}-${Math.floor(m / 2)}`
            ];
          if (!src || !tgt) continue;
          const s = src.getBoundingClientRect();
          const t = tgt.getBoundingClientRect();
          const sMidY = s.top - cRect.top + s.height / 2;
          const tMidY = t.top - cRect.top + t.height / 2;
          // Linear layout: source is always to the left of target.
          const sx = s.right - cRect.left;
          const tx = t.left - cRect.left;
          const midX = (sx + tx) / 2;
          segs.push(
            `${sx},${sMidY} ${midX},${sMidY} ${midX},${tMidY} ${tx},${tMidY}`
          );
        }
      }
      setLines(segs);
      setDims({ w: c.scrollWidth, h: c.scrollHeight });
    };
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, []);

  // Poll for updated actual round members every 2 minutes so scoring
  // (green highlights + bracket pts) updates as games finish.
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/bracket-actuals", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setLiveActual({ R16: data.R16, QF: data.QF, SF: data.SF, F: data.F });
        setLiveBronzeWinner(data.bronzeWinner ?? null);
      } catch {
        // silently ignore — stale data is fine
      }
    };
    poll(); // fetch immediately on mount in case server data is already stale
    const id = setInterval(poll, 2 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const participants = (
    roundKey: string,
    i: number
  ): [number | null, number | null] => {
    if (roundKey === "R32") {
      const m = matchups[i];
      return [m?.a?.id ?? null, m?.b?.id ?? null];
    }
    if (roundKey === "F") return [picks["SF-1"] ?? null, picks["SF-2"] ?? null];
    const prev = PREV[roundKey];
    return [
      picks[`${prev}-${2 * i + 1}`] ?? null,
      picks[`${prev}-${2 * i + 2}`] ?? null,
    ];
  };

  const excluded = new Set(excludedSlots);

  const pickedScores = (round: string, teamId: number, slot: string): boolean => {
    if (excluded.has(slot)) return false;
    const reach = ROUND_REACH[round];
    return !!reach && actualSets[reach].has(teamId);
  };

  const rowClass = (slot: string, id: number | null, mode: BoxMode): string => {
    const picked =
      mode === "bronze" ? bronze : (picks[slot] ?? null);
    if (mode === "final" && picked != null && id != null) {
      return id === picked ? GOLD : SILVER;
    }
    if (id != null && picked === id) {
      if (mode === "bronze") {
        return liveBronzeWinner && id === liveBronzeWinner
          ? BRONZE_CLS
          : "bg-slate-50 font-semibold text-slate-500";
      }
      const round = slot.split("-")[0];
      return pickedScores(round, id, slot)
        ? GREEN
        : "bg-slate-50 font-semibold text-slate-500";
    }
    return id ? "text-slate-600" : "text-slate-300";
  };

  const matchBox = (round: string, i: number, mode: BoxMode = "normal") => {
    const slot = `${round}-${i + 1}`;
    const refKey = round === "F" ? "F" : `${round}-${i}`;
    const [a, b] = participants(round, i);
    return (
      <div
        key={slot}
        ref={(el) => {
          boxEls.current[refKey] = el;
        }}
        className="relative z-10 overflow-hidden rounded border border-slate-200 bg-white"
        style={{ width: BOX_W }}
      >
        {[a, b].map((id, idx) => (
          <div
            key={idx}
            className={`flex w-full items-center gap-1.5 px-2 py-1.5 text-xs leading-tight ${
              idx === 0 ? "border-b border-slate-100" : ""
            } ${rowClass(slot, id, mode)}`}
          >
            <FlagImg id={id} teamMeta={teamMeta} nameOf={nameOf} />
            <span className="truncate">{nameOf(id)}</span>
          </div>
        ))}
      </div>
    );
  };

  // Render all matches for a round in a single column, left → right flow.
  const allColumn = (round: string) => {
    const count = ({ R32: 16, R16: 8, QF: 4, SF: 2 } as Record<string, number>)[round] ?? 0;
    return (
      <div key={round} className="flex flex-col">
        <div className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {LABEL[round]}
        </div>
        <div className="flex flex-1 flex-col justify-around gap-1.5">
          {Array.from({ length: count }, (_, i) => matchBox(round, i))}
        </div>
      </div>
    );
  };

  // Bronze candidates = the two SF losers from the player's picks.
  const bronzeCandidates = (): [number | null, number | null] => {
    const [a1, b1] = participants("SF", 0);
    const [a2, b2] = participants("SF", 1);
    const w1 = picks["SF-1"] ?? null;
    const w2 = picks["SF-2"] ?? null;
    const loser1 = w1 ? (w1 === a1 ? b1 : a1) : null;
    const loser2 = w2 ? (w2 === a2 ? b2 : a2) : null;
    return [loser1, loser2];
  };
  const [bc1, bc2] = bronzeCandidates();

  const bronzeBox = () => {
    if (!bc1 || !bc2) {
      return (
        <div
          className="rounded border border-dashed border-slate-200 px-1.5 py-2 text-center text-[10px] text-slate-400"
          style={{ width: BOX_W }}
        >
          —
        </div>
      );
    }
    return (
      <div
        className="relative z-10 overflow-hidden rounded border border-slate-200 bg-white"
        style={{ width: BOX_W }}
      >
        {[bc1, bc2].map((id, idx) => (
          <div
            key={idx}
            className={`flex w-full items-center gap-1.5 px-2 py-1.5 text-xs leading-tight ${
              idx === 0 ? "border-b border-slate-100" : ""
            } ${rowClass("bronze", id, "bronze")}`}
          >
            <FlagImg id={id} teamMeta={teamMeta} nameOf={nameOf} />
            <span className="truncate">{nameOf(id)}</span>
          </div>
        ))}
      </div>
    );
  };

  // Total Part 3 bracket points for this set of picks (auto-filled slots excluded).
  const bracketPts = (() => {
    let pts = 0;
    for (const [slot, teamId] of Object.entries(picks)) {
      if (excluded.has(slot)) continue;
      const round = slot.split("-")[0];
      const reach = ROUND_REACH[round];
      if (reach && actualSets[reach].has(teamId)) {
        pts += ROUND_PTS[round] ?? 0;
      }
    }
    if (bronze && liveBronzeWinner && bronze === liveBronzeWinner) pts += 10;
    return pts;
  })();

  return (
    <div className="space-y-3">
      {/* Full-bleed horizontal scroll — same trick as BracketEditor. */}
      <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-x-auto px-4 pb-2">
        <div ref={contentRef} className="relative mx-auto w-max">
          <svg
            width={dims.w}
            height={dims.h}
            className="pointer-events-none absolute left-0 top-0"
            aria-hidden="true"
          >
            {lines.map((pts, idx) => (
              <polyline
                key={idx}
                points={pts}
                fill="none"
                stroke="#cbd5e1"
                strokeWidth={1.5}
              />
            ))}
          </svg>
          <div className="flex items-stretch gap-4">
            {allColumn("R32")}
            {allColumn("R16")}
            {allColumn("QF")}
            {allColumn("SF")}

            <div className="flex flex-col justify-center gap-2 px-0.5">
              <div className="text-center text-[10px] font-semibold uppercase tracking-wide text-amber-500">
                🏆 Final
              </div>
              {matchBox("F", 0, "final")}
              <div className="mt-2 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                3rd place
              </div>
              {bronzeBox()}
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400">
        Green = pick scored · R16 = 3 · QF = 5 · SF = 8 · Final = 12 · Bronze
        = 10 ·{" "}
        <span className="font-semibold text-slate-600">{bracketPts} bracket pts</span>
      </p>
    </div>
  );
}

function FlagImg({
  id,
  teamMeta,
  nameOf,
}: {
  id: number | null;
  teamMeta: Map<number, Team>;
  nameOf: (id: number | null | undefined) => string;
}) {
  if (!id) return null;
  const t = teamMeta.get(id);
  const url = flagUrl(t?.code, t?.name ?? nameOf(id));
  if (!url) return null;
  return <img src={url} alt="" className="h-3 w-auto shrink-0 rounded-[1px]" />;
}

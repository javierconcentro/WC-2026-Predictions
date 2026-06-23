"use client";

import { useEffect, useRef, useState } from "react";
import type { Team } from "@/lib/types";
import type { Matchup } from "@/lib/bracket";
import { flagUrl } from "@/lib/flags";

interface Props {
  matchups: Matchup[]; // the 16 seeded Round-of-32 pairings
  teams: Team[];
  locked: boolean;
}

type Picks = Record<string, number>; // slot -> picked team id

// Rounds that score in Part 3 (the Final pick / champion is recorded as F-1
// but scored via Awards, so it's not in here).
const SCORING_ROUNDS = [
  { key: "R32", matches: 16 },
  { key: "R16", matches: 8 },
  { key: "QF", matches: 4 },
  { key: "SF", matches: 2 },
] as const;

const PREV: Record<string, string> = { R16: "R32", QF: "R16", SF: "QF" };
const LABEL: Record<string, string> = { R32: "R32", R16: "R16", QF: "QF", SF: "Semis" };
const BOX_W = 116;

export default function BracketEditor({ matchups, teams, locked }: Props) {
  const [picks, setPicks] = useState<Picks>({});
  const [bronze, setBronze] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const teamMeta = new Map(teams.map((t) => [t.id, t]));
  const nameOf = (id: number | null | undefined) => (id ? teamMeta.get(id)?.name ?? "TBD" : "TBD");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/picks/bracket");
      if (res.ok) {
        const { picks: rows, bronze_winner_team_id } = await res.json();
        const map: Picks = {};
        for (const r of rows ?? []) map[r.slot] = r.picked_team_id;
        setPicks(map);
        setBronze(bronze_winner_team_id ?? null);
      }
      setLoaded(true);
    })();
  }, []);

  const participants = (roundKey: string, i: number, p: Picks): [number | null, number | null] => {
    if (roundKey === "R32") {
      const m = matchups[i];
      return [m?.a?.id ?? null, m?.b?.id ?? null];
    }
    if (roundKey === "F") return [p["SF-1"] ?? null, p["SF-2"] ?? null];
    const prev = PREV[roundKey];
    return [p[`${prev}-${2 * i + 1}`] ?? null, p[`${prev}-${2 * i + 2}`] ?? null];
  };

  const prune = (p: Picks): Picks => {
    const next = { ...p };
    for (const round of SCORING_ROUNDS) {
      for (let i = 0; i < round.matches; i++) {
        const slot = `${round.key}-${i + 1}`;
        const [a, b] = participants(round.key, i, next);
        if (next[slot] != null && next[slot] !== a && next[slot] !== b) delete next[slot];
      }
    }
    const [fa, fb] = participants("F", 0, next);
    if (next["F-1"] != null && next["F-1"] !== fa && next["F-1"] !== fb) delete next["F-1"];
    return next;
  };

  const bronzeCandidates = (p: Picks): number[] => {
    const out: number[] = [];
    for (let i = 0; i < 2; i++) {
      const [a, b] = participants("SF", i, p);
      const winner = p[`SF-${i + 1}`];
      if (winner) out.push(winner === a ? (b as number) : (a as number));
    }
    return out.filter(Boolean);
  };

  const save = (p: Picks, b: number | null) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = setTimeout(async () => {
      const res = await fetch("/api/picks/bracket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          picks: Object.entries(p).map(([slot, picked_team_id]) => ({ slot, picked_team_id })),
          bronze_winner_team_id: b,
        }),
      });
      setSaveState(res.ok ? "saved" : "error");
    }, 600);
  };

  const choose = (slot: string, teamId: number | null) => {
    if (locked || !teamId) return;
    setPicks((prev) => {
      const next = prune({ ...prev, [slot]: teamId });
      const cands = bronzeCandidates(next);
      const nextBronze = bronze != null && cands.includes(bronze) ? bronze : null;
      if (nextBronze !== bronze) setBronze(nextBronze);
      save(next, nextBronze);
      return next;
    });
  };

  const chooseBronze = (teamId: number) => {
    if (locked) return;
    setBronze(teamId);
    save(picks, teamId);
  };

  if (!loaded) return <p className="text-sm text-slate-400">Loading the bracket…</p>;

  const sideMatches = (round: string, side: "left" | "right"): number[] => {
    const total = { R32: 16, R16: 8, QF: 4, SF: 2 }[round] ?? 0;
    const half = total / 2;
    const start = side === "left" ? 0 : half;
    return Array.from({ length: half }, (_, k) => start + k);
  };

  const matchBox = (round: string, i: number, gold = false) => {
    const slot = `${round}-${i + 1}`;
    const [a, b] = participants(round, i, picks);
    return (
      <MatchBox
        key={slot}
        a={a}
        b={b}
        picked={picks[slot] ?? null}
        locked={locked}
        gold={gold}
        teamMeta={teamMeta}
        nameOf={nameOf}
        onPick={(id) => choose(slot, id)}
      />
    );
  };

  const column = (round: string, side: "left" | "right") => (
    <div key={side + round} className="flex flex-col">
      <div className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {LABEL[round]}
      </div>
      <div className="flex flex-1 flex-col justify-around gap-1.5">
        {sideMatches(round, side).map((i) => matchBox(round, i))}
      </div>
    </div>
  );

  const cands = bronzeCandidates(picks);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {locked
            ? "Bracket is locked — good luck!"
            : "Tap who advances. Winners flow inward to the Final. Scroll sideways to see it all."}
        </p>
        {!locked && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
              saveState === "saving"
                ? "bg-amber-100 text-amber-700"
                : saveState === "saved"
                  ? "bg-emerald-100 text-emerald-700"
                  : saveState === "error"
                    ? "bg-red-100 text-red-700"
                    : "bg-slate-100 text-slate-500"
            }`}
          >
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : saveState === "error" ? "Save failed" : "Auto-save on"}
          </span>
        )}
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-stretch gap-1.5">
          {column("R32", "left")}
          {column("R16", "left")}
          {column("QF", "left")}
          {column("SF", "left")}

          {/* Center: Final (gold) + Third place */}
          <div className="flex flex-col justify-center gap-2 px-0.5">
            <div className="text-center text-[10px] font-semibold uppercase tracking-wide text-amber-500">
              🏆 Final
            </div>
            {matchBox("F", 0, true)}
            <div className="mt-2 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              3rd place
            </div>
            {cands.length < 2 ? (
              <div
                className="rounded border border-dashed border-slate-200 px-1.5 py-2 text-center text-[10px] text-slate-400"
                style={{ width: BOX_W }}
              >
                Pick both semis
              </div>
            ) : (
              <MatchBox
                a={cands[0]}
                b={cands[1]}
                picked={bronze}
                locked={locked}
                gold={false}
                teamMeta={teamMeta}
                nameOf={nameOf}
                onPick={(id) => id && chooseBronze(id)}
              />
            )}
          </div>

          {column("SF", "right")}
          {column("QF", "right")}
          {column("R16", "right")}
          {column("R32", "right")}
        </div>
      </div>

      <p className="text-center text-xs text-slate-400">
        Each pick scores when that team reaches the round — R16 = 3 · QF = 5 · SF = 8 · Final = 12 · Bronze = 10.
        Your gold champion is your bracket winner; the 25-pt champion is your Awards pick.
      </p>
    </div>
  );
}

function MatchBox({
  a,
  b,
  picked,
  locked,
  gold,
  teamMeta,
  nameOf,
  onPick,
}: {
  a: number | null;
  b: number | null;
  picked: number | null;
  locked: boolean;
  gold: boolean;
  teamMeta: Map<number, Team>;
  nameOf: (id: number | null | undefined) => string;
  onPick: (id: number | null) => void;
}) {
  return (
    <div className="overflow-hidden rounded border border-slate-200 bg-white" style={{ width: BOX_W }}>
      {[a, b].map((id, idx) => {
        const selected = picked != null && picked === id;
        const pickable = !locked && !!id;
        const selClass = gold
          ? "bg-amber-100 font-semibold text-amber-800"
          : "bg-emerald-50 font-semibold text-emerald-700";
        return (
          <button
            key={idx}
            type="button"
            disabled={!pickable}
            title={id ? nameOf(id) : undefined}
            onClick={() => onPick(id)}
            className={`flex w-full items-center gap-1 px-1.5 py-1 text-left text-[11px] leading-tight ${
              idx === 0 ? "border-b border-slate-100" : ""
            } ${selected ? selClass : id ? "hover:bg-slate-50" : "text-slate-300"}`}
          >
            <Flag id={id} teamMeta={teamMeta} nameOf={nameOf} />
            <span className="truncate">{nameOf(id)}</span>
            {selected && <span className={`ml-auto ${gold ? "text-amber-500" : "text-emerald-600"}`}>{gold ? "★" : "✓"}</span>}
          </button>
        );
      })}
    </div>
  );
}

function Flag({
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
  return <img src={url} alt="" className="h-2.5 w-auto shrink-0 rounded-[1px]" />;
}

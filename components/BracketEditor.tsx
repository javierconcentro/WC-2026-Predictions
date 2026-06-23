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

const ROUNDS = [
  { key: "R32", label: "Round of 32", matches: 16, pts: 3 },
  { key: "R16", label: "Round of 16", matches: 8, pts: 5 },
  { key: "QF", label: "Quarter-finals", matches: 4, pts: 8 },
  { key: "SF", label: "Semi-finals", matches: 2, pts: 12 },
] as const;

const PREV: Record<string, string> = { R16: "R32", QF: "R16", SF: "QF" };

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

  // Participants of a given match, derived from the previous round's winners.
  const participants = (roundKey: string, i: number, p: Picks): [number | null, number | null] => {
    if (roundKey === "R32") {
      const m = matchups[i];
      return [m?.a?.id ?? null, m?.b?.id ?? null];
    }
    const prev = PREV[roundKey];
    return [p[`${prev}-${2 * i + 1}`] ?? null, p[`${prev}-${2 * i + 2}`] ?? null];
  };

  // Drop any downstream pick that's no longer a valid participant after a change.
  const prune = (p: Picks): Picks => {
    const next = { ...p };
    for (const round of ROUNDS) {
      for (let i = 0; i < round.matches; i++) {
        const slot = `${round.key}-${i + 1}`;
        const [a, b] = participants(round.key, i, next);
        if (next[slot] != null && next[slot] !== a && next[slot] !== b) delete next[slot];
      }
    }
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

  const finalists: [number | null, number | null] = [picks["SF-1"] ?? null, picks["SF-2"] ?? null];
  const cands = bronzeCandidates(picks);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {locked
            ? "Bracket is locked — good luck!"
            : "Tap the team you think advances in each match. Winners flow to the next round automatically."}
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

      {ROUNDS.map((round) => (
        <section key={round.key} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">{round.label}</h3>
            <span className="text-xs text-slate-400">{round.pts} pts each</span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {Array.from({ length: round.matches }, (_, i) => {
              const slot = `${round.key}-${i + 1}`;
              const [a, b] = participants(round.key, i, picks);
              return (
                <MatchCard
                  key={slot}
                  a={a}
                  b={b}
                  picked={picks[slot] ?? null}
                  locked={locked}
                  nameOf={nameOf}
                  teamMeta={teamMeta}
                  onPick={(id) => choose(slot, id)}
                />
              );
            })}
          </div>
        </section>
      ))}

      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">Final</h3>
        <div className="rounded-lg border border-slate-200 p-2 text-sm">
          <p className="flex items-center gap-1.5">
            <TeamLabel id={finalists[0]} nameOf={nameOf} teamMeta={teamMeta} /> <span className="text-slate-400">vs</span>{" "}
            <TeamLabel id={finalists[1]} nameOf={nameOf} teamMeta={teamMeta} />
          </p>
          <p className="mt-1 text-xs text-slate-400">🏆 Champion is chosen in the Awards tab (worth 25 pts there).</p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Third place</h3>
          <span className="text-xs text-slate-400">10 pts</span>
        </div>
        {cands.length < 2 ? (
          <p className="text-xs text-slate-400">Pick both semi-final winners first — the two losers play for bronze.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {cands.map((id) => (
              <button
                key={id}
                type="button"
                disabled={locked}
                onClick={() => chooseBronze(id)}
                className={`flex items-center gap-1.5 rounded-lg border px-2 py-2 text-sm ${
                  bronze === id
                    ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-700"
                    : "border-slate-200 hover:border-slate-400"
                } disabled:opacity-70`}
              >
                <Flag id={id} teamMeta={teamMeta} nameOf={nameOf} />
                <span className="truncate">{nameOf(id)}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MatchCard({
  a,
  b,
  picked,
  locked,
  nameOf,
  teamMeta,
  onPick,
}: {
  a: number | null;
  b: number | null;
  picked: number | null;
  locked: boolean;
  nameOf: (id: number | null | undefined) => string;
  teamMeta: Map<number, Team>;
  onPick: (id: number | null) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      {[a, b].map((id, idx) => {
        const selected = picked != null && picked === id;
        const pickable = !locked && !!id;
        return (
          <button
            key={idx}
            type="button"
            disabled={!pickable}
            onClick={() => onPick(id)}
            className={`flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-sm ${
              idx === 0 ? "border-b border-slate-100" : ""
            } ${
              selected
                ? "bg-emerald-50 font-semibold text-emerald-700"
                : id
                  ? "hover:bg-slate-50"
                  : "text-slate-300"
            }`}
          >
            <Flag id={id} teamMeta={teamMeta} nameOf={nameOf} />
            <span className="truncate">{nameOf(id)}</span>
            {selected && <span className="ml-auto text-emerald-600">✓</span>}
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
  return <img src={url} alt="" className="h-3 w-auto shrink-0 rounded-[2px]" />;
}

function TeamLabel({
  id,
  teamMeta,
  nameOf,
}: {
  id: number | null;
  teamMeta: Map<number, Team>;
  nameOf: (id: number | null | undefined) => string;
}) {
  return (
    <span className="inline-flex items-center gap-1 font-medium">
      <Flag id={id} teamMeta={teamMeta} nameOf={nameOf} />
      {nameOf(id)}
    </span>
  );
}

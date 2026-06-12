"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Team } from "@/lib/types";
import { GROUPS } from "@/lib/types";
import GroupRanker from "./GroupRanker";
import PlayerPicker from "./PlayerPicker";
import { MVP_FEATURED, MVP_REST, SCORER_FEATURED, SCORER_REST, GK_FEATURED, GK_REST } from "@/lib/playerLists";

interface Props {
  playerName: string;
  teams: Team[];
  locked: boolean;
  lockAt: string;
}

interface Part1State {
  champion_team_id: number | null;
  runnerup_team_id: number | null;
  top_scorer_provider_id: number | null;
  top_scorer_name: string;
  mvp_name: string;
  golden_glove_name: string;
}

export default function PicksEditor({ playerName, teams, locked, lockAt }: Props) {
  const [part1, setPart1] = useState<Part1State>({
    champion_team_id: null,
    runnerup_team_id: null,
    top_scorer_provider_id: null,
    top_scorer_name: "",
    mvp_name: "",
    golden_glove_name: "",
  });
  const [rankings, setRankings] = useState<Record<string, number[]>>({});
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load existing picks
  useEffect(() => {
    (async () => {
      const [p1Res, grRes] = await Promise.all([
        fetch("/api/picks/part1"),
        fetch("/api/picks/groups"),
      ]);
      if (p1Res.ok) {
        const { picks } = await p1Res.json();
        if (picks) {
          setPart1({
            champion_team_id: picks.champion_team_id,
            runnerup_team_id: picks.runnerup_team_id,
            top_scorer_provider_id: picks.top_scorer_provider_id,
            top_scorer_name: picks.top_scorer_name ?? "",
            mvp_name: picks.mvp_name ?? "",
            golden_glove_name: picks.golden_glove_name ?? "",
          });
        }
      }
      if (grRes.ok) {
        const { rankings: rows } = await grRes.json();
        const byGroup: Record<string, number[]> = {};
        for (const g of GROUPS) {
          const ordered = rows
            .filter((r: any) => r.group_letter === g)
            .sort((a: any, b: any) => a.predicted_position - b.predicted_position)
            .map((r: any) => r.team_id);
          if (ordered.length === 4) byGroup[g] = ordered;
        }
        setRankings(byGroup);
      }
      setLoaded(true);
    })();
  }, []);

  // Debounced autosave of Part 1
  const savePart1 = useCallback((state: Part1State) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = setTimeout(async () => {
      const res = await fetch("/api/picks/part1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      setSaveState(res.ok ? "saved" : "error");
    }, 600);
  }, []);

  const updatePart1 = (patch: Partial<Part1State>) => {
    setPart1((prev) => {
      const next = { ...prev, ...patch };
      savePart1(next);
      return next;
    });
  };

  const saveGroup = async (group: string, teamIds: number[]) => {
    setRankings((prev) => ({ ...prev, [group]: teamIds }));
    setSaveState("saving");
    const res = await fetch("/api/picks/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group_letter: group, team_ids: teamIds }),
    });
    setSaveState(res.ok ? "saved" : "error");
  };

  const teamOptions = teams.filter((t) => t.group_letter);
  const groupsWithTeams = GROUPS.filter((g) => teams.some((t) => t.group_letter === g));
  const completedGroups = groupsWithTeams.filter((g) => rankings[g]?.length === 4).length;

  if (!loaded) return <p className="text-sm text-slate-400">Loading your picks…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Hi {playerName} 👋</h2>
          <p className="text-xs text-slate-500">
            {locked
              ? "Picks are locked — good luck!"
              : `Everything saves automatically. Editable until ${new Date(lockAt).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.`}
          </p>
        </div>
        {!locked && (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              saveState === "saving"
                ? "bg-amber-100 text-amber-700"
                : saveState === "saved"
                  ? "bg-emerald-100 text-emerald-700"
                  : saveState === "error"
                    ? "bg-red-100 text-red-700"
                    : "bg-slate-100 text-slate-500"
            }`}
          >
            {saveState === "saving"
              ? "Saving…"
              : saveState === "saved"
                ? "Saved ✓"
                : saveState === "error"
                  ? "Save failed"
                  : "Auto-save on"}
          </span>
        )}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Part 1 — Outright picks (80 pts)
        </h3>
        <div className="space-y-3">
          <TeamSelect
            label="Champion (25 pts)"
            teams={teamOptions}
            value={part1.champion_team_id}
            disabled={locked}
            onChange={(v) => updatePart1({ champion_team_id: v })}
          />
          <TeamSelect
            label="Runner-up (15 pts)"
            teams={teamOptions}
            value={part1.runnerup_team_id}
            disabled={locked}
            onChange={(v) => updatePart1({ runnerup_team_id: v })}
          />
          <PlayerPicker
            label="Top scorer (20 pts)"
            value={part1.top_scorer_name}
            disabled={locked}
            featured={SCORER_FEATURED}
            rest={SCORER_REST}
            onChange={(name) => updatePart1({ top_scorer_name: name, top_scorer_provider_id: null })}
          />
          <PlayerPicker
            label="Best player / MVP (10 pts)"
            value={part1.mvp_name}
            disabled={locked}
            featured={MVP_FEATURED}
            rest={MVP_REST}
            onChange={(name) => updatePart1({ mvp_name: name })}
          />
          <PlayerPicker
            label="Golden glove (10 pts)"
            value={part1.golden_glove_name}
            disabled={locked}
            featured={GK_FEATURED}
            rest={GK_REST}
            onChange={(name) => updatePart1({ golden_glove_name: name })}
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Part 2 — Group rankings (84 pts)
          </h3>
          <span className="text-xs text-slate-400">
            {completedGroups}/{groupsWithTeams.length} groups done
          </span>
        </div>
        <p className="mb-3 text-xs text-slate-500">
          Drag each group into your predicted finishing order. Correct 1st = 3, 2nd = 2, 3rd = 1,
          4th = 1.
        </p>
        {groupsWithTeams.length === 0 ? (
          <p className="text-sm text-slate-400">
            Teams haven&apos;t been loaded yet — the admin needs to run the first sync.
          </p>
        ) : (
          <div className="space-y-4">
            {groupsWithTeams.map((g) => (
              <GroupRanker
                key={g}
                group={g}
                teams={teams.filter((t) => t.group_letter === g)}
                order={rankings[g] ?? null}
                disabled={locked}
                onReorder={(ids) => saveGroup(g, ids)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">
        <p className="font-semibold">Part 3 — Knockout bracket (154 pts)</p>
        <p>Opens when the group stage finishes (~June 27). You&apos;ll pick winners through the final.</p>
      </section>

      <button
        onClick={async () => {
          await fetch("/api/logout", { method: "POST" });
          location.reload();
        }}
        className="text-xs text-slate-400 underline"
      >
        Not {playerName}? Switch player
      </button>
    </div>
  );
}

function TeamSelect({
  label,
  teams,
  value,
  disabled,
  onChange,
}: {
  label: string;
  teams: Team[];
  value: number | null;
  disabled: boolean;
  onChange: (v: number | null) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <select
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-100"
      >
        <option value="">— pick a team —</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} (Group {t.group_letter})
          </option>
        ))}
      </select>
    </label>
  );
}

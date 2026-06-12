"use client";

import { useEffect, useRef, useState } from "react";
import type { Fixture, StandingRow, Team } from "@/lib/types";
import { flagUrl } from "@/lib/flags";

const POLL_MS = 45_000;

interface Feed {
  fixtures: Fixture[];
  standings: StandingRow[];
  teams: Team[];
}

const STAGE_LABEL: Record<string, string> = {
  group: "Group",
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter-final",
  SF: "Semi-final",
  bronze: "Third place",
  F: "Final",
};

export default function LiveGames() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const scrolledOnce = useRef(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/fixtures");
        if (!res.ok) throw new Error("Failed to load fixtures");
        const data = (await res.json()) as Feed;
        if (alive) {
          setFeed(data);
          setError(null);
        }
      } catch (e: any) {
        if (alive) setError(e.message);
      }
    };
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  // Autoscroll once to the live game, or the next upcoming one.
  useEffect(() => {
    if (feed && !scrolledOnce.current && anchorRef.current) {
      anchorRef.current.scrollIntoView({ block: "start", behavior: "auto" });
      scrolledOnce.current = true;
    }
  }, [feed]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!feed) return <p className="text-sm text-slate-400">Loading games…</p>;
  if (feed.fixtures.length === 0) {
    return (
      <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        No fixtures yet — the admin needs to run the first data sync.
      </p>
    );
  }

  const teamById = new Map(feed.teams.map((t) => [t.id, t]));
  const name = (f: Fixture, side: "home" | "away") => {
    const id = side === "home" ? f.home_team_id : f.away_team_id;
    const fallback = side === "home" ? f.home_team_name : f.away_team_name;
    return (id && teamById.get(id)?.name) || fallback || "TBD";
  };
  const getFlag = (f: Fixture, side: "home" | "away") => {
    const id = side === "home" ? f.home_team_id : f.away_team_id;
    const fallbackName = side === "home" ? f.home_team_name : f.away_team_name;
    if (!id) return null;
    const team = teamById.get(id);
    return flagUrl(team?.code, team?.name ?? fallbackName);
  };

  // Anchor: first live game, else first scheduled game.
  const anchorId =
    feed.fixtures.find((f) => f.status === "live")?.id ??
    feed.fixtures.find((f) => f.status === "scheduled")?.id;

  return (
    <div className="space-y-2">
      {feed.fixtures.map((f) => {
        const isAnchor = f.id === anchorId;
        const isOpen = expanded === f.id;
        const kickoff = new Date(f.kickoff_utc);
        return (
          <div key={f.id} ref={isAnchor ? anchorRef : undefined} className="scroll-mt-28">
            <button
              onClick={() => setExpanded(isOpen ? null : f.id)}
              className={`w-full rounded-xl border bg-white p-3 text-left shadow-sm transition-colors ${
                f.status === "live"
                  ? "border-emerald-500 ring-1 ring-emerald-400"
                  : "border-slate-200 hover:border-[#101828]/40"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  {STAGE_LABEL[f.stage]}
                  {f.group_letter ? ` ${f.group_letter}` : ""}
                </span>
                <span>
                  {f.status === "live" ? (
                    <span className="font-semibold text-emerald-600">● LIVE</span>
                  ) : f.status === "finished" ? (
                    "FT"
                  ) : (
                    kickoff.toLocaleString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  )}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className={`flex-1 flex items-center gap-1.5 min-w-0 text-sm font-medium ${f.status === "scheduled" ? "text-slate-600" : ""}`}>
                  {getFlag(f, "home") && (
                    <img src={getFlag(f, "home")!} alt="" className="h-3.5 w-auto rounded-[2px] shrink-0" />
                  )}
                  <span className="truncate">{name(f, "home")}</span>
                </span>
                <span className="shrink-0 px-2 font-bold tabular-nums">
                  {f.status === "scheduled" ? "vs" : `${f.home_score ?? 0} – ${f.away_score ?? 0}`}
                </span>
                <span className={`flex-1 flex items-center justify-end gap-1.5 min-w-0 text-sm font-medium ${f.status === "scheduled" ? "text-slate-600" : ""}`}>
                  <span className="truncate text-right">{name(f, "away")}</span>
                  {getFlag(f, "away") && (
                    <img src={getFlag(f, "away")!} alt="" className="h-3.5 w-auto rounded-[2px] shrink-0" />
                  )}
                </span>
              </div>
              {f.home_penalties != null && (
                <p className="mt-0.5 text-center text-xs text-slate-400">
                  pens {f.home_penalties}–{f.away_penalties}
                </p>
              )}
            </button>
            {isOpen && <ExpandedGame fixture={f} feed={feed} />}
          </div>
        );
      })}
    </div>
  );
}

function ExpandedGame({ fixture, feed }: { fixture: Fixture; feed: Feed }) {
  if (fixture.stage === "group" && fixture.group_letter) {
    const rows = feed.standings
      .filter((s) => s.group_letter === fixture.group_letter)
      .sort((a, b) => a.position - b.position);
    const teamById = new Map(feed.teams.map((t) => [t.id, t]));
    return (
      <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Group {fixture.group_letter} table
        </p>
        {rows.length === 0 ? (
          <p className="text-xs text-slate-400">Standings not synced yet.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="py-1 pr-2">#</th>
                <th className="py-1">Team</th>
                <th className="py-1 text-right">P</th>
                <th className="py-1 text-right">GD</th>
                <th className="py-1 text-right">Pts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.position} className="border-t border-slate-200">
                  <td className="py-1 pr-2 text-slate-400">{s.position}</td>
                  <td className="py-1 font-medium">{teamById.get(s.team_id)?.name ?? s.team_id}</td>
                  <td className="py-1 text-right">{s.played}</td>
                  <td className="py-1 text-right">{s.goal_diff > 0 ? `+${s.goal_diff}` : s.goal_diff}</td>
                  <td className="py-1 text-right font-semibold">{s.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }
  // Knockout: per-player predicted winners (lands with the bracket feature).
  return (
    <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
      Player predictions for knockout games will appear here once brackets are in.
    </div>
  );
}

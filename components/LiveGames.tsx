"use client";

import { useEffect, useRef, useState } from "react";
import type { Fixture, StandingRow, Team } from "@/lib/types";
import { flagUrl } from "@/lib/flags";
import { knockoutFixtureSlots } from "@/lib/bracket";

const POLL_MS = 30_000;

interface Feed {
  fixtures: Fixture[];
  standings: StandingRow[];
  teams: Team[];
}

interface Predictions {
  players: { id: string; name: string }[];
  bracketPicks: { player_id: string; slot: string; picked_team_id: number }[];
  champPicks: { player_id: string; champion_team_id: number | null }[];
  bronzePicks: { player_id: string; bronze_winner_team_id: number | null }[];
}

function liveMinute(kickoffUtc: string): string {
  const elapsed = Math.floor((Date.now() - new Date(kickoffUtc).getTime()) / 60_000);
  if (elapsed <= 0) return "";
  if (elapsed <= 47) return ` '${elapsed}`;     // 1st half (incl. stoppage)
  if (elapsed <= 62) return " HT";              // halftime break (~15 min)
  const m = 45 + (elapsed - 62);
  return ` '${Math.min(m, 90)}`;               // 2nd half, cap at 90'
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
  const [preds, setPreds] = useState<Predictions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const scrolledOnce = useRef(false);

  // Predictions are fixed (bracket is locked) — fetch once, no polling.
  useEffect(() => {
    let alive = true;
    fetch("/api/predictions")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (alive && data) setPreds(data as Predictions);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

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

  const slotByFixture = knockoutFixtureSlots(feed.fixtures);

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
                    <span className="font-semibold text-emerald-600">● LIVE{liveMinute(f.kickoff_utc)}</span>
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
            {isOpen && (
              <ExpandedGame
                fixture={f}
                feed={feed}
                preds={preds}
                slot={slotByFixture.get(f.id) ?? null}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ExpandedGame({
  fixture,
  feed,
  preds,
  slot,
}: {
  fixture: Fixture;
  feed: Feed;
  preds: Predictions | null;
  slot: string | null;
}) {
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
  // Knockout: who picked each team to win this matchup.
  return <KnockoutVoters fixture={fixture} feed={feed} preds={preds} slot={slot} />;
}

interface Voter {
  name: string;
  country: string;
}

function KnockoutVoters({
  fixture,
  feed,
  preds,
  slot,
}: {
  fixture: Fixture;
  feed: Feed;
  preds: Predictions | null;
  slot: string | null;
}) {
  if (!preds) {
    return (
      <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-400">
        Loading predictions…
      </div>
    );
  }
  if (!slot) {
    return (
      <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-400">
        Picks will appear once this matchup is decided by the previous round.
      </div>
    );
  }

  const teamById = new Map(feed.teams.map((t) => [t.id, t]));
  const teamName = (id: number | null) =>
    (id && teamById.get(id)?.name) || "Unknown";
  const teamFlag = (id: number | null) => {
    if (!id) return null;
    const t = teamById.get(id);
    return flagUrl(t?.code, t?.name);
  };

  const home = fixture.home_team_id;
  const away = fixture.away_team_id;

  const pickOf = (playerId: string): number | null => {
    if (slot === "F") {
      return (
        preds.champPicks.find((c) => c.player_id === playerId)?.champion_team_id ?? null
      );
    }
    if (slot === "bronze") {
      return (
        preds.bronzePicks.find((c) => c.player_id === playerId)?.bronze_winner_team_id ??
        null
      );
    }
    return (
      preds.bracketPicks.find((b) => b.player_id === playerId && b.slot === slot)
        ?.picked_team_id ?? null
    );
  };

  const homeVoters: Voter[] = [];
  const awayVoters: Voter[] = [];
  const otherVoters: Voter[] = [];
  for (const p of preds.players) {
    const pick = pickOf(p.id);
    if (pick == null) continue;
    const entry: Voter = { name: p.name, country: teamName(pick) };
    if (pick === home) homeVoters.push(entry);
    else if (pick === away) awayVoters.push(entry);
    else otherVoters.push(entry);
  }
  const byName = (a: Voter, b: Voter) => a.name.localeCompare(b.name);
  homeVoters.sort(byName);
  awayVoters.sort(byName);
  otherVoters.sort(byName);

  const winner = fixture.status === "finished" ? fixture.winner_team_id : null;

  const Column = ({
    flag,
    title,
    voters,
    won,
  }: {
    flag: string | null;
    title: string;
    voters: Voter[];
    won: boolean;
  }) => (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center gap-1 border-b border-slate-200 pb-1">
        {flag && <img src={flag} alt="" className="h-3 w-auto rounded-[2px] shrink-0" />}
        <span className="truncate text-xs font-semibold text-slate-600">{title}</span>
      </div>
      {voters.length === 0 ? (
        <p className="text-xs text-slate-300">—</p>
      ) : (
        <ul className="space-y-0.5">
          {voters.map((v) => (
            <li
              key={v.name}
              className={`text-xs leading-tight ${won ? "font-semibold text-emerald-600" : "text-slate-600"}`}
            >
              {v.name}{" "}
              <span className={won ? "text-emerald-500" : "text-slate-400"}>({v.country})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="grid grid-cols-3 items-start gap-2">
        <Column
          flag={teamFlag(home)}
          title={teamName(home)}
          voters={homeVoters}
          won={winner != null && winner === home}
        />
        <Column flag={null} title="Other pick" voters={otherVoters} won={false} />
        <Column
          flag={teamFlag(away)}
          title={teamName(away)}
          voters={awayVoters}
          won={winner != null && winner === away}
        />
      </div>
    </div>
  );
}

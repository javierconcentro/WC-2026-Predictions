"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Fixture, StandingRow, Team } from "@/lib/types";
import { flagUrl } from "@/lib/flags";
import { knockoutFixtureSlots } from "@/lib/bracket";

const POLL_MS = 30_000;

interface Feed {
  fixtures: Fixture[];
  standings: StandingRow[];
  teams: Team[];
}

interface AwardRow {
  player_id: string;
  champion_team_id: number | null;
  runnerup_team_id: number | null;
  top_scorer_name: string | null;
  mvp_name: string | null;
  golden_glove_name: string | null;
}

interface Predictions {
  players: { id: string; name: string }[];
  bracketPicks: { player_id: string; slot: string; picked_team_id: number }[];
  awards: AwardRow[];
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
  const [awardsOpen, setAwardsOpen] = useState(false);
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

  if (error) return <p className="text-sm text-red-300">{error}</p>;
  if (!feed) return <p className="text-sm text-slate-200">Loading games…</p>;
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
          <div
            key={f.id}
            ref={isAnchor ? anchorRef : undefined}
            className={`scroll-mt-28 overflow-hidden rounded-xl border bg-white shadow-sm transition-colors ${
              f.status === "live"
                ? "border-emerald-500 ring-1 ring-emerald-400"
                : "border-slate-200"
            }`}
          >
            <button
              onClick={() => setExpanded(isOpen ? null : f.id)}
              className="block w-full p-3 text-left transition-colors hover:bg-slate-50"
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

      {/* Standalone "Awards" dropdown, below the final. Independent of the
          game rows — holds the tournament-wide award predictions. */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <button
          onClick={() => setAwardsOpen((o) => !o)}
          className="block w-full p-3 text-left transition-colors hover:bg-slate-50"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">🏅 Awards</span>
            <span className="text-xs text-slate-400">{awardsOpen ? "Hide" : "Show"}</span>
          </div>
        </button>
        {awardsOpen && (
          <div className="border-t border-slate-100 bg-slate-50/60 p-3">
            {preds ? (
              <ExtraAwards feed={feed} preds={preds} />
            ) : (
              <p className="text-xs text-slate-400">Loading predictions…</p>
            )}
          </div>
        )}
      </div>
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
      <div className="border-t border-slate-100 bg-slate-50/60 p-3">
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
      <div className="border-t border-slate-100 bg-slate-50/60 p-3 text-xs text-slate-400">
        Loading predictions…
      </div>
    );
  }
  if (!slot) {
    return (
      <div className="border-t border-slate-100 bg-slate-50/60 p-3 text-xs text-slate-400">
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

  // Each player's predicted winner of THIS match (slot). The bracket records
  // the champion as slot F-1 and the third-place winner in bronze_picks; every
  // other knockout slot is a normal bracket pick.
  const pickOf = (playerId: string): number | null => {
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

  const byName = (a: Voter, b: Voter) => a.name.localeCompare(b.name);
  const winner = fixture.status === "finished" ? fixture.winner_team_id : null;

  // Names only for the two teams in the match (the card above already names
  // them); the winning side turns green. The middle column holds everyone who
  // picked a team that isn't playing this match — shown in light grey with the
  // team they actually picked, since that one isn't obvious.
  let body: ReactNode;
  if (home && away) {
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
    homeVoters.sort(byName);
    awayVoters.sort(byName);
    otherVoters.sort(byName);

    const side = (voters: Voter[], won: boolean, align: "left" | "right") =>
      voters.length === 0 ? (
        <p className={`text-xs text-slate-300 ${align === "right" ? "text-right" : ""}`}>—</p>
      ) : (
        <ul className="space-y-0.5">
          {voters.map((v) => (
            <li
              key={v.name}
              className={`text-xs leading-tight ${align === "right" ? "text-right" : ""} ${
                won ? "font-semibold text-emerald-600" : "text-slate-600"
              }`}
            >
              {v.name}
            </li>
          ))}
        </ul>
      );

    body = (
      <div className="grid grid-cols-3 items-start gap-2">
        {side(homeVoters, winner != null && winner === home, "left")}
        {otherVoters.length === 0 ? (
          <p className="text-center text-xs text-slate-300">—</p>
        ) : (
          <ul className="space-y-0.5">
            {otherVoters.map((v) => (
              <li key={v.name} className="text-center text-xs leading-tight text-slate-400">
                {v.name} <span className="text-slate-300">({v.country})</span>
              </li>
            ))}
          </ul>
        )}
        {side(awayVoters, winner != null && winner === away, "right")}
      </div>
    );
  } else {
    // Matchup not decided yet — no Country 1/2 to align to, so group every pick
    // by the chosen country (these keep a label, since the card shows TBD).
    const byCountry = new Map<number, Voter[]>();
    for (const p of preds.players) {
      const pick = pickOf(p.id);
      if (pick == null) continue;
      if (!byCountry.has(pick)) byCountry.set(pick, []);
      byCountry.get(pick)!.push({ name: p.name, country: teamName(pick) });
    }
    const groups = [...byCountry.entries()].sort(
      (a, b) => b[1].length - a[1].length || teamName(a[0]).localeCompare(teamName(b[0]))
    );
    body =
      groups.length === 0 ? (
        <p className="text-xs text-slate-400">No picks for this match yet.</p>
      ) : (
        <div className="grid grid-cols-2 items-start gap-x-3 gap-y-2 sm:grid-cols-3">
          {groups.map(([teamId, voters]) => (
            <div key={teamId} className="min-w-0">
              <div className="mb-1 flex items-center gap-1">
                {teamFlag(teamId) && (
                  <img src={teamFlag(teamId)!} alt="" className="h-3 w-auto rounded-[2px] shrink-0" />
                )}
                <span className="truncate text-xs font-semibold text-slate-600">
                  {teamName(teamId)}
                </span>
              </div>
              <ul className="space-y-0.5">
                {voters.sort(byName).map((v) => (
                  <li key={v.name} className="text-xs leading-tight text-slate-600">
                    {v.name}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
  }

  return <div className="border-t border-slate-100 bg-slate-50/60 p-3">{body}</div>;
}

// Tournament-wide award picks, grouped per prize by the selected country/player.
// Rendered inside the standalone "Awards" dropdown below the final. These are
// the Awards-section predictions (separate from the bracket champion/bronze).
function ExtraAwards({ feed, preds }: { feed: Feed; preds: Predictions }) {
  const teamById = new Map(feed.teams.map((t) => [t.id, t]));
  const teamName = (id: number | null) =>
    (id && teamById.get(id)?.name) || null;
  const nameById = new Map(preds.players.map((p) => [p.id, p.name]));

  const prizes: { label: string; valueOf: (a: AwardRow) => string | null }[] = [
    { label: "1st place", valueOf: (a) => teamName(a.champion_team_id) },
    { label: "2nd place", valueOf: (a) => teamName(a.runnerup_team_id) },
    { label: "Top scorer", valueOf: (a) => a.top_scorer_name },
    { label: "Best player", valueOf: (a) => a.mvp_name },
    { label: "Golden glove", valueOf: (a) => a.golden_glove_name },
  ];

  const rows = prizes
    .map((prize) => {
      const byValue = new Map<string, string[]>();
      for (const a of preds.awards) {
        const v = prize.valueOf(a);
        const who = nameById.get(a.player_id);
        if (!v || !who) continue;
        if (!byValue.has(v)) byValue.set(v, []);
        byValue.get(v)!.push(who);
      }
      const groups = [...byValue.entries()].sort(
        (x, y) => y[1].length - x[1].length || x[0].localeCompare(y[0])
      );
      return { label: prize.label, groups };
    })
    .filter((r) => r.groups.length > 0);

  if (rows.length === 0) {
    return <p className="text-xs text-slate-400">No award picks submitted yet.</p>;
  }

  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
          <li key={r.label} className="text-xs">
            <span className="font-semibold text-slate-700">{r.label}</span>
            <span className="text-slate-300"> — </span>
            {r.groups.map(([value, people], i) => (
              <span key={value}>
                {i > 0 && <span className="text-slate-300"> | </span>}
                <span className="font-medium text-slate-600">{value}</span>
                <span className="text-slate-400">: {people.sort().join(", ")}</span>
              </span>
            ))}
          </li>
      ))}
    </ul>
  );
}

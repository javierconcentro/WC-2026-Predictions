"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Fixture, PoolConfig, Team } from "@/lib/types";

export default function AdminPanel({ config }: { config: PoolConfig }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/fixtures")
      .then((r) => r.json())
      .then((d) => {
        setFixtures(d.fixtures ?? []);
        setTeams(d.teams ?? []);
      });
  }, []);

  const call = async (label: string, fn: () => Promise<Response>) => {
    setBusy(true);
    setMsg(`${label}…`);
    try {
      const res = await fn();
      const body = await res.json().catch(() => ({}));
      setMsg(res.ok ? `${label}: done ${JSON.stringify(body)}` : `${label} failed: ${body.error}`);
      if (res.ok) router.refresh();
    } catch (e: any) {
      setMsg(`${label} failed: ${e.message}`);
    }
    setBusy(false);
  };

  const teamName = (id: number | null) =>
    teams.find((t) => t.id === id)?.name ?? "TBD";

  return (
    <section className="space-y-4 rounded-lg border-2 border-slate-800 bg-white p-4">
      <h3 className="text-sm font-bold uppercase tracking-wide">🔧 Admin</h3>
      {msg && <p className="break-all rounded bg-slate-100 p-2 text-xs">{msg}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          disabled={busy}
          onClick={() => call("Sync", () => fetch("/api/sync", { method: "POST" }))}
          className="rounded bg-[#101828] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Sync scores now
        </button>
        <button
          disabled={busy}
          onClick={() => call("Load squads", () => fetch("/api/admin/squads", { method: "POST" }))}
          className="rounded bg-slate-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Load squads (click until 0 remaining)
        </button>
      </div>

      <FixtureOverride fixtures={fixtures} teamName={teamName} onSubmit={call} />
      <AwardsForm onSubmit={call} />
      <ConfigForm onSubmit={call} config={config} />
    </section>
  );
}

function FixtureOverride({
  fixtures,
  teamName,
  onSubmit,
}: {
  fixtures: Fixture[];
  teamName: (id: number | null) => string;
  onSubmit: (label: string, fn: () => Promise<Response>) => void;
}) {
  const [fixtureId, setFixtureId] = useState<string>("");
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const selected = fixtures.find((f) => f.id === Number(fixtureId));

  return (
    <details className="rounded border border-slate-200 p-3">
      <summary className="cursor-pointer text-sm font-semibold">Manual result override</summary>
      <div className="mt-3 space-y-2 text-sm">
        <select
          value={fixtureId}
          onChange={(e) => setFixtureId(e.target.value)}
          className="w-full rounded border border-slate-300 px-2 py-1.5"
        >
          <option value="">— pick a fixture —</option>
          {fixtures.map((f) => (
            <option key={f.id} value={f.id}>
              {new Date(f.kickoff_utc).toLocaleDateString()} · {teamName(f.home_team_id) || f.home_team_name} vs{" "}
              {teamName(f.away_team_id) || f.away_team_name} ({f.status}
              {f.manual_override ? ", overridden" : ""})
            </option>
          ))}
        </select>
        {selected && (
          <div className="flex items-center gap-2">
            <input
              value={home}
              onChange={(e) => setHome(e.target.value)}
              placeholder="Home"
              inputMode="numeric"
              className="w-16 rounded border border-slate-300 px-2 py-1.5 text-center"
            />
            <span>–</span>
            <input
              value={away}
              onChange={(e) => setAway(e.target.value)}
              placeholder="Away"
              inputMode="numeric"
              className="w-16 rounded border border-slate-300 px-2 py-1.5 text-center"
            />
            <button
              onClick={() =>
                onSubmit("Override", () =>
                  fetch("/api/admin/fixture", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      fixture_id: selected.id,
                      home_score: Number(home),
                      away_score: Number(away),
                      status: "finished",
                      winner_team_id:
                        Number(home) > Number(away)
                          ? selected.home_team_id
                          : Number(away) > Number(home)
                            ? selected.away_team_id
                            : null,
                    }),
                  })
                )
              }
              className="rounded bg-slate-800 px-3 py-1.5 text-xs font-medium text-white"
            >
              Set final score
            </button>
            {selected.manual_override && (
              <button
                onClick={() =>
                  onSubmit("Clear override", () =>
                    fetch("/api/admin/fixture", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ fixture_id: selected.id, clear_override: true }),
                    })
                  )
                }
                className="rounded border border-slate-300 px-3 py-1.5 text-xs"
              >
                Re-enable auto-sync
              </button>
            )}
          </div>
        )}
      </div>
    </details>
  );
}

function AwardsForm({
  onSubmit,
}: {
  onSubmit: (label: string, fn: () => Promise<Response>) => void;
}) {
  const [mvp, setMvp] = useState("");
  const [glove, setGlove] = useState("");

  return (
    <details className="rounded border border-slate-200 p-3">
      <summary className="cursor-pointer text-sm font-semibold">
        Tournament awards (enter at the end)
      </summary>
      <div className="mt-3 space-y-2 text-sm">
        <input
          value={mvp}
          onChange={(e) => setMvp(e.target.value)}
          placeholder="MVP / best player name"
          className="w-full rounded border border-slate-300 px-2 py-1.5"
        />
        <input
          value={glove}
          onChange={(e) => setGlove(e.target.value)}
          placeholder="Golden glove name"
          className="w-full rounded border border-slate-300 px-2 py-1.5"
        />
        <button
          onClick={() =>
            onSubmit("Save awards", () =>
              fetch("/api/admin/actuals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...(mvp ? { mvp_name: mvp } : {}),
                  ...(glove ? { golden_glove_name: glove } : {}),
                }),
              })
            )
          }
          className="rounded bg-slate-800 px-3 py-1.5 text-xs font-medium text-white"
        >
          Save awards
        </button>
        <p className="text-xs text-slate-400">
          Names must match what players typed (case-insensitive) — check their picks first.
        </p>
      </div>
    </details>
  );
}

// ISO (UTC) -> value a <input type="datetime-local"> expects, in local time.
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ConfigForm({
  onSubmit,
  config,
}: {
  onSubmit: (label: string, fn: () => Promise<Response>) => void;
  config: PoolConfig;
}) {
  // Pre-fill with the saved values so it's obvious what's currently set.
  const [lockAt, setLockAt] = useState(toLocalInput(config.lock_part12_at));
  const [payout, setPayout] = useState(config.payout_text ?? "");

  const lockPassed = config.lock_part12_at
    ? Date.now() >= new Date(config.lock_part12_at).getTime()
    : false;

  return (
    <details className="rounded border border-slate-200 p-3">
      <summary className="cursor-pointer text-sm font-semibold">Deadlines & payout text</summary>
      <div className="mt-3 space-y-3 text-sm">
        <div className="rounded bg-slate-50 px-3 py-2 text-xs">
          <p>
            <span className="text-slate-500">Picks lock currently set to:</span>{" "}
            <span className="font-semibold">
              {config.lock_part12_at
                ? new Date(config.lock_part12_at).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "not set"}
            </span>
          </p>
          <p className="mt-0.5 text-slate-500">
            {lockPassed
              ? "🔒 Locked — predictions are final and Awards + Group Stage now count."
              : "🟢 Open — players can still edit, so Awards + Group Stage don't score yet."}
          </p>
        </div>
        <label className="block">
          <span className="text-xs text-slate-500">Parts 1+2 lock (your local time)</span>
          <input
            type="datetime-local"
            value={lockAt}
            onChange={(e) => setLockAt(e.target.value)}
            className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="block">
          <span className="text-xs text-slate-500">Payout line</span>
          <input
            value={payout}
            onChange={(e) => setPayout(e.target.value)}
            placeholder="$10 buy-in · 1st $60 / 2nd $30 / 3rd $10"
            className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        <button
          onClick={() =>
            onSubmit("Save config", () =>
              fetch("/api/admin/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...(lockAt ? { lock_part12_at: new Date(lockAt).toISOString() } : {}),
                  ...(payout ? { payout_text: payout } : {}),
                }),
              })
            )
          }
          className="rounded bg-slate-800 px-3 py-1.5 text-xs font-medium text-white"
        >
          Save config
        </button>
      </div>
    </details>
  );
}

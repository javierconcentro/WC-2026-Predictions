"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminUnlock from "./AdminUnlock";

export default function JoinGate() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [existing, setExisting] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/players")
      .then((r) => r.json())
      .then((d) => setExisting(d.names ?? []))
      .catch(() => {});
  }, []);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    if (res.ok) {
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
    }
  };

  return (
    <div className="mx-auto max-w-sm">
    <form onSubmit={join} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-bold">Join the pool</h2>
        <p className="text-sm text-slate-500">
          Enter your name to join. Your picks save automatically and you can change
          them any time until the deadline.
        </p>
      </div>
      {existing.length > 0 && (
        <div className="text-sm">
          <span className="font-medium">Already joined? Tap your name:</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {existing.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setName(n)}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${
                  name === n
                    ? "border-[#101828] bg-[#e7eaf8] text-[#101828]"
                    : "border-slate-300 text-slate-600 hover:border-slate-400"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
      <label className="block text-sm">
        <span className="font-medium">{existing.length > 0 ? "Or enter a new name" : "Your name"}</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          placeholder="e.g. Javier"
          required
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        disabled={busy}
        className="w-full rounded-lg bg-[#101828] py-2.5 font-semibold text-white hover:bg-[#1d2939] disabled:opacity-50"
      >
        {busy ? "Joining…" : "Join"}
      </button>
    </form>
      <AdminUnlock />
    </div>
  );
}

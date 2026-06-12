"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinGate() {
  const [name, setName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, passcode }),
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
    <form onSubmit={join} className="mx-auto max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-6">
      <div>
        <h2 className="text-lg font-bold">Join the pool</h2>
        <p className="text-sm text-slate-500">
          Enter your name and the office passcode. Your picks save automatically and you can change
          them any time until the deadline.
        </p>
      </div>
      <label className="block text-sm">
        <span className="font-medium">Your name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          placeholder="e.g. Javier"
          required
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium">Passcode</span>
        <input
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          required
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        disabled={busy}
        className="w-full rounded bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {busy ? "Joining…" : "Join"}
      </button>
    </form>
  );
}

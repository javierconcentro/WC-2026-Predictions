"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminUnlock() {
  const [open, setOpen] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      setError("Wrong passcode.");
    }
  };

  if (!open) {
    return (
      <p className="pt-6 text-center">
        <button onClick={() => setOpen(true)} className="text-xs text-slate-300 hover:text-slate-500">
          admin
        </button>
      </p>
    );
  }

  return (
    <form onSubmit={unlock} className="mx-auto flex max-w-xs items-center gap-2 pt-6">
      <input
        type="password"
        value={passcode}
        onChange={(e) => setPasscode(e.target.value)}
        placeholder="Admin passcode"
        className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm"
        autoFocus
      />
      <button className="rounded bg-slate-800 px-3 py-1.5 text-sm font-medium text-white">
        Unlock
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}

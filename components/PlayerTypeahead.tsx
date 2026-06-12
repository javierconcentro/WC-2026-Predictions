"use client";

import { useEffect, useRef, useState } from "react";

interface Suggestion {
  provider_id: number;
  name: string;
  position: string | null;
}

// Typeahead against squad_players; degrades to plain free-text entry if no
// squads are loaded (spec §11).
export default function PlayerTypeahead({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (name: string, providerId: number | null) => void;
}) {
  const [text, setText] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setText(value), [value]);

  const search = (q: string) => {
    setText(q);
    onChange(q, null); // free text until a suggestion is chosen
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/squad-search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const { players } = await res.json();
        setSuggestions(players);
        setOpen(true);
      }
    }, 250);
  };

  return (
    <label className="relative block text-sm">
      <span className="font-medium">{label}</span>
      <input
        value={text}
        disabled={disabled}
        onChange={(e) => search(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder="Type a player name…"
        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 disabled:bg-slate-100"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded border border-slate-200 bg-white shadow-lg">
          {suggestions.map((s) => (
            <li key={s.provider_id}>
              <button
                type="button"
                onMouseDown={() => {
                  setText(s.name);
                  onChange(s.name, s.provider_id);
                  setOpen(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-emerald-50"
              >
                {s.name}
                {s.position && <span className="ml-2 text-xs text-slate-400">{s.position}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </label>
  );
}

"use client";

import { useMemo, useState } from "react";

interface Props {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (name: string) => void;
  featured: string[];
  rest: string[];
}

export default function PlayerPicker({ label, value, disabled, onChange, featured, rest }: Props) {
  const [search, setSearch] = useState("");

  const featuredSet = useMemo(() => new Set(featured.map((n) => n.toLowerCase())), [featured]);
  const dedupedRest = useMemo(
    () => rest.filter((n) => !featuredSet.has(n.toLowerCase())),
    [rest, featuredSet],
  );

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return [...featured, ...dedupedRest].filter((n) => n.toLowerCase().includes(q));
  }, [search, featured, dedupedRest]);

  if (disabled) {
    return (
      <div className="text-sm">
        <span className="font-medium">{label}</span>
        <p className="mt-1 text-slate-600">{value || "—"}</p>
      </div>
    );
  }

  return (
    <div className="text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium">{label}</span>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs text-slate-400 hover:text-red-500"
          >
            clear
          </button>
        )}
      </div>

      {value && (
        <p className="mt-1 text-xs text-slate-500">
          Selected:{" "}
          <span className="font-semibold text-[#101828]">{value}</span>
        </p>
      )}

      <div className="mt-1.5 rounded-lg border border-slate-200 p-3 space-y-2.5">
        <input
          type="text"
          placeholder="Search players…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#101828]"
        />

        {searchResults ? (
          <div className="max-h-48 overflow-y-auto">
            {searchResults.length === 0 ? (
              <p className="text-xs text-slate-400 py-1">No players found.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {searchResults.map((n) => (
                  <Chip key={n} name={n} selected={value === n} onSelect={() => { onChange(n); setSearch(""); }} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div>
              <p className="text-xs font-medium text-slate-400 mb-1.5">Top picks</p>
              <div className="flex flex-wrap gap-1.5">
                {featured.map((n) => (
                  <Chip key={n} name={n} selected={value === n} onSelect={() => onChange(n)} />
                ))}
              </div>
            </div>
            {dedupedRest.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-400 mb-1.5">All other players</p>
                <div className="max-h-44 overflow-y-auto flex flex-wrap gap-1">
                  {dedupedRest.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => onChange(n)}
                      className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
                        value === n
                          ? "border-[#101828] bg-[#101828] text-white"
                          : "border-slate-200 text-slate-500 hover:border-slate-400"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Chip({ name, selected, onSelect }: { name: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
        selected
          ? "border-[#101828] bg-[#101828] text-white"
          : "border-slate-300 text-slate-600 hover:border-[#101828]"
      }`}
    >
      {name}
    </button>
  );
}

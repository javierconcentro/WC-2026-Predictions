"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (name: string) => void;
  featured: string[];
  rest: string[];
}

export default function PlayerPicker({ label, value, disabled, onChange, featured, rest }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 40);
  }, [open]);

  const featuredSet = useMemo(() => new Set(featured.map((n) => n.toLowerCase())), [featured]);
  const dedupedRest = useMemo(
    () => rest.filter((n) => !featuredSet.has(n.toLowerCase())),
    [rest, featuredSet],
  );

  const q = search.trim().toLowerCase();
  const showFeatured = q ? featured.filter((n) => n.toLowerCase().includes(q)) : featured;
  const showRest = q ? dedupedRest.filter((n) => n.toLowerCase().includes(q)) : dedupedRest;

  const select = (name: string) => {
    onChange(name);
    setOpen(false);
    setSearch("");
  };

  if (disabled) {
    return (
      <>
        {label && <span className="block mb-1 text-sm font-medium">{label}</span>}
        <div className="w-full rounded border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600">
          {value || "—"}
        </div>
      </>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {label && <span className="block mb-1 text-sm font-medium">{label}</span>}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-left flex items-center justify-between hover:border-slate-400 focus:outline-none focus:border-[#101828]"
      >
        <span className={value ? "text-[#101828]" : "text-slate-400"}>
          {value || "— pick a player —"}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input
              ref={searchRef}
              type="text"
              placeholder="Search players…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:border-[#101828]"
            />
          </div>

          <div className="max-h-60 overflow-y-auto">
            {showFeatured.length === 0 && showRest.length === 0 && (
              <p className="px-3 py-3 text-sm text-slate-400">No players found.</p>
            )}

            {showFeatured.length > 0 && (
              <>
                {!q && (
                  <p className="px-3 pt-2 pb-0.5 text-xs font-semibold uppercase tracking-wide text-slate-400 select-none">
                    Top picks
                  </p>
                )}
                {showFeatured.map((n) => (
                  <button
                    key={n} type="button" onClick={() => select(n)}
                    className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-[#e7eaf8] ${
                      value === n ? "font-semibold text-[#101828] bg-[#e7eaf8]/60" : ""
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </>
            )}

            {showRest.length > 0 && (
              <>
                {!q && showFeatured.length > 0 && <div className="border-t border-slate-100 my-1" />}
                {showRest.map((n) => (
                  <button
                    key={n} type="button" onClick={() => select(n)}
                    className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-[#e7eaf8] ${
                      value === n ? "font-semibold text-[#101828] bg-[#e7eaf8]/60" : ""
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </>
            )}
          </div>

          {value && (
            <div className="border-t border-slate-100 p-2">
              <button type="button" onClick={() => select("")} className="text-xs text-slate-400 hover:text-red-500">
                Clear selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

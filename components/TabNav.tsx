"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Leaderboard" },
  { href: "/live", label: "Live Games" },
  { href: "/picks", label: "My Picks" },
];

export default function TabNav() {
  const pathname = usePathname();
  return (
    <nav className="mx-auto flex max-w-3xl px-2">
      {TABS.map((tab) => {
        const active =
          tab.href === "/" ? pathname === "/" || pathname.startsWith("/player") : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 border-b-2 px-2 py-2.5 text-center text-sm font-medium transition-colors ${
              active
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

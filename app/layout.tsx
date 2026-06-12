import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import TabNav from "@/components/TabNav";
import Logo from "@/components/Logo";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Concentro WC 2026",
  description: "Concentro World Cup 2026 prediction pool",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${jakarta.className} min-h-screen antialiased`}>
        <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Logo />
              <span className="text-xl font-bold lowercase tracking-tight text-[#101828]">
                concentro
              </span>
            </div>
            <span className="rounded-full bg-[#101828] px-3 py-1 text-xs font-semibold text-white">
              ⚽ WC 2026
            </span>
          </div>
          <TabNav />
        </header>
        <main className="mx-auto max-w-3xl px-4 pb-24 pt-4">{children}</main>
      </body>
    </html>
  );
}

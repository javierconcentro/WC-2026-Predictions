import type { Metadata, Viewport } from "next";
import "./globals.css";
import TabNav from "@/components/TabNav";

export const metadata: Metadata = {
  title: "WC 2026 Office Pool",
  description: "World Cup 2026 office prediction pool",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <h1 className="text-lg font-bold tracking-tight">
              ⚽ WC 2026 <span className="text-emerald-600">Office Pool</span>
            </h1>
          </div>
          <TabNav />
        </header>
        <main className="mx-auto max-w-3xl px-4 pb-24 pt-4">{children}</main>
      </body>
    </html>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

// A one-off login celebration: fireworks + a brief "<winner> won" banner
// overlaying the page. Shows once per browser session (so it doesn't replay on
// every tab switch), auto-dismisses after a few seconds, and never blocks clicks.
export default function WinnerCelebration({ winner }: { winner: string }) {
  const [show, setShow] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `celebrated:${winner}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    setShow(true);
    const t = setTimeout(() => setShow(false), 7000);
    return () => clearTimeout(t);
  }, [winner]);

  useEffect(() => {
    if (!show) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const colors = ["#fbbf24", "#f472b6", "#60a5fa", "#34d399", "#f87171", "#a78bfa", "#fde047"];
    type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number };
    let particles: P[] = [];
    const burst = (x: number, y: number) => {
      const n = 60 + Math.floor(Math.random() * 30);
      const color = colors[Math.floor(Math.random() * colors.length)];
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n + Math.random() * 0.3;
        const sp = 2 + Math.random() * 4;
        particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 55 + Math.random() * 35, color, size: 2 + Math.random() * 2 });
      }
    };

    let raf = 0;
    let frame = 0;
    let spawning = true;
    const W = () => window.innerWidth;
    const H = () => window.innerHeight;
    const loop = () => {
      frame++;
      ctx.clearRect(0, 0, W(), H());
      if (spawning && frame % 20 === 0) {
        burst(W() * (0.15 + Math.random() * 0.7), H() * (0.12 + Math.random() * 0.35));
      }
      particles = particles.filter((p) => p.life < p.max);
      for (const p of particles) {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.04; // gravity
        p.vx *= 0.99;
        p.vy *= 0.99;
        ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };
    burst(W() * 0.3, H() * 0.3);
    burst(W() * 0.7, H() * 0.25);
    loop();
    const stop = setTimeout(() => {
      spawning = false;
    }, 5000);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(stop);
      window.removeEventListener("resize", resize);
    };
  }, [show]);

  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="winner-pop absolute left-1/2 top-16 sm:top-24">
        <div className="rounded-2xl bg-[#101828]/90 px-6 py-3 text-center shadow-2xl ring-2 ring-amber-400 backdrop-blur">
          <p className="text-2xl font-extrabold text-white sm:text-3xl">🏆 {winner} won! 🎉</p>
        </div>
      </div>
    </div>
  );
}

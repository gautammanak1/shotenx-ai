"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "./theme-provider";

export function GridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const CELL = 48;
    let raf: number;
    let startTime: number | null = null;
    const DRAW_DURATION = 1800;

    const isDark = theme === "dark";
    const lineColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
    const pulseColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
    const glowColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";

    type PulseCell = { col: number; row: number; born: number; dur: number };
    const pulses: PulseCell[] = [];
    let lastPulse = 0;

    function resize() {
      canvas!.width  = canvas!.offsetWidth;
      canvas!.height = canvas!.offsetHeight;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function spawnPulse(now: number) {
      const cols = Math.floor(canvas!.width  / CELL);
      const rows = Math.floor(canvas!.height / CELL);
      pulses.push({
        col:  Math.floor(Math.random() * cols),
        row:  Math.floor(Math.random() * rows),
        born: now,
        dur:  900 + Math.random() * 600,
      });
      if (pulses.length > 12) pulses.shift();
    }

    function draw(ts: number) {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      const W = canvas!.width;
      const H = canvas!.height;

      ctx!.clearRect(0, 0, W, H);

      const cols = Math.floor(W / CELL);
      const rows = Math.floor(H / CELL);
      const totalLines = cols + 1 + rows + 1;
      const progress = Math.min(elapsed / DRAW_DURATION, 1);
      const linesDrawn = Math.floor(progress * totalLines);

      ctx!.strokeStyle = lineColor;
      ctx!.lineWidth = 1;

      for (let c = 0; c <= cols; c++) {
        if (c > linesDrawn) break;
        const lp = Math.min(linesDrawn - c, 1);
        ctx!.beginPath();
        ctx!.moveTo(c * CELL, 0);
        ctx!.lineTo(c * CELL, H * lp);
        ctx!.stroke();
      }
      for (let r = 0; r <= rows; r++) {
        const idx = cols + 1 + r;
        if (idx > linesDrawn) break;
        const lp = Math.min(linesDrawn - idx, 1);
        ctx!.beginPath();
        ctx!.moveTo(0, r * CELL);
        ctx!.lineTo(W * lp, r * CELL);
        ctx!.stroke();
      }

      if (progress > 0.6 && ts - lastPulse > 280) {
        spawnPulse(ts);
        lastPulse = ts;
      }

      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        const age = ts - p.born;
        if (age > p.dur) { pulses.splice(i, 1); continue; }
        const t = age / p.dur;
        const alpha = t < 0.5 ? t * 2 : (1 - t) * 2;
        ctx!.fillStyle = pulseColor.replace(/[\d.]+\)$/, `${alpha * (isDark ? 0.12 : 0.1)})`);
        ctx!.fillRect(p.col * CELL + 1, p.row * CELL + 1, CELL - 1, CELL - 1);
        ctx!.beginPath();
        ctx!.arc(p.col * CELL, p.row * CELL, 2.5, 0, Math.PI * 2);
        ctx!.fillStyle = glowColor.replace(/[\d.]+\)$/, `${alpha * 0.9})`);
        ctx!.fill();
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{
        maskImage: "radial-gradient(ellipse 85% 70% at 50% 0%, black 20%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 85% 70% at 50% 0%, black 20%, transparent 100%)",
      }}
    />
  );
}

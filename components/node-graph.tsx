"use client";

import { useEffect, useRef } from "react";

export type GraphNode = { id: string; label: string; x: number; y: number; weight: number };

type Props = {
  nodes: GraphNode[];
  className?: string;
};

/** Lightweight canvas graph — monochrome only */
export function NodeGraph({ nodes, className = "" }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || nodes.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const maxW = Math.max(...nodes.map((n) => n.weight), 1);
    const pos = nodes.map((n, i) => {
      if (Number.isFinite(n.x) && Number.isFinite(n.y) && (n.x !== 0 || n.y !== 0)) {
        return { x: (n.x / 100) * (w - 40) + 20, y: (n.y / 100) * (h - 40) + 20 };
      }
      const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
      return { x: w / 2 + Math.cos(angle) * (w * 0.28), y: h / 2 + Math.sin(angle) * (h * 0.28) };
    });
    const cx = (i: number) => pos[i].x;
    const cy = (i: number) => pos[i].y;
    const r = (i: number) => 8 + (nodes[i].weight / maxW) * 18;

    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        ctx.strokeStyle = "#333333";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx(i), cy(i));
        ctx.lineTo(cx(j), cy(j));
        ctx.stroke();
      }
    }

    nodes.forEach((n, i) => {
      const x = cx(i);
      const y = cy(i);
      const rad = r(i);
      ctx.beginPath();
      ctx.fillStyle = "#111111";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = "9px JetBrains Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText(n.label.slice(0, 12), x, y + rad + 12);
    });
  }, [nodes]);

  return (
    <canvas
      ref={ref}
      className={`h-[220px] w-full border border-[#1a1a1a] bg-[#0a0a0a] ${className}`}
      aria-label="Agent network graph"
    />
  );
}

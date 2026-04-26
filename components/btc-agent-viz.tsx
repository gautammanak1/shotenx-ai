"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type AgentVizState = "idle" | "requesting" | "invoicing" | "paying" | "settled";

type Props = {
  state: AgentVizState;
  className?: string;
};

export function BtcAgentViz({ state, className = "" }: Props) {
  const [dash, setDash] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const tick = () => {
      setDash((d) => (d - 1) % 36);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  const pathBright = state === "paying" || state === "settled" ? "#ffffff" : "#444444";
  const pathWidth = state === "paying" || state === "settled" ? 1.2 : 0.5;
  const boltScale = state === "invoicing" || state === "paying" ? 1.08 : 1;

  const pulseA = state === "requesting" || state === "paying" ? 1.15 : 1;
  const pulseB = state === "settled" ? 1.12 : 1;

  return (
    <div className={`w-full bg-[#0a0a0a] ${className}`}>
      <svg viewBox="0 0 600 200" className="mx-auto h-auto w-full max-w-3xl" aria-hidden>
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* path A → center */}
        <line
          x1="120"
          y1="100"
          x2="268"
          y2="100"
          stroke={pathBright}
          strokeWidth={pathWidth}
          strokeDasharray="4 8"
          strokeDashoffset={dash}
        />
        {/* center → B */}
        <line
          x1="332"
          y1="100"
          x2="480"
          y2="100"
          stroke={pathBright}
          strokeWidth={pathWidth}
          strokeDasharray="4 8"
          strokeDashoffset={dash}
        />

        {/* Agent A */}
        <g transform={`translate(88,100) scale(${pulseA})`} style={{ transformOrigin: "88px 100px" }}>
          <circle r="34" fill="#111111" stroke="#ffffff" strokeWidth="1" />
          <circle r="20" fill="#000000" stroke="#333333" strokeWidth="0.5" />
          <text x="0" y="-44" textAnchor="middle" fill="#555555" fontSize="9" fontFamily="monospace" letterSpacing="0.2em">
            BUYER
          </text>
          <text x="0" y="52" textAnchor="middle" fill="#888888" fontSize="8" fontFamily="monospace">
            03a1..f8
          </text>
        </g>

        {/* Lightning */}
        <g transform="translate(300,100)">
          <circle r="22" fill="#0a0a0a" stroke="#333333" strokeWidth="1" />
          <g transform={`scale(${boltScale})`} style={{ transformOrigin: "300px 100px" }}>
            <path
              d="M-6 -14 L2 -2 L-2 -2 L6 14 L-2 2 L2 2 L-6 -14 Z"
              fill="#ffffff"
              filter={state === "invoicing" || state === "paying" ? "url(#glow)" : undefined}
            />
          </g>
        </g>

        {/* Agent B */}
        <g transform={`translate(512,100) scale(${pulseB})`} style={{ transformOrigin: "512px 100px" }}>
          <circle r="34" fill="#111111" stroke="#ffffff" strokeWidth="1" />
          <circle r="20" fill="#000000" stroke="#333333" strokeWidth="0.5" />
          <text x="0" y="-44" textAnchor="middle" fill="#555555" fontSize="9" fontFamily="monospace" letterSpacing="0.2em">
            PROVIDER
          </text>
          <text x="0" y="52" textAnchor="middle" fill="#888888" fontSize="8" fontFamily="monospace">
            02c4..9a
          </text>
        </g>

        {state === "settled" && (
          <text x="300" y="170" textAnchor="middle" fill="#ffffff" fontSize="11" fontFamily="monospace">
            ✓ settled
          </text>
        )}
      </svg>
    </div>
  );
}

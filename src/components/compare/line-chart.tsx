"use client";

import { useState } from "react";
import { niceTicks } from "@/lib/format";
import { YEARS } from "@/lib/stats";

export type Line = { key: string; label: string; color: string; values: number[] };

/** Wins per year for 2-3 groups: 2px lines, ringed markers, end labels, shared hover/focus tooltip. */
export function LineChart({ lines, partialYear }: { lines: Line[]; partialYear: number }) {
  const [active, setActive] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const W = 680;
  const H = 280;
  const m = { top: 20, right: 96, bottom: 28, left: 34 };
  const ticks = niceTicks(Math.max(1, ...lines.flatMap((l) => l.values)));
  const max = ticks[ticks.length - 1];
  const x = (i: number) => m.left + (i / (YEARS.length - 1)) * (W - m.left - m.right);
  const y = (v: number) => H - m.bottom - (v / max) * (H - m.top - m.bottom);
  const band = (W - m.left - m.right) / (YEARS.length - 1);

  // End labels: keep at least 14px apart so names never overlap.
  const ends = lines
    .map((l) => ({ key: l.key, label: l.label, y: y(l.values[l.values.length - 1]) }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) ends[i].y = Math.max(ends[i].y, ends[i - 1].y + 14);

  return (
    <div className="relative max-w-4xl">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="group" aria-label="Wins per year by group">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.left} x2={W - m.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--axis)" : "var(--grid)"} />
            <text x={m.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--ink-3)">
              {t}
            </text>
          </g>
        ))}
        {YEARS.map((yr, i) => (
          <text key={yr} x={x(i)} y={H - m.bottom + 18} textAnchor="middle" fontSize={11} fill="var(--ink-3)">
            {yr}
            {yr === partialYear ? "*" : ""}
          </text>
        ))}
        {active !== null && <line x1={x(active)} x2={x(active)} y1={m.top} y2={H - m.bottom} stroke="var(--axis)" />}
        {lines.map((l) => (
          <g key={l.key}>
            <polyline
              points={l.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
              fill="none"
              stroke={l.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {l.values.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r={4} fill={l.color} stroke="var(--bg)" strokeWidth={2} />
            ))}
          </g>
        ))}
        {ends.map((e) => (
          <text key={e.key} x={W - m.right + 10} y={e.y} dy="0.32em" fontSize={12} fontWeight={600} fill="var(--ink)">
            {e.label.length > 12 ? e.label.slice(0, 11) + "…" : e.label}
          </text>
        ))}
        {YEARS.map((yr, i) => (
          <rect
            key={yr}
            x={x(i) - band / 2}
            y={m.top}
            width={band}
            height={H - m.top - m.bottom}
            fill="transparent"
            stroke={focused === i ? "var(--focus)" : "none"}
            strokeWidth={2}
            rx={4}
            tabIndex={0}
            role="img"
            aria-label={`${yr}: ${lines.map((l) => `${l.label} ${l.values[i]}`).join(", ")}`}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => {
              setActive(i);
              setFocused(i);
            }}
            onBlur={() => {
              setActive(null);
              setFocused(null);
            }}
            // SVG rects do not paint CSS outlines reliably; the stroke above is the focus ring.
            className="outline-none"
          />
        ))}
      </svg>
      {active !== null && (
        <div
          role="status"
          className="pointer-events-none absolute top-0 z-10 w-48 rounded-md border border-line bg-surface p-3 text-xs shadow-lg"
          style={{ left: `clamp(0px, calc(${(x(active) / W) * 100}% - 6rem), calc(100% - 12rem))` }}
        >
          <p className="mb-1.5 font-semibold">
            {YEARS[active]}
            {YEARS[active] === partialYear && <span className="font-normal text-ink-3"> · partial year</span>}
          </p>
          <ul className="space-y-1">
            {[...lines]
              .sort((a, b) => b.values[active] - a.values[active])
              .map((l) => (
                <li key={l.key} className="flex items-center justify-between gap-3 text-ink-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span aria-hidden className="inline-block size-2 shrink-0 rounded-full" style={{ background: l.color }} />
                    <span className="truncate">{l.label}</span>
                  </span>
                  <span className="tabular font-medium text-ink">{l.values[active]}</span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

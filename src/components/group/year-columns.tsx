"use client";

import { useState } from "react";
import { niceTicks } from "@/lib/format";
import { BUCKETS, BUCKET_LABEL, YEARS, type YearCounts } from "@/lib/stats";

const COLOR = {
  domestic: "var(--series-domestic)",
  musicShows: "var(--series-music)",
  international: "var(--series-intl)",
} as const;

/**
 * Stacked columns per year (Korean awards, music shows, international) with a hover/focus
 * tooltip per year and a table view for screen readers and anyone who prefers numbers.
 */
export function YearColumns({ byYear, partialYear }: { byYear: Record<number, YearCounts>; partialYear: number }) {
  const [active, setActive] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const W = 640;
  const H = 260;
  const m = { top: 24, right: 8, bottom: 28, left: 32 };
  const ticks = niceTicks(Math.max(1, ...YEARS.map((y) => byYear[y]?.total ?? 0)));
  const max = ticks[ticks.length - 1];
  const band = (W - m.left - m.right) / YEARS.length;
  const barW = Math.min(24, band * 0.5);
  const y = (v: number) => H - m.bottom - (v / max) * (H - m.top - m.bottom);
  const GAP = 2;

  const legend = (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
      {BUCKETS.map((b) => (
        <li key={b} className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2 w-3.5 rounded-[2px]" style={{ background: COLOR[b] }} />
          {BUCKET_LABEL[b]}
        </li>
      ))}
    </ul>
  );

  return (
    <figure>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        {legend}
        <button
          type="button"
          onClick={() => setAsTable((v) => !v)}
          aria-pressed={asTable}
          className="h-9 rounded-md border border-control px-3 text-xs font-medium text-ink-2 hover:border-ink hover:text-ink"
        >
          {asTable ? "Show chart" : "Show as table"}
        </button>
      </div>

      {asTable ? (
        <table className="tabular w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-3">
              <th className="py-2 font-medium">Year</th>
              {BUCKETS.map((b) => (
                <th key={b} className="py-2 text-right font-medium">
                  {BUCKET_LABEL[b]}
                </th>
              ))}
              <th className="py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {YEARS.map((yr) => (
              <tr key={yr} className="border-b border-line">
                <th scope="row" className="py-2 text-left font-medium">
                  {yr}
                  {yr === partialYear && <span className="text-ink-3"> (partial)</span>}
                </th>
                {BUCKETS.map((b) => (
                  <td key={b} className="py-2 text-right">
                    {byYear[yr]?.[b] ?? 0}
                  </td>
                ))}
                <td className="py-2 text-right font-semibold">{byYear[yr]?.total ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="group" aria-label="Wins per year, stacked by type">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={m.left} x2={W - m.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--axis)" : "var(--grid)"} strokeWidth={1} />
                <text x={m.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--ink-3)" className="tabular">
                  {t}
                </text>
              </g>
            ))}
            {YEARS.map((yr, i) => {
              const c = byYear[yr] ?? { domestic: 0, musicShows: 0, international: 0, total: 0 };
              const cx = m.left + band * i + band / 2;
              let base = H - m.bottom;
              const parts = BUCKETS.map((b) => ({ b, v: c[b] })).filter((p) => p.v > 0);
              const label = `${yr}${yr === partialYear ? " (partial year)" : ""}: ${c.total} wins. ${BUCKETS.map((b) => `${BUCKET_LABEL[b]} ${c[b]}`).join(", ")}`;
              return (
                <g
                  key={yr}
                  tabIndex={0}
                  role="img"
                  aria-label={label}
                  onMouseEnter={() => setActive(yr)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => {
                    setActive(yr);
                    setFocused(yr);
                  }}
                  onBlur={() => {
                    setActive(null);
                    setFocused(null);
                  }}
                  // SVG groups do not paint CSS outlines reliably; the band rect below draws the focus ring.
                  className="outline-none"
                >
                  <rect
                    x={cx - band / 2 + 1}
                    y={m.top - 18}
                    width={band - 2}
                    height={H - m.top - m.bottom + 17}
                    fill={active === yr ? "var(--surface-2)" : "transparent"}
                    stroke={focused === yr ? "var(--focus)" : "none"}
                    strokeWidth={2}
                    rx={4}
                  />
                  {parts.map((p, k) => {
                    const h = Math.max(1, (p.v / max) * (H - m.top - m.bottom) - (k < parts.length - 1 ? GAP : 0));
                    const top = base - h;
                    const isTop = k === parts.length - 1;
                    base = top - (isTop ? 0 : GAP);
                    return isTop ? (
                      <path
                        key={p.b}
                        d={`M${cx - barW / 2},${top + h} V${top + Math.min(4, h)} Q${cx - barW / 2},${top} ${cx - barW / 2 + Math.min(4, h)},${top} H${cx + barW / 2 - Math.min(4, h)} Q${cx + barW / 2},${top} ${cx + barW / 2},${top + Math.min(4, h)} V${top + h} Z`}
                        fill={COLOR[p.b]}
                      />
                    ) : (
                      <rect key={p.b} x={cx - barW / 2} y={top} width={barW} height={h} fill={COLOR[p.b]} />
                    );
                  })}
                  {c.total > 0 && (
                    <text x={cx} y={y(c.total) - 6} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--ink)" className="tabular">
                      {c.total}
                    </text>
                  )}
                  <text x={cx} y={H - m.bottom + 18} textAnchor="middle" fontSize={11} fill="var(--ink-3)" className="tabular">
                    {yr}
                    {yr === partialYear ? "*" : ""}
                  </text>
                </g>
              );
            })}
          </svg>
          {active !== null && (
            <div
              role="status"
              className="pointer-events-none absolute top-0 z-10 w-48 rounded-md border border-line bg-surface p-3 text-xs shadow-lg"
              style={{ left: `clamp(0px, calc(${((YEARS.indexOf(active) + 0.5) / YEARS.length) * 100}% - 6rem), calc(100% - 12rem))` }}
            >
              <p className="mb-1.5 font-semibold text-ink">
                {active}
                {active === partialYear && <span className="font-normal text-ink-3"> · partial year</span>}
              </p>
              <ul className="space-y-1">
                {[...BUCKETS].reverse().map((b) => (
                  <li key={b} className="flex items-center justify-between gap-3 text-ink-2">
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden className="inline-block size-2 rounded-[2px]" style={{ background: COLOR[b] }} />
                      {BUCKET_LABEL[b]}
                    </span>
                    <span className="tabular font-medium text-ink">{byYear[active]?.[b] ?? 0}</span>
                  </li>
                ))}
              </ul>
              <p className="tabular mt-1.5 flex justify-between border-t border-line pt-1.5 font-semibold text-ink">
                <span>Total</span>
                <span>{byYear[active]?.total ?? 0}</span>
              </p>
            </div>
          )}
          <p className="mt-1 text-xs text-ink-3">* {partialYear} runs through mid-October.</p>
        </div>
      )}
    </figure>
  );
}

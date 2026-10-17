"use client";

import Link from "next/link";
import { YEARS, type Filter } from "@/lib/stats";
import type { GroupStats } from "./compute";

/** Seven steps of one blue ramp; 0 wins keeps the neutral step-0 cell. */
function step(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0;
  return Math.min(7, Math.max(1, Math.ceil((value / max) * 7)));
}

export function YearHeatmap({ rows, filter }: { rows: GroupStats[]; filter: Filter }) {
  const years = YEARS.filter((y) => y >= filter.from && y <= filter.to);
  const yi = years.map((y) => y - YEARS[0]);
  const max = Math.max(1, ...rows.flatMap((r) => yi.map((i) => r.byYear[i])));
  if (!rows.length) return null;

  return (
    <div className="overflow-x-auto rail">
      <table className="w-full min-w-[22rem] border-separate border-spacing-[2px] text-sm">
        <caption className="sr-only">Wins per group per year, {filter.from} to {filter.to}</caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-[1] w-28 bg-bg pb-1 text-left text-xs font-medium text-ink-3 sm:w-44">
              Group
            </th>
            {years.map((y) => (
              <th key={y} scope="col" className="tabular pb-1 text-center text-xs font-medium text-ink-3">
                {y}
                {y === YEARS[YEARS.length - 1] && <span className="sr-only"> (partial year)</span>}
                {y === YEARS[YEARS.length - 1] && <span aria-hidden>*</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.group.slug}>
              <th scope="row" className="sticky left-0 z-[1] max-w-28 truncate bg-bg pr-2 text-left font-medium sm:max-w-44">
                <Link href={`/groups/${r.group.slug}/`} className="block truncate underline-offset-4 hover:underline">
                  {r.group.name}
                </Link>
              </th>
              {yi.map((i, k) => {
                const v = r.byYear[i];
                const s = step(v, max);
                return (
                  <td
                    key={years[k]}
                    title={`${r.group.name}, ${years[k]}: ${v} ${v === 1 ? "win" : "wins"}`}
                    className="tabular h-9 min-w-10 rounded-[3px] text-center text-xs font-medium"
                    style={{
                      background: `var(--heat-${s})`,
                      color: s >= 5 ? "var(--heat-ink-high)" : s === 0 ? "var(--ink-3)" : "var(--heat-ink-low)",
                    }}
                  >
                    {v}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {years.includes(YEARS[YEARS.length - 1]) && (
        <p className="mt-2 text-xs text-ink-3">* {YEARS[YEARS.length - 1]} counts run through mid-October.</p>
      )}
    </div>
  );
}

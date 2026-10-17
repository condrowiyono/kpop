import type { Filter } from "@/lib/stats";

type Parts = { koreanAwards: number; musicShows: number; international: number; total: number };

export const SERIES = [
  { key: "koreanAwards", label: "Korean awards", color: "var(--series-domestic)" },
  { key: "musicShows", label: "Music shows", color: "var(--series-music)" },
  { key: "international", label: "International", color: "var(--series-intl)" },
] as const;

/** Which series the current filter can produce, so legends never list an empty series. */
export function activeSeries(filter: Pick<Filter, "scope" | "musicShows">) {
  return SERIES.filter((s) => {
    if (s.key === "musicShows") return filter.musicShows && filter.scope !== "international";
    if (s.key === "koreanAwards") return filter.scope !== "international";
    return filter.scope !== "domestic";
  });
}

export function SeriesLegend({ filter }: { filter: Pick<Filter, "scope" | "musicShows"> }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2" aria-label="Legend">
      {activeSeries(filter).map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2 w-3.5 rounded-[2px]" style={{ background: s.color }} />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

/**
 * One horizontal stacked bar: Korean awards, music shows, international, scaled to `max`.
 * Segments are separated by a 2px surface gap; only the far end is rounded.
 */
export function SplitBar({ stats, max, height = 8 }: { stats: Parts; max: number; height?: number }) {
  const width = max > 0 ? (stats.total / max) * 100 : 0;
  const parts = SERIES.map((s) => ({ ...s, value: stats[s.key] })).filter((p) => p.value > 0);
  const label = `${stats.koreanAwards} Korean awards, ${stats.musicShows} music show wins, ${stats.international} international`;
  return (
    <span role="img" aria-label={label} className="block w-full">
      <span className="flex gap-[2px] overflow-hidden rounded-r-[4px]" style={{ width: `${Math.max(width, stats.total ? 2 : 0)}%`, height }}>
        {parts.map((p) => (
          <span key={p.key} className="block h-full" style={{ flexGrow: p.value, flexBasis: 0, background: p.color, minWidth: 2 }} />
        ))}
      </span>
    </span>
  );
}

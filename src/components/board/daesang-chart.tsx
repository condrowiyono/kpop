"use client";

import Link from "next/link";
import type { GroupStats } from "./compute";

/** Groups with at least one daesang in the current filter, as a ranked bar list. */
export function DaesangChart({ rows }: { rows: GroupStats[] }) {
  const club = rows.filter((r) => r.daesang > 0).sort((a, b) => b.daesang - a.daesang || b.total - a.total);
  if (!club.length) {
    return (
      <p className="rounded-lg border border-dashed border-control px-5 py-8 text-sm text-ink-2">
        No daesang in this selection. Daesang are only given at Korean ceremonies, so the International filter and
        the music-show-only views never contain one.
      </p>
    );
  }
  const max = club[0].daesang;
  return (
    <ol className="space-y-1">
      {club.map((r) => (
        <li key={r.group.slug}>
          <Link
            href={`/groups/${r.group.slug}/`}
            className="grid grid-cols-[2.25rem_minmax(5.5rem,9rem)_1fr] items-center gap-3 rounded-md px-1 py-1 hover:bg-surface"
            aria-label={`${r.group.name}: ${r.daesang} daesang`}
          >
            {r.group.photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- static export, thumbnail pre-sized
              <img src={r.group.photo.src} alt="" width={36} height={36} loading="lazy" className="size-9 rounded-full object-cover" style={{ objectPosition: "50% 30%", background: r.group.accent }} />
            ) : (
              <span aria-hidden className="size-9 rounded-full" style={{ background: r.group.accent }} />
            )}
            <span className="truncate text-sm font-medium">{r.group.name}</span>
            <span className="flex items-center gap-2">
              <span className="block h-4 rounded-r-[4px] bg-domestic" style={{ width: `${(r.daesang / max) * 100}%`, minWidth: 4, maxWidth: "calc(100% - 2.5rem)" }} />
              <span className="tabular text-sm font-semibold">{r.daesang}</span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

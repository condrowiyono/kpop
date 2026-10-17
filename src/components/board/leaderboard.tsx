"use client";

import Link from "next/link";
import { inkOn } from "@/lib/color";
import { type Filter } from "@/lib/stats";
import { ordinal } from "@/lib/format";
import type { BoardState } from "@/lib/url-filter";
import { sortValue, type GroupStats } from "./compute";
import { SeriesLegend, SplitBar } from "../charts/split-bar";
import { Sparkline } from "../charts/sparkline";

const SORT_NOUN: Record<BoardState["sort"], string> = {
  total: "wins",
  name: "wins",
  domestic: "Korean wins",
  international: "international wins",
  daesang: "daesang",
  musicShows: "music show wins",
};

function Row({ s, rank, max, sort }: { s: GroupStats; rank: number; max: number; sort: BoardState["sort"] }) {
  const g = s.group;
  const value = sortValue(s, sort);
  return (
    <li>
      <Link
        href={`/groups/${g.slug}/`}
        className="group grid grid-cols-[2.25rem_3.5rem_1fr_auto] items-center gap-x-3 gap-y-2 rounded-lg px-2 py-3 transition-colors hover:bg-surface sm:grid-cols-[3rem_4.5rem_minmax(0,1fr)_minmax(9rem,14rem)_6rem_7rem] sm:gap-x-5 sm:px-3"
      >
        <span className="tabular text-right font-display text-3xl leading-none font-bold text-ink-3 group-hover:text-ink sm:text-4xl">
          {String(rank).padStart(2, "0")}
        </span>

        <span className="relative block">
          {g.photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- static export, thumbnail pre-sized
            <img
              src={g.photo.src}
              alt=""
              width={g.photo.width}
              height={g.photo.height}
              loading="lazy"
              decoding="async"
              className="aspect-square w-full rounded-md object-cover"
              style={{ background: g.accent, objectPosition: "50% 30%" }}
            />
          ) : (
            <span className="grid aspect-square w-full place-items-center rounded-md font-display text-xl font-bold" style={{ background: g.accent, color: inkOn(g.accent) }}>
              {g.name.slice(0, 2)}
            </span>
          )}
          {g.topRelease?.artwork && (
            // eslint-disable-next-line @next/next/no-img-element -- static export, cover art pre-sized
            <img
              src={g.topRelease.artwork}
              alt=""
              width={60}
              height={60}
              loading="lazy"
              className="absolute -right-1.5 -bottom-1.5 hidden size-7 rounded-[3px] border-2 border-bg object-cover sm:block"
            />
          )}
        </span>

        <span className="min-w-0">
          <span className="flex items-baseline gap-2">
            <span className="truncate text-base font-semibold sm:text-lg">{g.name}</span>
            {g.nameKo && <span className="hidden truncate text-sm text-ink-3 sm:inline">{g.nameKo}</span>}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-3">
            <span aria-hidden className="inline-block size-2.5 rounded-full" style={{ background: g.accent }} />
            {g.type === "girl" ? "Girl group" : "Boy group"} · {ordinal(g.generation)} gen
            {g.topRelease && <span className="hidden truncate md:inline">· top song “{g.topRelease.title}”</span>}
          </span>
          <span className="mt-2 block sm:hidden">
            <SplitBar stats={s} max={max} />
          </span>
        </span>

        <span className="hidden sm:block">
          <SplitBar stats={s} max={max} />
          <span className="tabular mt-1.5 flex gap-3 text-xs text-ink-3">
            <span>KR {s.koreanAwards}</span>
            <span>Shows {s.musicShows}</span>
            <span>Intl {s.international}</span>
          </span>
        </span>

        <span className="hidden sm:block" aria-hidden>
          <Sparkline values={s.byYear} />
        </span>

        <span className="text-right">
          <span className="tabular block font-display text-3xl leading-none font-bold sm:text-4xl">{value}</span>
          <span className="mt-1 block text-xs text-ink-3">
            {SORT_NOUN[sort]}
            {sort !== "daesang" && s.daesang > 0 && <span className="hidden sm:inline"> · {s.daesang} daesang</span>}
          </span>
        </span>
      </Link>
    </li>
  );
}

export function Leaderboard({ rows, sort, filter }: { rows: GroupStats[]; sort: BoardState["sort"]; filter: Filter }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-dashed border-control px-6 py-12 text-center">
        <p className="font-semibold">No group matches these filters.</p>
        <p className="mt-1 text-sm text-ink-2">Try a different name or generation, or reset the filters above.</p>
      </div>
    );
  }
  const yearsLabel = filter.from === filter.to ? String(filter.from) : `${filter.from} to ${filter.to}`;
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3 px-2 sm:px-3">
        <SeriesLegend filter={filter} />
        <p className="text-xs text-ink-3">Counts cover {yearsLabel}. The small line shows wins per year.</p>
      </div>
      <ol className="divide-y divide-line">
        {rows.map((s, i) => (
          <Row key={s.group.slug} s={s} rank={i + 1} max={max} sort={sort} />
        ))}
      </ol>
    </div>
  );
}

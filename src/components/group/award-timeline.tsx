"use client";

import clsx from "clsx";
import { ExternalLink, Search } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { formatDate } from "@/lib/format";
import type { Award, Ceremony, Release } from "@/lib/schema";
import { YEARS } from "@/lib/stats";
import { PlatformLinks } from "../platform-links";

type View = "all" | "korean" | "music-show" | "international" | "daesang";

const VIEWS: { value: View; label: string }[] = [
  { value: "all", label: "Everything" },
  { value: "korean", label: "Korean awards" },
  { value: "music-show", label: "Music shows" },
  { value: "international", label: "International" },
  { value: "daesang", label: "Daesang only" },
];

const TIER_TAG: Partial<Record<Award["tier"], string>> = { daesang: "Daesang", bonsang: "Bonsang" };

function matches(a: Award, c: Ceremony | undefined, view: View) {
  if (!c) return false;
  switch (view) {
    case "korean":
      return c.scope === "domestic" && c.kind !== "music-show";
    case "music-show":
      return c.kind === "music-show";
    case "international":
      return c.scope === "international";
    case "daesang":
      return a.tier === "daesang";
    default:
      return true;
  }
}

export function AwardTimeline({
  awards,
  ceremonies,
  releases,
  groupName,
}: {
  awards: Award[];
  ceremonies: Record<string, Ceremony>;
  releases: Record<string, Release>;
  groupName: string;
}) {
  const [view, setView] = useState<View>("all");
  const [year, setYear] = useState<number | "all">("all");
  const [q, setQ] = useState("");
  const qId = useId();
  const yearId = useId();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return awards.filter((a) => {
      const c = ceremonies[a.ceremonyId];
      if (!matches(a, c, view)) return false;
      if (year !== "all" && a.year !== year) return false;
      if (!needle) return true;
      return [a.category, a.work ?? "", c?.name ?? "", c?.short ?? ""].some((s) => s.toLowerCase().includes(needle));
    });
  }, [awards, ceremonies, view, year, q]);

  const byYear = useMemo(() => {
    const map = new Map<number, Award[]>();
    for (const a of filtered) map.set(a.year, [...(map.get(a.year) ?? []), a]);
    return [...map.entries()].sort((x, y) => y[0] - x[0]);
  }, [filtered]);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3 border-y border-line py-4">
        <div className="rail -mx-4 flex max-w-full gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Show">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              aria-pressed={view === v.value}
              onClick={() => setView(v.value)}
              className={clsx(
                "h-11 shrink-0 rounded-md border px-3 text-sm sm:h-9",
                view === v.value ? "border-ink bg-ink font-medium text-bg" : "border-control text-ink-2 hover:border-ink hover:text-ink",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div>
          <label htmlFor={yearId} className="mb-1 block text-xs font-medium text-ink-3">
            Year
          </label>
          <select
            id={yearId}
            value={year}
            onChange={(e) => setYear(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="h-11 rounded-md border border-control bg-surface px-3 pr-8 text-sm sm:h-9"
          >
            <option value="all">All years</option>
            {[...YEARS].reverse().map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="relative min-w-0 grow sm:max-w-64">
          <label htmlFor={qId} className="mb-1 block text-xs font-medium text-ink-3">
            Search awards
          </label>
          <Search size={15} aria-hidden className="pointer-events-none absolute bottom-3.5 left-3 text-ink-3 sm:bottom-2.5" />
          <input
            id={qId}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ceremony, category or song"
            className="h-11 w-full rounded-md border border-control bg-surface pr-3 pl-8 text-sm placeholder:text-ink-3 sm:h-9"
          />
        </div>
        <p className="text-sm text-ink-3 sm:ml-auto" aria-live="polite">
          {filtered.length} of {awards.length} wins
        </p>
      </div>

      {byYear.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-control px-6 py-10 text-center">
          <p className="font-semibold">No wins match these filters.</p>
          <p className="mt-1 text-sm text-ink-2">
            {view === "daesang" ? `${groupName} has no daesang in this selection. ` : ""}
            <button
              type="button"
              className="font-medium text-ink underline underline-offset-4"
              onClick={() => {
                setView("all");
                setYear("all");
                setQ("");
              }}
            >
              Show every win
            </button>
          </p>
        </div>
      ) : (
        byYear.map(([yr, list]) => (
          <section key={yr} aria-labelledby={`y-${yr}`} className="mt-8">
            <h3 id={`y-${yr}`} className="sticky top-0 z-[1] flex items-baseline gap-3 bg-bg/95 py-2 backdrop-blur-sm">
              <span className="tabular font-display text-3xl font-extrabold">{yr}</span>
              <span className="text-sm text-ink-3">{list.length === 1 ? "1 win" : `${list.length} wins`}</span>
            </h3>
            <ul className="divide-y divide-line">
              {list.map((a) => {
                const c = ceremonies[a.ceremonyId];
                const r = a.releaseId ? releases[a.releaseId] : undefined;
                const tag = TIER_TAG[a.tier];
                return (
                  <li key={a.id} className="grid gap-x-4 gap-y-2 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)_auto]">
                    <div className="flex items-center gap-2 text-sm sm:block">
                      <span
                        className="inline-flex items-center gap-1.5 font-semibold"
                        title={`${c?.name} (${c?.scope === "domestic" ? "Korea" : c?.country})`}
                      >
                        <span
                          aria-hidden
                          className="inline-block size-2 shrink-0 rounded-full"
                          style={{ background: c?.kind === "music-show" ? "var(--series-music)" : c?.scope === "domestic" ? "var(--series-domestic)" : "var(--series-intl)" }}
                        />
                        {c?.short}
                      </span>
                      <span className="block text-xs text-ink-3 sm:mt-0.5">{a.date ? formatDate(a.date) : `${a.year} ceremony`}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm">
                        {tag && (
                          <span className="mr-2 inline-block rounded-[3px] bg-ink px-1.5 py-px text-[11px] font-semibold tracking-wide text-bg uppercase">{tag}</span>
                        )}
                        {a.tier === "music-show" ? <span className="text-ink-2">Music show win</span> : a.category}
                      </p>
                      {(r || a.work) && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
                          <span className="flex min-w-0 items-center gap-2">
                            {r?.artwork && (
                              // eslint-disable-next-line @next/next/no-img-element -- static export, cover art pre-sized
                              <img src={r.artwork} alt="" width={32} height={32} loading="lazy" className="size-8 shrink-0 rounded-[3px] object-cover" />
                            )}
                            <span className="truncate text-sm font-medium">
                              {r?.type === "album" ? <i>{r.title}</i> : `“${r?.title ?? a.work}”`}
                            </span>
                          </span>
                          {r && <PlatformLinks release={r} groupName={groupName} />}
                        </div>
                      )}
                    </div>
                    <a
                      href={a.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-11 items-center gap-1 self-start text-xs text-ink-3 underline-offset-4 hover:text-ink hover:underline sm:h-auto"
                    >
                      Source <ExternalLink size={12} aria-hidden />
                      <span className="sr-only">for {c?.name} {a.year}, opens in a new tab</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

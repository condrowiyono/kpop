"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { inkOn } from "@/lib/color";

export type Winner = { slug: string; count: number; daesang: number; categories: string[]; works: string[]; covers: string[] };
export type CeremonyEntry = {
  id: string;
  name: string;
  short: string;
  country: string;
  scope: "domestic" | "international";
  kind: "award" | "music-show" | "other";
  total: number;
  daesang: number;
  years: { year: number; winners: Winner[] }[];
  leaders: { slug: string; count: number }[];
};
export type GroupChip = { name: string; accent: string; photo?: string };

type Kind = "all" | "korean" | "music-show" | "international" | "other";
const KINDS: { value: Kind; label: string }[] = [
  { value: "all", label: "All" },
  { value: "korean", label: "Korean awards" },
  { value: "music-show", label: "Music shows" },
  { value: "international", label: "International" },
  { value: "other", label: "Brand and culture" },
];

const COUNTRY: Record<string, string> = {
  KR: "South Korea", US: "United States", JP: "Japan", CN: "China", HK: "Hong Kong", TW: "Taiwan", MY: "Malaysia", ID: "Indonesia",
  TH: "Thailand", PH: "Philippines", MX: "Mexico", BR: "Brazil", GB: "United Kingdom", FR: "France", DE: "Germany", SE: "Sweden",
  DK: "Denmark", PT: "Portugal", CL: "Chile", RU: "Russia", EU: "Europe", INTL: "International",
};

const kindOf = (c: CeremonyEntry): Kind =>
  c.kind === "music-show" ? "music-show" : c.kind === "other" ? "other" : c.scope === "domestic" ? "korean" : "international";

function Avatar({ g, size = 36 }: { g: GroupChip; size?: number }) {
  return g.photo ? (
    // eslint-disable-next-line @next/next/no-img-element -- static export, thumbnail pre-sized
    <img src={g.photo} alt="" width={size} height={size} loading="lazy" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size, objectPosition: "50% 30%", background: g.accent }} />
  ) : (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-full text-xs font-bold" style={{ width: size, height: size, background: g.accent, color: inkOn(g.accent) }}>
      {g.name.slice(0, 1)}
    </span>
  );
}

export function CeremonyView({
  ceremonies,
  groups,
  selected,
  onSelect,
}: {
  ceremonies: CeremonyEntry[];
  groups: Record<string, GroupChip>;
  selected: string;
  onSelect?: (id: string) => void;
}) {
  const [kind, setKind] = useState<Kind>("all");
  const selectId = useId();
  const list = useMemo(() => ceremonies.filter((c) => kind === "all" || kindOf(c) === kind), [ceremonies, kind]);
  const current = ceremonies.find((c) => c.id === selected) ?? ceremonies[0];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-12">
      <aside className="min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:self-start lg:overflow-y-auto rail">
        <div className="rail -mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0" role="group" aria-label="Ceremony type">
          {KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              aria-pressed={kind === k.value}
              onClick={() => setKind(k.value)}
              className={clsx(
                "h-11 shrink-0 rounded-md border px-3 text-sm lg:h-9",
                kind === k.value ? "border-ink bg-ink font-medium text-bg" : "border-control text-ink-2 hover:border-ink hover:text-ink",
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
        <div className="lg:hidden">
          <label htmlFor={selectId} className="mb-1.5 block text-xs font-medium text-ink-3">
            Ceremony ({list.length})
          </label>
          <select id={selectId} value={current.id} onChange={(e) => onSelect?.(e.target.value)} className="h-11 w-full rounded-md border border-control bg-surface px-3 text-sm">
            {list.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.total})
              </option>
            ))}
          </select>
        </div>
        <ul className="hidden lg:block">
          {list.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect?.(c.id)}
                aria-current={c.id === current.id ? "true" : undefined}
                className={clsx(
                  "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm",
                  c.id === current.id ? "bg-ink font-semibold text-bg" : "text-ink-2 hover:bg-surface hover:text-ink",
                )}
              >
                <span className="truncate">{c.name}</span>
                <span className="tabular shrink-0 text-xs">{c.total}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section aria-labelledby="ceremony-name" className="min-w-0">
        <p className="text-sm text-ink-3">
          {COUNTRY[current.country] ?? current.country} ·{" "}
          {current.kind === "music-show" ? "Weekly music show" : current.kind === "other" ? "Brand or culture honor" : "Music awards"} ·{" "}
          {current.scope === "domestic" ? "counted as Korean" : "counted as international"}
        </p>
        <h2 id="ceremony-name" className="mt-1 font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.9] font-extrabold tracking-tight uppercase">
          {current.name}
        </h2>
        <p className="mt-3 text-ink-2">
          {current.total} {current.total === 1 ? "win" : "wins"} by the tracked groups since 2020
          {current.daesang > 0 && `, ${current.daesang} of them daesang`}.
        </p>

        <ol className="mt-6 flex flex-wrap gap-2" aria-label="Most wins here">
          {current.leaders.slice(0, 6).map((l, i) => {
            const g = groups[l.slug];
            return (
              <li key={l.slug}>
                <Link href={`/groups/${l.slug}/`} className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pr-4 pl-1 text-sm hover:border-control">
                  <Avatar g={g} size={32} />
                  <span className="font-medium">
                    {i + 1}. {g.name}
                  </span>
                  <span className="tabular text-ink-3">{l.count}</span>
                </Link>
              </li>
            );
          })}
        </ol>

        <div className="mt-8 space-y-8">
          {current.years.map(({ year, winners }) => (
            <section key={year} aria-labelledby={`cy-${year}`}>
              <h3 id={`cy-${year}`} className="tabular border-b border-line pb-1 font-display text-2xl font-extrabold">
                {year}
              </h3>
              <ul className="divide-y divide-line">
                {winners.map((w) => {
                  const g = groups[w.slug];
                  return (
                    <li key={w.slug} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 py-3">
                      <Avatar g={g} />
                      <div className="min-w-0">
                        <Link href={`/groups/${w.slug}/`} className="font-semibold underline-offset-4 hover:underline">
                          {g.name}
                        </Link>
                        <p className="text-sm text-ink-2">
                          {current.kind === "music-show"
                            ? w.works.map((t) => `“${t}”`).join(", ")
                            : w.categories.map((c, i) => (
                                <span key={i}>
                                  {i > 0 && "; "}
                                  {c}
                                </span>
                              ))}
                        </p>
                      </div>
                      <span className="flex items-start gap-3 text-right text-sm">
                        {w.covers.length > 0 && (
                          <span className="hidden gap-1 sm:flex" aria-hidden>
                            {w.covers.map((c) => (
                              // eslint-disable-next-line @next/next/no-img-element -- static export, cover art pre-sized
                              <img key={c} src={c} alt="" width={40} height={40} loading="lazy" className="size-10 rounded-[3px] object-cover" />
                            ))}
                          </span>
                        )}
                        <span>
                        <span className="tabular font-semibold">{w.count}</span>
                        {w.daesang > 0 && <span className="block text-xs font-semibold text-ink">{w.daesang} daesang</span>}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}

export function CeremonyBrowser({ ceremonies, groups, fallback }: { ceremonies: CeremonyEntry[]; groups: Record<string, GroupChip>; fallback: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requested = params.get("c");
  const selected = ceremonies.some((c) => c.id === requested) ? requested! : fallback;
  return (
    <CeremonyView
      ceremonies={ceremonies}
      groups={groups}
      selected={selected}
      onSelect={(id) => {
        router.replace(`${pathname}?c=${id}`, { scroll: false });
        document.getElementById("ceremony-name")?.scrollIntoView({ block: "nearest" });
      }}
    />
  );
}

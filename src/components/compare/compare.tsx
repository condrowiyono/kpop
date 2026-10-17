"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId, useMemo } from "react";
import { ordinal } from "@/lib/format";
import { inkOn } from "@/lib/color";
import { LineChart } from "./line-chart";

export type CompareGroup = {
  slug: string;
  name: string;
  nameKo?: string;
  accent: string;
  photo?: string;
  rank: number;
  debutYear?: number;
  generation: number;
  type: string;
  total: number;
  korean: number;
  musicShows: number;
  international: number;
  daesang: number;
  bonsang: number;
  bestYear?: { year: number; total: number };
  byYear: number[];
  topCeremony?: { name: string; count: number };
  topSong?: { title: string; wins: number; artwork?: string };
};

/** Validated categorical slots 1-3; identity is also carried by name labels and the legend. */
const SLOT_COLORS = ["var(--series-domestic)", "var(--series-intl)", "var(--series-music)"];

const ROWS: { label: string; get: (g: CompareGroup) => number }[] = [
  { label: "All wins", get: (g) => g.total },
  { label: "Korean awards", get: (g) => g.korean },
  { label: "Music show wins", get: (g) => g.musicShows },
  { label: "International", get: (g) => g.international },
  { label: "Daesang", get: (g) => g.daesang },
  { label: "Bonsang", get: (g) => g.bonsang },
];

function Picker({ index, value, groups, onPick, onRemove }: { index: number; value?: string; groups: CompareGroup[]; onPick: (slug: string) => void; onRemove?: () => void }) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-3">
        <span aria-hidden className="inline-block size-2.5 rounded-full" style={{ background: SLOT_COLORS[index] }} />
        Group {index + 1}
      </label>
      <div className="flex gap-2">
        <select
          id={id}
          value={value ?? ""}
          onChange={(e) => onPick(e.target.value)}
          className="h-11 w-full min-w-0 rounded-md border border-control bg-surface px-3 pr-8 text-sm"
        >
          {!value && <option value="">Choose a group</option>}
          {groups.map((g) => (
            <option key={g.slug} value={g.slug}>
              {g.rank}. {g.name}
            </option>
          ))}
        </select>
        {onRemove && (
          <button type="button" onClick={onRemove} className="h-11 shrink-0 rounded-md border border-control px-3 text-sm text-ink-2 hover:border-ink hover:text-ink">
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

export function CompareView({ groups, picked, onChange, partialYear }: { groups: CompareGroup[]; picked: string[]; onChange?: (slugs: string[]) => void; partialYear: number }) {
  const bySlug = useMemo(() => new Map(groups.map((g) => [g.slug, g])), [groups]);
  const chosen = picked.map((s) => bySlug.get(s)).filter((g): g is CompareGroup => !!g);
  const set = (i: number, slug: string) => {
    const next = [...picked];
    next[i] = slug;
    onChange?.([...new Set(next.filter(Boolean))]);
  };

  return (
    <div>
      <div className="grid gap-4 border-y border-line py-5 sm:grid-cols-3">
        {[0, 1, 2].map((i) =>
          i < Math.max(2, picked.length) ? (
            <Picker
              key={i}
              index={i}
              value={picked[i]}
              groups={groups}
              onPick={(slug) => set(i, slug)}
              onRemove={i === 2 ? () => onChange?.(picked.slice(0, 2)) : undefined}
            />
          ) : (
            <div key={i} className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  const extra = groups.find((g) => !picked.includes(g.slug));
                  if (extra) onChange?.([...picked, extra.slug]);
                }}
                className="h-11 w-full rounded-md border border-dashed border-control text-sm font-medium text-ink-2 hover:border-ink hover:text-ink"
              >
                Add a third group
              </button>
            </div>
          ),
        )}
      </div>

      {chosen.length < 2 ? (
        <p className="mt-8 rounded-lg border border-dashed border-control px-6 py-10 text-center text-ink-2">
          Pick two different groups above to compare them.
        </p>
      ) : (
        <>
          <div className={`mt-8 grid gap-3 ${chosen.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
            {chosen.map((g, i) => (
              <Link key={g.slug} href={`/groups/${g.slug}/`} className="group relative block overflow-hidden rounded-lg">
                {g.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- static export, thumbnail pre-sized
                  <img src={g.photo} alt="" className="aspect-[4/5] w-full object-cover sm:aspect-[4/3]" style={{ objectPosition: "50% 30%", background: g.accent }} />
                ) : (
                  <span className="grid aspect-[4/5] w-full place-items-center font-display text-4xl font-bold sm:aspect-[4/3]" style={{ background: g.accent, color: inkOn(g.accent) }}>
                    {g.name}
                  </span>
                )}
                <span aria-hidden className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/90 via-black/55 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-3 text-white sm:p-4">
                  <span className="flex items-center gap-1.5 text-xs text-white/85">
                    <span aria-hidden className="inline-block size-2.5 rounded-full" style={{ background: SLOT_COLORS[i] }} />
                    No. {g.rank}
                  </span>
                  <span className="block truncate text-lg font-semibold group-hover:underline sm:text-2xl">{g.name}</span>
                  <span className="tabular block font-display text-4xl leading-none font-extrabold sm:text-6xl">{g.total}</span>
                  <span className="text-xs text-white/85">wins</span>
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-10 overflow-x-auto rail">
            <table className="w-full min-w-[30rem] text-sm">
              <caption className="sr-only">Side-by-side totals. The highest value in each row is marked.</caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="py-3 text-left text-xs font-medium text-ink-3">
                    2020 to {partialYear}
                  </th>
                  {chosen.map((g) => (
                    <th key={g.slug} scope="col" className="py-3 text-right font-semibold">
                      {g.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => {
                  const vals = chosen.map(row.get);
                  const top = Math.max(...vals);
                  return (
                    <tr key={row.label} className="border-b border-line">
                      <th scope="row" className="py-3 text-left font-medium text-ink-2">
                        {row.label}
                      </th>
                      {vals.map((v, i) => {
                        const lead = v === top && v > 0 && vals.filter((x) => x === top).length === 1;
                        return (
                          <td key={chosen[i].slug} className="tabular py-3 text-right">
                            <span className={lead ? "rounded bg-ink px-2 py-0.5 font-bold text-bg" : ""}>{v}</span>
                            {lead && <span className="sr-only"> (highest)</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                <tr className="border-b border-line">
                  <th scope="row" className="py-3 text-left font-medium text-ink-2">
                    Best year
                  </th>
                  {chosen.map((g) => (
                    <td key={g.slug} className="tabular py-3 text-right">
                      {g.bestYear ? `${g.bestYear.year} (${g.bestYear.total})` : "None"}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-line">
                  <th scope="row" className="py-3 text-left font-medium text-ink-2">
                    Most wins at
                  </th>
                  {chosen.map((g) => (
                    <td key={g.slug} className="py-3 text-right">
                      {g.topCeremony ? `${g.topCeremony.name} (${g.topCeremony.count})` : "None"}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-line">
                  <th scope="row" className="py-3 text-left font-medium text-ink-2">
                    Most-awarded song
                  </th>
                  {chosen.map((g) => (
                    <td key={g.slug} className="py-3 text-right">
                      {g.topSong ? (
                        <span className="inline-flex items-center gap-2">
                          {g.topSong.artwork && (
                            // eslint-disable-next-line @next/next/no-img-element -- static export, cover art pre-sized
                            <img src={g.topSong.artwork} alt="" width={28} height={28} className="size-7 rounded-[3px]" />
                          )}
                          “{g.topSong.title}” ({g.topSong.wins})
                        </span>
                      ) : (
                        "None"
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="py-3 text-left font-medium text-ink-2">
                    Debut, generation
                  </th>
                  {chosen.map((g) => (
                    <td key={g.slug} className="py-3 text-right">
                      {g.debutYear ?? "?"}, {ordinal(g.generation)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <section aria-labelledby="per-year" className="mt-12">
            <h2 id="per-year" className="font-display text-3xl font-extrabold tracking-tight uppercase">
              Wins per year
            </h2>
            <p className="mt-1 mb-4 text-sm text-ink-2">All wins, including music shows. Hover or tab through the years for exact counts.</p>
            <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2" aria-label="Legend">
              {chosen.map((g, i) => (
                <li key={g.slug} className="flex items-center gap-1.5">
                  <span aria-hidden className="inline-block h-0.5 w-4" style={{ background: SLOT_COLORS[i] }} />
                  {g.name}
                </li>
              ))}
            </ul>
            <LineChart lines={chosen.map((g, i) => ({ key: g.slug, label: g.name, color: SLOT_COLORS[i], values: g.byYear }))} partialYear={partialYear} />
            <p className="mt-1 text-xs text-ink-3">* {partialYear} runs through mid-October.</p>
          </section>
        </>
      )}
    </div>
  );
}

export function parsePicked(raw: string | null, groups: CompareGroup[], fallback: string[]): string[] {
  const valid = new Set(groups.map((g) => g.slug));
  const picked = [...new Set((raw ?? "").split(",").filter((s) => valid.has(s)))].slice(0, 3);
  return picked.length ? picked : fallback;
}

export function Compare({ groups, fallback, partialYear }: { groups: CompareGroup[]; fallback: string[]; partialYear: number }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const picked = parsePicked(params.get("g"), groups, fallback);
  return (
    <CompareView
      groups={groups}
      picked={picked}
      partialYear={partialYear}
      onChange={(slugs) => router.replace(`${pathname}?g=${slugs.join(",")}`, { scroll: false })}
    />
  );
}

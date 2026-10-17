import type { Metadata } from "next";
import { Suspense } from "react";
import { CeremonyBrowser, CeremonyView, type CeremonyEntry, type GroupChip } from "@/components/ceremonies/browser";
import { getCeremonies, getCeremonyWinners, getGroups, getReleases } from "@/lib/data";

export const metadata: Metadata = {
  title: "Every ceremony",
  description: "Every awards show and music show in the data, with the tracked K-pop groups that won there each year since 2020.",
};

const fold = (t: string) => t.toLowerCase().replace(/[^a-z0-9가-힣]/g, "");

export default function CeremoniesPage() {
  const winners = getCeremonyWinners();
  // Cover art per group + title, so winning songs show their artwork.
  const covers = new Map<string, string>();
  for (const g of getGroups()) for (const r of getReleases(g.slug)) if (r.artwork) covers.set(`${g.slug}|${fold(r.title)}`, r.artwork);
  const entries: CeremonyEntry[] = getCeremonies()
    .filter((c) => winners.has(c.id))
    .map((c) => {
      const rows = winners.get(c.id)!;
      const years = new Map<number, Map<string, { count: number; daesang: number; categories: string[]; works: Map<string, number> }>>();
      const leaders = new Map<string, number>();
      for (const r of rows) {
        const y = years.get(r.year) ?? new Map();
        const w = y.get(r.slug) ?? { count: 0, daesang: 0, categories: [], works: new Map() };
        w.count++;
        if (r.tier === "daesang") w.daesang++;
        if (r.tier !== "music-show") w.categories.push(r.work ? `${r.category} (“${r.work}”)` : r.category);
        if (r.work) w.works.set(r.work, (w.works.get(r.work) ?? 0) + 1);
        y.set(r.slug, w);
        years.set(r.year, y);
        leaders.set(r.slug, (leaders.get(r.slug) ?? 0) + 1);
      }
      return {
        id: c.id,
        name: c.name,
        short: c.short,
        country: c.country,
        scope: c.scope,
        kind: c.kind,
        total: rows.length,
        daesang: rows.filter((r) => r.tier === "daesang").length,
        leaders: [...leaders.entries()].map(([slug, count]) => ({ slug, count })).sort((a, b) => b.count - a.count),
        years: [...years.entries()]
          .sort((a, b) => b[0] - a[0])
          .map(([year, m]) => ({
            year,
            winners: [...m.entries()]
              .map(([slug, w]) => ({
                slug,
                count: w.count,
                daesang: w.daesang,
                categories: w.categories,
                works: [...w.works.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => (n > 1 ? `${t} ×${n}` : t)),
                covers: [...new Set([...w.works.keys()].map((t) => covers.get(`${slug}|${fold(t)}`)).filter((c): c is string => !!c))].slice(0, 3),
              }))
              .sort((a, b) => b.daesang - a.daesang || b.count - a.count),
          })),
      };
    })
    .sort((a, b) => b.total - a.total);

  const groups: Record<string, GroupChip> = Object.fromEntries(
    getGroups().map((g) => [g.slug, { name: g.name, accent: g.accent, photo: g.image?.thumb ?? g.image?.src }]),
  );
  const fallback = entries.find((e) => e.id === "mama")?.id ?? entries[0].id;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
      <h1 className="font-display text-[clamp(2.75rem,8vw,5.5rem)] leading-[0.9] font-extrabold tracking-tight uppercase">Every ceremony</h1>
      <p className="mt-3 mb-8 max-w-2xl text-ink-2">
        {entries.length} awards shows, music shows and honors where the tracked groups won at least once since 2020. Pick
        one to see who won it each year.
      </p>
      <Suspense fallback={<CeremonyView ceremonies={entries} groups={groups} selected={fallback} />}>
        <CeremonyBrowser ceremonies={entries} groups={groups} fallback={fallback} />
      </Suspense>
    </div>
  );
}

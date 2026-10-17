import type { Metadata } from "next";
import { Suspense } from "react";
import { Compare, CompareView, type CompareGroup } from "@/components/compare/compare";
import { getCeremonyMap, getGroups, getMeta, getRank, getRanking, getReleaseWins, getSummary } from "@/lib/data";
import { YEARS } from "@/lib/stats";

export const metadata: Metadata = {
  title: "Compare groups",
  description: "Put two or three K-pop groups side by side: total wins, Korean and international awards, daesang, music show wins and wins per year since 2020.",
};

export default function ComparePage() {
  const ceremonies = getCeremonyMap();
  const groups: CompareGroup[] = getRanking().map((slug) => {
    const g = getGroups().find((x) => x.slug === slug)!;
    const s = getSummary(slug);
    const top = s.ceremonies[0];
    const song = getReleaseWins(slug)[0];
    return {
      slug,
      name: g.name,
      nameKo: g.nameKo,
      accent: g.accent,
      photo: g.image?.thumb ?? g.image?.src,
      rank: getRank(slug),
      debutYear: g.debutDate ? Number(g.debutDate.slice(0, 4)) : undefined,
      generation: g.generation,
      type: g.type,
      total: s.total,
      korean: s.domestic - s.musicShows,
      musicShows: s.musicShows,
      international: s.international,
      daesang: s.daesang,
      bonsang: s.bonsang,
      bestYear: s.bestYear,
      byYear: YEARS.map((y) => s.byYear[y]?.total ?? 0),
      topCeremony: top ? { name: ceremonies.get(top.id)?.short ?? top.id, count: top.count } : undefined,
      topSong: song ? { title: song.title, wins: song.wins, artwork: song.artwork } : undefined,
    };
  });
  const fallback = groups.slice(0, 2).map((g) => g.slug);
  const partialYear = Number(getMeta().dataTo.slice(0, 4));

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
      <h1 className="font-display text-[clamp(2.75rem,8vw,5.5rem)] leading-[0.9] font-extrabold tracking-tight uppercase">Compare groups</h1>
      <p className="mt-3 mb-8 max-w-2xl text-ink-2">
        Pick two or three groups. The link in your address bar updates as you go, so you can share the exact comparison.
      </p>
      <Suspense fallback={<CompareView groups={groups} picked={fallback} partialYear={partialYear} />}>
        <Compare groups={groups} fallback={fallback} partialYear={partialYear} />
      </Suspense>
    </div>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { Board, BoardStatic, type BoardData } from "@/components/board/board";
import { GroupPhoto } from "@/components/group-photo";
import {
  getAwards,
  getCeremonies,
  getCeremonyMap,
  getGroups,
  getMeta,
  getPackedAwards,
  getRankedGroups,
  getReleaseWins,
  getSummary,
} from "@/lib/data";
import { formatDate, plural } from "@/lib/format";

function boardData(): BoardData {
  return {
    groups: getGroups().map((g) => {
      const top = getReleaseWins(g.slug)[0];
      return {
        slug: g.slug,
        name: g.name,
        nameKo: g.nameKo,
        accent: g.accent,
        type: g.type,
        generation: g.generation,
        photo: g.image ? { src: g.image.thumb ?? g.image.src, width: g.image.width, height: g.image.height } : undefined,
        topRelease: top ? { title: top.title, artwork: top.artwork } : undefined,
      };
    }),
    ceremonies: getCeremonies().map((c) => ({ scope: c.scope, kind: c.kind })),
    awards: getPackedAwards(),
  };
}

function latestWins(limit: number) {
  const ceremonies = getCeremonyMap();
  return getGroups()
    .flatMap((g) => getAwards(g.slug).filter((a) => a.date).map((a) => ({ a, g })))
    .sort((x, y) => y.a.date!.localeCompare(x.a.date!))
    .slice(0, limit)
    .map(({ a, g }) => ({ group: g, date: a.date!, show: ceremonies.get(a.ceremonyId)?.short ?? a.ceremonyId, work: a.work }));
}

export default function Home() {
  const ranked = getRankedGroups();
  const podium = ranked.slice(0, 5);
  const leader = podium[0];
  const leaderStats = getSummary(leader.slug);
  const totalWins = ranked.reduce((n, g) => n + getSummary(g.slug).total, 0);
  const usedCeremonies = new Set(ranked.flatMap((g) => getSummary(g.slug).ceremonies.map((c) => c.id)));
  const showCount = getCeremonies().filter((c) => c.kind === "music-show" && usedCeremonies.has(c.id)).length;
  const ceremonyCount = usedCeremonies.size - showCount;
  const latest = latestWins(8);
  const data = boardData();
  const meta = getMeta();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <section className="grid gap-8 pt-8 pb-12 sm:pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12">
        <div className="flex flex-col justify-between gap-8">
          <div>
            <h1 className="font-display text-[clamp(3rem,9vw,6.5rem)] leading-[0.88] font-extrabold tracking-tight uppercase">
              Who won the most in K-pop since 2020
            </h1>
            <p className="mt-5 max-w-xl text-base text-ink-2 sm:text-lg">
              {totalWins.toLocaleString("en-US")} wins at {ceremonyCount} award ceremonies and {showCount} weekly music
              shows, counted for the {ranked.length} most-awarded groups from 2020 to {meta.dataTo.slice(0, 4)}. Every win
              links to the page it came from.
            </p>
          </div>

          <Link
            href={`/groups/${leader.slug}/`}
            className="group grid grid-cols-[auto_1fr] items-end gap-x-5 border-t-4 pt-4"
            style={{ borderColor: leader.accent }}
          >
            <span className="tabular font-display text-[clamp(4.5rem,12vw,8rem)] leading-[0.8] font-extrabold">
              {leaderStats.total}
            </span>
            <span className="pb-1 text-sm text-ink-2 sm:text-base">
              <span className="block text-lg font-semibold text-ink group-hover:underline sm:text-xl">
                {leader.name} lead every group
              </span>
              {plural(leaderStats.daesang, "daesang")}, {leaderStats.international} international wins and{" "}
              {leaderStats.musicShows} music show wins.
            </span>
          </Link>

          <div className="flex flex-wrap gap-3">
            <a href="#leaderboard" className="inline-flex h-12 items-center rounded-md bg-ink px-5 text-sm font-semibold text-bg hover:opacity-90">
              See all {ranked.length} groups
            </a>
            <Link href={`/compare/?g=${podium[0].slug},${podium[1].slug}`} className="inline-flex h-12 items-center rounded-md border border-control px-5 text-sm font-semibold hover:border-ink">
              Compare {podium[0].name} and {podium[1].name}
            </Link>
          </div>
        </div>

        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:grid-rows-2" aria-label="Top five groups">
          {podium.map((g, i) => {
            const s = getSummary(g.slug);
            return (
              <li
                key={g.slug}
                className={i === 0 ? "col-span-2 aspect-[16/10] sm:row-span-2 sm:aspect-auto" : "aspect-square sm:aspect-[4/5]"}
              >
                <Link href={`/groups/${g.slug}/`} className="group relative block h-full min-h-36 overflow-hidden rounded-lg">
                  <GroupPhoto
                    name={g.name}
                    image={g.image}
                    accent={g.accent}
                    thumb={i > 0}
                    decorative
                    priority={i === 0}
                    className="absolute inset-0 size-full transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <span aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 text-white sm:p-4">
                    <span className="min-w-0">
                      <span className="tabular block font-display text-xl leading-none font-bold opacity-90">#{i + 1}</span>
                      <span className={`block truncate font-semibold ${i === 0 ? "text-2xl sm:text-3xl" : "text-base"}`}>{g.name}</span>
                    </span>
                    <span className={`tabular font-display leading-none font-extrabold ${i === 0 ? "text-5xl sm:text-6xl" : "text-3xl"}`}>
                      {s.total}
                      <span className="sr-only"> wins</span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      {latest.length > 0 && (
        <section aria-labelledby="latest-title" className="mb-16">
          <h2 id="latest-title" className="mb-3 text-sm font-semibold text-ink-2">
            Latest music show wins
          </h2>
          <ul className="rail -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {latest.map((w) => (
              <li key={`${w.group.slug}-${w.date}-${w.show}`} className="w-56 shrink-0">
                <Link href={`/groups/${w.group.slug}/`} className="flex items-center gap-3 rounded-lg border border-line bg-surface p-2 hover:border-control">
                  <GroupPhoto name={w.group.name} image={w.group.image} accent={w.group.accent} thumb decorative className="size-12 shrink-0 rounded-md" />
                  <span className="min-w-0 text-sm">
                    <span className="block truncate font-semibold">{w.group.name}</span>
                    <span className="block truncate text-ink-2">{w.work ? `“${w.work}”` : w.show}</span>
                    <span className="block truncate text-xs text-ink-3">
                      {w.show}, {formatDate(w.date)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Suspense fallback={<BoardStatic data={data} />}>
        <Board data={data} />
      </Suspense>
    </div>
  );
}

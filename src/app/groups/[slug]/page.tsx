import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import { GroupLogoTitle } from "@/components/group-logo-title";
import { GroupPhoto } from "@/components/group-photo";
import { PlatformLinks } from "@/components/platform-links";
import { AwardTimeline } from "@/components/group/award-timeline";
import { Gallery } from "@/components/group/gallery";
import { SongList } from "@/components/group/song-list";
import { YearColumns } from "@/components/group/year-columns";
import { SERIES } from "@/components/charts/split-bar";
import { accentVars } from "@/lib/color";
import { getAwards, getCeremonyMap, getGroup, getGroups, getMeta, getRanking, getReleaseWins, getSummary } from "@/lib/data";
import { ordinal } from "@/lib/format";
import { bucketOf, type Summary } from "@/lib/stats";
import type { Ceremony, ImageRef, Release } from "@/lib/schema";

export const dynamicParams = false;

export function generateStaticParams() {
  return getGroups().map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/groups/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const g = getGroup(slug);
  if (!g) return {};
  const s = getSummary(slug);
  const description = `${g.name} won ${s.total} awards from 2020 to 2026: ${s.domestic} in Korea (${s.musicShows} on music shows) and ${s.international} international, including ${s.daesang} daesang.`;
  return {
    title: `${g.name} awards 2020 to 2026`,
    description,
    openGraph: {
      title: `${g.name}: ${s.total} wins since 2020`,
      description,
      images: [{ url: `/og/${g.slug}.png`, width: 1200, height: 630, alt: `${g.name} award totals` }],
    },
  };
}

function rankBy(metric: (s: Summary) => number, slug: string) {
  const values = getGroups().map((g) => ({ slug: g.slug, v: metric(getSummary(g.slug)) }));
  const mine = values.find((x) => x.slug === slug)!.v;
  return values.filter((x) => x.v > mine).length + 1;
}

const fmtDate = (iso?: string) =>
  iso ? new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) : undefined;

function Tile({ label, value, note, hero }: { label: string; value: string | number; note?: string; hero?: boolean }) {
  return (
    <div className={hero ? "col-span-2 border-b border-line pb-5 sm:col-span-1 sm:row-span-2 sm:border-r sm:border-b-0 sm:pr-8 sm:pb-0" : "py-1"}>
      <dt className="text-sm text-ink-2">{label}</dt>
      <dd className={`tabular font-display leading-none font-extrabold ${hero ? "mt-2 text-[clamp(4.5rem,11vw,7.5rem)]" : "mt-1 text-4xl"}`}>{value}</dd>
      {note && <dd className="mt-1.5 text-xs text-ink-3">{note}</dd>}
    </div>
  );
}

function credit(img: ImageRef, what: string) {
  return (
    <li key={img.src}>
      {what}: {img.credit},{" "}
      {img.licenseUrl ? (
        <a className="underline underline-offset-2 hover:text-ink" href={img.licenseUrl} target="_blank" rel="noopener noreferrer">
          {img.license}
        </a>
      ) : (
        img.license
      )}
      ,{" "}
      <a className="underline underline-offset-2 hover:text-ink" href={img.sourceUrl} target="_blank" rel="noopener noreferrer">
        source
      </a>
    </li>
  );
}

export default async function GroupPage({ params }: PageProps<"/groups/[slug]">) {
  const { slug } = await params;
  const g = getGroup(slug);
  if (!g) notFound();

  const s = getSummary(slug);
  const awards = getAwards(slug);
  const ceremonies = getCeremonyMap();
  const ranking = getRanking();
  const rank = ranking.indexOf(slug) + 1;
  const total = ranking.length;
  const prev = rank > 1 ? getGroup(ranking[rank - 2]) : undefined;
  const next = rank < total ? getGroup(ranking[rank]) : undefined;
  const songs = getReleaseWins(slug);
  const meta = getMeta();
  const partialYear = Number(meta.dataTo.slice(0, 4));

  const usedCeremonies: Record<string, Ceremony> = {};
  for (const a of awards) usedCeremonies[a.ceremonyId] ??= ceremonies.get(a.ceremonyId)!;
  const releaseMap: Record<string, Release> = Object.fromEntries(songs.map((r) => [r.id, r]));
  const topCeremonies = s.ceremonies.slice(0, 8).map((c) => ({ ...c, ceremony: ceremonies.get(c.id)! }));
  const maxCeremony = topCeremonies[0]?.count ?? 1;
  const korean = s.domestic - s.musicShows;

  const ranks = {
    international: rankBy((x) => x.international, slug),
    daesang: rankBy((x) => x.daesang, slug),
    musicShows: rankBy((x) => x.musicShows, slug),
    korean: rankBy((x) => x.domestic - x.musicShows, slug),
  };
  const rankNote = (r: number, v: number) => (v > 0 ? `${ordinal(r)} of ${total} groups` : undefined);

  return (
    <article style={accentVars(g.accent)}>
      {/* Hero */}
      <header className="relative isolate overflow-hidden bg-ink">
        <GroupPhoto
          name={g.name}
          image={g.image}
          accent={g.accent}
          priority
          decorative
          className="absolute inset-0 -z-10 size-full"
          position="50% 25%"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/60 to-black/10" />
        <div className="mx-auto flex min-h-[26rem] max-w-7xl flex-col justify-end px-4 pt-24 pb-8 text-white sm:min-h-[34rem] sm:px-6 lg:min-h-[38rem]">
          <Link href="/#leaderboard" className="mb-auto inline-flex h-11 w-fit items-center gap-1.5 rounded-md bg-black/55 px-3 text-sm font-medium hover:bg-black/75">
            <ArrowLeft size={16} aria-hidden /> Leaderboard
          </Link>
          <p className="tabular font-display text-2xl font-bold">
            No. {rank} <span className="font-sans text-sm font-medium text-white/85">of {total} by total wins</span>
          </p>
          <GroupLogoTitle
            name={g.name}
            logo={g.logo}
            className="block font-display text-[clamp(3.5rem,13vw,9rem)] leading-[0.85] font-extrabold tracking-tight uppercase"
          />
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-white/90">
            {g.nameKo && <span lang="ko" className="text-lg font-semibold">{g.nameKo}</span>}
            <span>
              {g.type === "girl" ? "Girl group" : "Boy group"} · {ordinal(g.generation)} generation
              {g.agency && ` · ${g.agency}`}
            </span>
          </p>
        </div>
        <div aria-hidden className="h-2" style={{ background: g.accent }} />
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Numbers */}
        <section aria-label="Totals" className="py-10">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-[auto_repeat(3,minmax(0,1fr))] sm:grid-rows-2">
            <Tile hero label="Wins from 2020 to 2026" value={s.total} note={`${ordinal(rank)} of ${total} groups. ${partialYear} is a partial year.`} />
            <Tile label="Korean awards" value={korean} note={rankNote(ranks.korean, korean)} />
            <Tile label="Music show wins" value={s.musicShows} note={rankNote(ranks.musicShows, s.musicShows)} />
            <Tile label="International" value={s.international} note={rankNote(ranks.international, s.international)} />
            <Tile label="Daesang (grand prizes)" value={s.daesang} note={s.daesang ? rankNote(ranks.daesang, s.daesang) : "None in this period"} />
            <Tile label="Bonsang (main prizes)" value={s.bonsang} />
            <Tile label="Best year" value={s.bestYear?.year ?? "None"} note={s.bestYear ? `${s.bestYear.total} wins` : undefined} />
          </dl>
        </section>

        {/* Charts */}
        <div className="grid gap-x-12 gap-y-12 border-t border-line pt-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <section aria-labelledby="by-year">
            <h2 id="by-year" className="mb-4 font-display text-3xl font-extrabold tracking-tight uppercase">
              Wins by year
            </h2>
            <YearColumns byYear={s.byYear} partialYear={partialYear} />
          </section>
          <section aria-labelledby="where">
            <h2 id="where" className="mb-1 font-display text-3xl font-extrabold tracking-tight uppercase">
              Where the wins came from
            </h2>
            <p className="mb-4 text-sm text-ink-2">Top ceremonies and shows by number of wins.</p>
            <ol className="space-y-2.5">
              {topCeremonies.map(({ id, count, ceremony }) => {
                const series = SERIES.find((x) => (bucketOf(ceremony) === "domestic" ? x.key === "koreanAwards" : bucketOf(ceremony) === "musicShows" ? x.key === "musicShows" : x.key === "international"))!;
                return (
                  <li key={id} className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 text-sm">
                    <span className="truncate" title={ceremony.name}>
                      {ceremony.short}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="block h-3 rounded-r-[4px]" style={{ width: `${(count / maxCeremony) * 85}%`, minWidth: 4, background: series.color }} />
                      <span className="tabular font-semibold">{count}</span>
                      <span className="sr-only">wins, {series.label}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2" aria-label="Legend">
              {SERIES.map((x) => (
                <li key={x.key} className="flex items-center gap-1.5">
                  <span aria-hidden className="inline-block h-2 w-3.5 rounded-[2px]" style={{ background: x.color }} />
                  {x.label}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Songs */}
        <section aria-labelledby="songs" className="mt-16 border-t border-line pt-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <h2 id="songs" className="font-display text-3xl font-extrabold tracking-tight uppercase">
              Most-awarded songs
            </h2>
            <p className="text-xs text-ink-3">Dashed buttons open a search on that service instead of the exact release.</p>
          </div>
          <SongList songs={songs.slice(0, 6)} groupName={g.name} />
        </section>

        {/* Photos & members */}
        {(g.gallery.length > 0 || g.members.length > 0) && (
          <section aria-labelledby="photos" className="mt-16 border-t border-line pt-10">
            <h2 id="photos" className="mb-4 font-display text-3xl font-extrabold tracking-tight uppercase">
              Photos and members
            </h2>
            <Gallery images={g.gallery} groupName={g.name} />
            {g.members.length > 0 && (
              <ul className="mt-8 grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-5 lg:grid-cols-8">
                {g.members.map((m) => (
                  <li key={m.name} className="text-center">
                    <GroupPhoto
                      name={m.name}
                      image={m.image}
                      accent={g.accent}
                      decorative
                      className="mx-auto aspect-square w-full max-w-28 rounded-full [container-type:inline-size]"
                      position="50% 20%"
                    />
                    <p className="mt-2 truncate text-sm font-medium">{m.name}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Discography */}
        {songs.length > 6 && (
          <section aria-labelledby="discography" className="mt-16 border-t border-line pt-10">
            <h2 id="discography" className="mb-1 font-display text-3xl font-extrabold tracking-tight uppercase">
              Every awarded release
            </h2>
            <p className="mb-5 text-sm text-ink-2">All {songs.length} songs and albums named in {g.name}&apos;s wins, most-awarded first.</p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {songs.map((r) => (
                <li key={r.id}>
                  {r.artwork ? (
                    // eslint-disable-next-line @next/next/no-img-element -- static export, cover art pre-sized
                    <img src={r.artwork} alt={`Cover of ${r.title}`} width={300} height={300} loading="lazy" className="aspect-square w-full rounded-md object-cover" />
                  ) : (
                    <div className="grid aspect-square w-full place-items-center rounded-md bg-surface-2 p-3 text-center text-sm font-semibold text-ink-2">{r.title}</div>
                  )}
                  <p className="mt-2 truncate text-sm font-semibold">{r.title}</p>
                  <p className="mb-2 text-xs text-ink-3">{r.wins === 1 ? "1 win" : `${r.wins} wins`}</p>
                  <PlatformLinks release={r} groupName={g.name} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Every win */}
        <section aria-labelledby="all-wins" className="mt-16 border-t border-line pt-10">
          <h2 id="all-wins" className="mb-1 font-display text-3xl font-extrabold tracking-tight uppercase">
            Every win
          </h2>
          <p className="mb-4 text-sm text-ink-2">
            Ceremonies list the ceremony year; music shows list the broadcast date. Each row links to its source.
          </p>
          <AwardTimeline awards={awards} ceremonies={usedCeremonies} releases={releaseMap} groupName={g.name} />
        </section>

        {/* Profile & credits */}
        <section aria-labelledby="profile" className="mt-16 grid gap-10 border-t border-line pt-10 md:grid-cols-2">
          <div>
            <h2 id="profile" className="mb-4 font-display text-3xl font-extrabold tracking-tight uppercase">
              Profile
            </h2>
            <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2 text-sm">
              {g.nameKo && (
                <>
                  <dt className="text-ink-3">Korean name</dt>
                  <dd lang="ko">{g.nameKo}</dd>
                </>
              )}
              {g.debutDate && (
                <>
                  <dt className="text-ink-3">Debut</dt>
                  <dd>{fmtDate(g.debutDate)}</dd>
                </>
              )}
              {g.agency && (
                <>
                  <dt className="text-ink-3">Label</dt>
                  <dd>{g.agency}</dd>
                </>
              )}
              {g.fandom && (
                <>
                  <dt className="text-ink-3">Fandom</dt>
                  <dd>{g.fandom}</dd>
                </>
              )}
              <dt className="text-ink-3">Official colors</dt>
              <dd>
                {g.colors.length ? (
                  <span className="flex flex-wrap gap-x-3 gap-y-1">
                    {g.colors.map((c) => (
                      <span key={c.hex} className="inline-flex items-center gap-1.5">
                        <span aria-hidden className="inline-block size-3.5 rounded-full border border-line" style={{ background: c.hex }} />
                        {c.name ?? c.hex}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="text-ink-2">None announced. This page uses a site-picked accent.</span>
                )}
              </dd>
              <dt className="text-ink-3">Members</dt>
              <dd>{g.members.length ? g.members.map((m) => m.name).join(", ") : "Not listed"}</dd>
              <dt className="text-ink-3">Read more</dt>
              <dd className="flex flex-wrap gap-x-4">
                <a href={g.wikiUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2">
                  Wikipedia <ExternalLink size={12} aria-hidden />
                </a>
                {g.fandomUrl && (
                  <a href={g.fandomUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2">
                    K-pop Fandom wiki <ExternalLink size={12} aria-hidden />
                  </a>
                )}
              </dd>
            </dl>
          </div>
          <div>
            <h2 className="mb-4 font-display text-3xl font-extrabold tracking-tight uppercase">Photo credits</h2>
            <details className="text-sm text-ink-2">
              <summary className="cursor-pointer py-2 font-medium text-ink">
                {[g.image, g.logo, ...g.gallery, ...g.members.map((m) => m.image)].filter(Boolean).length} images from Wikimedia Commons
              </summary>
              <ul className="mt-2 space-y-1.5 break-words">
                {g.image && credit(g.image, "Header")}
                {g.logo && credit(g.logo, "Logo")}
                {g.gallery.map((img, i) => credit(img, `Gallery ${i + 1}`))}
                {g.members.map((m) => m.image && credit(m.image, m.name))}
              </ul>
            </details>
            <p className="mt-3 text-xs text-ink-3">Cover art comes from Apple Music and links to the release.</p>
          </div>
        </section>

        {/* Neighbours */}
        <nav aria-label="Other groups" className="mt-16 grid gap-3 border-t border-line pt-8 sm:grid-cols-2">
          {prev ? (
            <Link href={`/groups/${prev.slug}/`} className="group flex items-center gap-3 rounded-lg p-2 hover:bg-surface">
              <ArrowLeft size={18} aria-hidden className="text-ink-3" />
              <GroupPhoto name={prev.name} image={prev.image} accent={prev.accent} thumb decorative className="size-12 rounded-md" />
              <span>
                <span className="block text-xs text-ink-3">No. {rank - 1}</span>
                <span className="font-semibold group-hover:underline">{prev.name}</span>
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`/groups/${next.slug}/`} className="group flex items-center justify-end gap-3 rounded-lg p-2 text-right hover:bg-surface">
              <span>
                <span className="block text-xs text-ink-3">No. {rank + 1}</span>
                <span className="font-semibold group-hover:underline">{next.name}</span>
              </span>
              <GroupPhoto name={next.name} image={next.image} accent={next.accent} thumb decorative className="size-12 rounded-md" />
              <ArrowRight size={18} aria-hidden className="text-ink-3" />
            </Link>
          )}
        </nav>
        <p className="mt-4 text-center">
          <Link href={`/compare/?g=${slug}${prev ? `,${prev.slug}` : next ? `,${next.slug}` : ""}`} className="inline-flex h-11 items-center text-sm font-semibold underline underline-offset-4">
            Compare {g.name} with {prev?.name ?? next?.name}
          </Link>
        </p>
      </div>
    </article>
  );
}

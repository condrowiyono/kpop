import type { Metadata } from "next";
import Link from "next/link";
import { getCeremonies, getGroups, getMeta, getRankedGroups, getReleases, getSelection, getSummary } from "@/lib/data";

export const metadata: Metadata = {
  title: "About the data",
  description: "How Trophy Count decides what counts as a win, what is Korean and what is international, where every number comes from, and what the data leaves out.",
};

const fmt = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

function H2({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <h2 id={id} className="mt-14 mb-3 scroll-mt-4 font-display text-ink text-3xl font-extrabold tracking-tight uppercase">
      {children}
    </h2>
  );
}

export default function AboutPage() {
  const meta = getMeta();
  const selection = getSelection();
  const ranked = getRankedGroups();
  const won = new Set(ranked.flatMap((g) => getSummary(g.slug).ceremonies.map((c) => c.id)));
  const ceremonies = getCeremonies().filter((c) => won.has(c.id) && c.kind !== "music-show");
  const totals = ranked.reduce(
    (acc, g) => {
      const s = getSummary(g.slug);
      acc.total += s.total;
      acc.shows += s.musicShows;
      acc.intl += s.international;
      acc.daesang += s.daesang;
      return acc;
    },
    { total: 0, shows: 0, intl: 0, daesang: 0 },
  );
  const releases = getGroups().flatMap((g) => getReleases(g.slug));
  const exact = (p: "spotify" | "appleMusic" | "youtubeMusic") => releases.filter((r) => r.links[p].verified).length;
  const photos = getGroups().reduce((n, g) => n + (g.image ? 1 : 0) + g.gallery.length + g.members.filter((m) => m.image).length, 0);
  const lastIn = ranked[ranked.length - 1];

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
      <h1 className="font-display text-[clamp(2.75rem,8vw,5.5rem)] leading-[0.9] font-extrabold tracking-tight uppercase">About the data</h1>
      <p className="mt-4 text-lg text-ink-2">
        Trophy Count counts the awards K-pop groups won from {fmt(meta.dataFrom)} through {fmt(meta.dataTo)}. It holds{" "}
        {totals.total.toLocaleString("en-US")} wins for {ranked.length} groups, and every one links to the page it was taken
        from.
      </p>

      <nav aria-label="On this page" className="mt-8 border-y border-line py-4 text-sm">
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {[
            ["counted", "What counts"],
            ["groups", "Which groups"],
            ["scope", "Korean or international"],
            ["tiers", "Daesang and bonsang"],
            ["sources", "Sources"],
            ["limits", "Known gaps"],
            ["refresh", "Updating the data"],
          ].map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="font-medium underline underline-offset-4">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-4 leading-relaxed text-ink-2 [&_strong]:text-ink">
        <H2 id="counted">What counts as a win</H2>
        <p>
          Only wins are counted, never nominations. Three kinds of win are tracked, and the leaderboard lets you switch the
          last two off:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Award ceremonies</strong> such as MAMA, the Melon Music Awards, the Golden Disc Awards, the Billboard Music
            Awards or the MTV VMAs. These are dated by ceremony year, which is how the sources list them. A Golden Disc
            trophy handed out in January 2023 for 2022 releases counts in 2023.
          </li>
          <li>
            <strong>Music show wins</strong>, the weekly first-place trophies on Inkigayo, M Countdown, Music Bank, Show!
            Music Core, Show Champion and The Show. These carry their exact broadcast date. They make up{" "}
            {totals.shows.toLocaleString("en-US")} of the {totals.total.toLocaleString("en-US")} wins.
          </li>
          <li>
            <strong>Brand and culture honors</strong> such as Brand of the Year or the Korea First Brand Awards. They are
            real awards but not music awards, so the leaderboard has a switch for them.
          </li>
        </ul>
        <p>
          A win belongs to the group only when the group itself won. Solo releases, sub-units (BSS, 3RACHA) and
          collaborations credited to a member are left out, so a member&apos;s solo hit does not add to the group&apos;s
          count.
        </p>

        <H2 id="groups">Which groups</H2>
        <p>
          The site tracks the {selection.selected.length} groups with the most wins in the period, picked from a pool of{" "}
          {selection.selected.length + selection.alsoConsidered.length} groups that were active and winning between 2020 and
          2026. The cut-off sits at {lastIn.name} with {getSummary(lastIn.slug).total} wins. These groups were counted
          too and just missed it:
        </p>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
          {selection.alsoConsidered.map((g) => (
            <li key={g.slug} className="flex justify-between border-b border-line py-1.5 text-sm">
              <span>{g.name}</span>
              <span className="tabular text-ink-3">{g.total}</span>
            </li>
          ))}
        </ul>

        <H2 id="scope">Korean or international</H2>
        <p>
          A win is Korean or international depending on <strong>who runs the show, not where it is held</strong>. MAMA is
          organized by CJ ENM in Seoul, so a MAMA trophy counts as Korean even in the years the ceremony took place in
          Japan. The Asia Star Entertainer Awards are run by Korean media outlets, so they count as Korean
          too. The Billboard Music Awards, the Japan Gold Disc Award and the Asian Pop Music Awards (run from Hong Kong and
          London) count as international.
        </p>
        <p>
          Music shows are Korean broadcasts, so they always count as Korean. On charts they get their own color so you can
          see how much of a group&apos;s Korean total comes from weekly shows.
        </p>
        <p>
          The tracked groups won at {ceremonies.filter((c) => c.scope === "domestic").length} Korean and{" "}
          {ceremonies.filter((c) => c.scope === "international").length} international ceremonies and honors, plus the six
          music shows. The{" "}
          <Link href="/ceremonies/" className="font-medium text-ink underline underline-offset-4">
            ceremonies page
          </Link>{" "}
          lists each one with its country.
        </p>

        <H2 id="tiers">Daesang and bonsang</H2>
        <p>
          Korean ceremonies give a small number of <strong>daesang</strong> (grand prizes, such as Artist, Album, Song or
          Record of the Year) and a larger set of <strong>bonsang</strong> (main prizes, usually a Top 10 or Best 10). A win
          is marked daesang when its category says so, or when it is one of a ceremony&apos;s grand-prize categories (for
          example MAMA&apos;s Worldwide Icon of the Year or the Melon Music Awards&apos; four year-end awards). The{" "}
          {ranked.length} groups won {totals.daesang} daesang between them. International awards are never marked as either.
        </p>

        <H2 id="sources">Sources</H2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Ceremony wins:</strong> each group&apos;s Wikipedia &ldquo;List of awards and nominations&rdquo; article,
            or the Accolades table in the group&apos;s main article when no list exists.
          </li>
          <li>
            <strong>Music show wins:</strong> Wikipedia&apos;s yearly winner lists for each of the six shows (for example
            &ldquo;List of Inkigayo Chart winners (2024)&rdquo;). These cover every artist, so they are the most complete part
            of the data.
          </li>
          <li>
            <strong>Profiles</strong> (Korean name, debut, label, fandom, official colors, members): the K-pop Fandom wiki.
          </li>
          <li>
            <strong>Photos:</strong> {photos} freely licensed photos from Wikimedia Commons, each credited with its author and
            license on the group page and in the photo viewer. Groups or members with no free photo get a plain initial
            instead of a borrowed picture.
          </li>
          <li>
            <strong>Listen links and cover art:</strong> Apple&apos;s iTunes Search for Apple Music links, cover art and release
            dates; YouTube Music search for YouTube Music links; Wikidata for the Spotify IDs it holds. Of {releases.length}{" "}
            awarded releases, {exact("appleMusic")} link straight to Apple Music, {exact("youtubeMusic")} to YouTube Music and{" "}
            {exact("spotify")} to Spotify. The rest open a search for the group and title on that service, shown with a dashed
            border.
          </li>
        </ul>

        <H2 id="limits">Known gaps</H2>
        <ul className="list-disc space-y-2 pl-5">
          <li>{meta.dataTo.slice(0, 4)} is a partial year, so it looks smaller than the years before it.</li>
          <li>
            Smaller groups&apos; award tables on Wikipedia get less attention than BTS&apos;s or SEVENTEEN&apos;s, so their
            ceremony counts are more likely to miss minor awards. Music show counts do not have this problem.
          </li>
          <li>
            Spotify has no free search API, so most Spotify buttons open a search. Adding a Spotify developer key when
            refreshing the data turns them into direct links (see below).
          </li>
          <li>
            A Wikipedia mistake carries over until it is fixed there or overridden in this site&apos;s corrections file. The
            source link on every win shows exactly where it came from.
          </li>
        </ul>

        <H2 id="refresh">Updating the data</H2>
        <p>
          The data is rebuilt with scripts, not typed by hand. In the project folder, <code className="rounded bg-surface-2 px-1.5 py-0.5 text-sm text-ink">npm run data:refresh</code>{" "}
          re-reads every source, picks the top {selection.selected.length} again, downloads photos and cover art, and
          checks the result. A build refuses to finish if any win has an unknown ceremony, a date out of range, a duplicate,
          or a missing source. Set <code className="rounded bg-surface-2 px-1.5 py-0.5 text-sm text-ink">SPOTIFY_CLIENT_ID</code> and{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 text-sm text-ink">SPOTIFY_CLIENT_SECRET</code> first to get
          direct Spotify links. Wins that need fixing by hand go in{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 text-sm text-ink">src/data/corrections.json</code>, each with a
          written reason.
        </p>
        <p>This is a fan project with no ties to any agency, broadcaster or awards show.</p>
      </div>
    </div>
  );
}

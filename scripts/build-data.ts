/**
 * Turns the raw scrapes (.cache/raw/*.json) into the site's data files:
 *   src/data/ceremonies.json, src/data/awards/<slug>.json, src/data/releases/<slug>.json (stubs),
 *   src/data/meta.json. Manual fixes live in src/data/corrections.json and are applied last.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { CEREMONIES } from "./ceremonies.config";
import { GROUP_SOURCES } from "./groups.config";
import type { RawCeremonyWin } from "./scrape-ceremonies";
import type { RawShowWin } from "./scrape-music-shows";
import type { Award, Ceremony, Release, Tier } from "../src/lib/schema";
import { norm } from "./lib/wiki";

const DATA_FROM = "2020-01-01";
/** The site tracks the N most-awarded groups from the candidate pool in groups.config. */
const SELECT_TOP = 30;
const DATA_TO = new Date().toISOString().slice(0, 10);

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

const readJson = <T>(p: string, fallback: T): T => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : fallback);

// ---------- ceremonies ----------
const ceremonyByAlias = new Map<string, (typeof CEREMONIES)[number]>();
for (const c of CEREMONIES) for (const n of [c.name, ...(c.aliases ?? [])]) ceremonyByAlias.set(norm(n), c);

const ceremonies: Ceremony[] = CEREMONIES.map((c) => ({
  id: c.id,
  name: c.name,
  short: c.short,
  country: c.country,
  scope: c.country === "KR" ? "domestic" : "international",
  kind: c.kind,
}));
const ceremonyById = new Map(ceremonies.map((c) => [c.id, c]));

// ---------- tiers ----------
const YEAR_TITLE = /^(visa )?(artist|album|song|record|performance|stage|singer)s? of the year( – music)?$/i;
const DAESANG_BY_TITLE: Record<string, RegExp> = {
  mama: /^(visa )?(artist|album|song) of the year$|worldwide icon of the year|fans'? choice of the year/i,
  mma: /^(artist|album|song|record) of the year$/i,
  gda: /^(artist|album|song) of the year$/i,
  aaa: YEAR_TITLE,
  genie: /^(artist|album|song|singer) of the year$/i,
};
const BONSANG = /bonsang|main prize|main award|top 10|best artist 10|best 10|ultimate 12|the platinum|millions top/i;

function tierFor(ceremony: Ceremony, category: string): Tier {
  if (ceremony.kind === "music-show") return "music-show";
  if (ceremony.kind === "award" && ceremony.scope === "domestic") {
    if (/daesang|grand prize|^grand (artist|song|record|performer|honou?r)/i.test(category)) return "daesang";
    if (DAESANG_BY_TITLE[ceremony.id]?.test(category.trim())) return "daesang";
    if (BONSANG.test(category) && !/rookie|new artist/i.test(category)) return "bonsang";
  }
  return "category";
}

// ---------- groups & matching ----------
const groupKeys = new Map<string, string>();
for (const g of GROUP_SOURCES) {
  for (const n of [g.name, g.wiki.replace(/\s*\(.*\)$/, ""), ...(g.aliases ?? [])]) groupKeys.set(norm(n), g.slug);
}
/** Sub-units and side projects listed on a parent group's page are not the group's own wins. */
const NOMINEE_EXCLUDE = /^(3racha|bss|seventeen bss|booseoksoon)$/i;

type Draft = Omit<Award, "id"> & { group: string; workType?: "song" | "album" };
const drafts: Draft[] = [];

const showWins = readJson<RawShowWin[]>(".cache/raw/music-shows.json", []);
for (const w of showWins) {
  const slug = groupKeys.get(norm(w.artist));
  if (!slug || w.date < DATA_FROM || w.date > DATA_TO) continue;
  drafts.push({
    group: slug,
    year: Number(w.date.slice(0, 4)),
    date: w.date,
    ceremonyId: w.show,
    category: "Music show win",
    tier: "music-show",
    work: w.song,
    workType: "song",
    sourceUrl: w.sourceUrl,
  });
}

const unmapped = new Map<string, number>();
const ceremonyWins = readJson<RawCeremonyWin[]>(".cache/raw/ceremonies.json", []);
for (const w of ceremonyWins) {
  const def = ceremonyByAlias.get(norm(w.ceremony));
  if (!def) {
    unmapped.set(w.ceremony, (unmapped.get(w.ceremony) ?? 0) + 1);
    continue;
  }
  if (NOMINEE_EXCLUDE.test(w.nominee.trim())) continue;
  if (w.year < 2020 || w.year > Number(DATA_TO.slice(0, 4))) continue;
  const ceremony = ceremonyById.get(def.id)!;
  const category = w.category.replace(/\s+/g, " ").trim() || "Award";
  drafts.push({
    group: w.group,
    year: w.year,
    ceremonyId: ceremony.id,
    category,
    tier: tierFor(ceremony, category),
    work: w.work?.title,
    workType: w.work?.type,
    sourceUrl: w.sourceUrl,
  });
}
if (unmapped.size) {
  console.warn("Unmapped ceremonies (skipped):", Object.fromEntries(unmapped));
}

// ---------- corrections ----------
type Corrections = {
  remove: { group: string; ceremonyId: string; year: number; category?: string; date?: string; reason: string }[];
  add: (Draft & { reason: string })[];
};
const corrections = readJson<Corrections>("src/data/corrections.json", { remove: [], add: [] });
let kept = drafts.filter(
  (d) =>
    !corrections.remove.some(
      (r) =>
        r.group === d.group &&
        r.ceremonyId === d.ceremonyId &&
        r.year === d.year &&
        (!r.category || r.category === d.category) &&
        (!r.date || r.date === d.date),
    ),
);
kept = kept.concat(corrections.add.map(({ reason: _r, ...d }) => d));

// ---------- releases (stubs; links filled by fetch-releases) ----------
const releaseIndex = new Map<string, Map<string, Release>>();
for (const g of GROUP_SOURCES) {
  const existing = readJson<Release[]>(`src/data/releases/${g.slug}.json`, []);
  releaseIndex.set(g.slug, new Map(existing.map((r) => [r.id, r])));
}
const searchLinks = (artist: string, title: string): Release["links"] => {
  const q = encodeURIComponent(`${artist} ${title}`);
  return {
    spotify: { url: `https://open.spotify.com/search/${q}`, verified: false },
    appleMusic: { url: `https://music.apple.com/us/search?term=${q}`, verified: false },
    youtubeMusic: { url: `https://music.youtube.com/search?q=${q}`, verified: false },
  };
};

function releaseFor(d: Draft): string | undefined {
  if (!d.work) return undefined;
  const title = d.work.replace(/\s*\((feat|with|prod)\.?[^)]*\)\s*$/i, "").trim();
  const type = d.workType ?? "song";
  const id = `${type}-${slugify(title)}`;
  if (!id.replace(/^(song|album)-/, "")) return undefined;
  const map = releaseIndex.get(d.group)!;
  // Same title already known as the other type (title track ↔ album) → reuse it.
  const other = map.get(`${type === "song" ? "album" : "song"}-${slugify(title)}`);
  if (!map.has(id) && other) return other.id;
  if (!map.has(id)) {
    const name = GROUP_SOURCES.find((g) => g.slug === d.group)!.name;
    map.set(id, { id, title, type, links: searchLinks(name, title) });
  }
  return id;
}

// ---------- selection ----------
const dedupeKey = (d: Draft) => [d.ceremonyId, d.date ?? d.year, norm(d.category), norm(d.work ?? "")].join("|");
const totals = GROUP_SOURCES.map((g) => ({
  slug: g.slug,
  name: g.name,
  total: new Set(kept.filter((d) => d.group === g.slug).map(dedupeKey)).size,
})).sort((a, b) => b.total - a.total);
const selected = new Set(totals.slice(0, SELECT_TOP).map((t) => t.slug));
writeFileSync(
  "src/data/selection.json",
  JSON.stringify({ selected: totals.slice(0, SELECT_TOP).map((t) => t.slug), alsoConsidered: totals.slice(SELECT_TOP) }, null, 1) + "\n",
);

// ---------- write ----------
mkdirSync("src/data/awards", { recursive: true });
mkdirSync("src/data/releases", { recursive: true });
for (const dir of ["src/data/awards", "src/data/releases"]) {
  for (const f of readdirSync(dir)) if (!selected.has(f.replace(/\.json$/, ""))) unlinkSync(`${dir}/${f}`);
}
const summary: string[] = [];
for (const g of GROUP_SOURCES) {
  if (!selected.has(g.slug)) continue;
  const mine = kept.filter((d) => d.group === g.slug);
  const seen = new Set<string>();
  const awards: Award[] = [];
  for (const d of mine) {
    const key = dedupeKey(d);
    if (seen.has(key)) continue;
    seen.add(key);
    const base = d.date
      ? `${d.ceremonyId}-${d.date}`
      : `${d.ceremonyId}-${d.year}-${slugify(d.category)}${d.work ? "-" + slugify(d.work) : ""}`;
    let id = base;
    for (let i = 2; awards.some((a) => a.id === id); i++) id = `${base}-${i}`;
    const { group: _g, workType: _t, ...rest } = d;
    awards.push({ id, ...rest, releaseId: releaseFor(d) });
  }
  awards.sort((a, b) => (b.date ?? `${b.year}-12-31`).localeCompare(a.date ?? `${a.year}-12-31`) || a.ceremonyId.localeCompare(b.ceremonyId));
  writeFileSync(`src/data/awards/${g.slug}.json`, JSON.stringify(awards, null, 1) + "\n");

  const used = new Set(awards.map((a) => a.releaseId).filter(Boolean));
  const releases = [...releaseIndex.get(g.slug)!.values()].filter((r) => used.has(r.id));
  releases.sort((a, b) => a.title.localeCompare(b.title));
  writeFileSync(`src/data/releases/${g.slug}.json`, JSON.stringify(releases, null, 1) + "\n");

  const shows = awards.filter((a) => a.tier === "music-show").length;
  const daesang = awards.filter((a) => a.tier === "daesang").length;
  summary.push(`${g.slug.padEnd(16)} total ${String(awards.length).padStart(4)}  shows ${String(shows).padStart(3)}  daesang ${daesang}  releases ${releases.length}`);
}
writeFileSync("src/data/ceremonies.json", JSON.stringify(ceremonies, null, 1) + "\n");
writeFileSync("src/data/meta.json", JSON.stringify({ dataFrom: DATA_FROM, dataTo: DATA_TO, builtAt: new Date().toISOString() }, null, 1) + "\n");
console.log(summary.join("\n"));

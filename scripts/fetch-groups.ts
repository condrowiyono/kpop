/**
 * Builds src/data/groups.json: profile facts from the K-pop Fandom wiki infobox
 * (Hangul name, debut, label, fandom, official colors, members) and freely licensed
 * photos from Wikimedia Commons (hero, gallery, member portraits), downloaded locally.
 *
 * Usage: npx tsx scripts/fetch-groups.ts [slug ...]
 */
import * as cheerio from "cheerio";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { GROUP_SOURCES, type GroupSource } from "./groups.config";
import { categoryFiles, commonsFiles, commonsInfoToRef, saveImage, saveLogo, subcategories, type ImageRef } from "./lib/commons";
import { fetchJson } from "./lib/http";
import { clean, parsePage } from "./lib/wiki";

const OUT = "src/data/groups.json";

/** Not reliably machine-readable anywhere, so kept by hand. */
const PROFILE: Record<
  string,
  { type: "boy" | "girl"; generation: 3 | 4 | 5; fandomPage?: string; fandom?: string; accent?: string }
> = {
  bts: { type: "boy", generation: 3 },
  blackpink: { type: "girl", generation: 3 },
  seventeen: { type: "boy", generation: 3 },
  "stray-kids": { type: "boy", generation: 4 },
  twice: { type: "girl", generation: 3 },
  newjeans: { type: "girl", generation: 4, accent: "#2D5BD7" },
  aespa: { type: "girl", generation: 4 },
  ive: { type: "girl", generation: 4, accent: "#E2264D" },
  "le-sserafim": { type: "girl", generation: 4 },
  "i-dle": { type: "girl", generation: 4 },
  enhypen: { type: "boy", generation: 4, accent: "#8B1E2F" },
  txt: { type: "boy", generation: 4, accent: "#4AA3DF" },
  "nct-127": { type: "boy", generation: 3, fandom: "NCTzen", accent: "#9FBF1E" },
  "nct-dream": { type: "boy", generation: 3, fandom: "NCTzen", accent: "#5FB83A" },
  ateez: { type: "boy", generation: 4, accent: "#E8730C" },
  treasure: { type: "boy", generation: 4 },
  "red-velvet": { type: "girl", generation: 3 },
  itzy: { type: "girl", generation: 4 },
  mamamoo: { type: "girl", generation: 3 },
  "the-boyz": { type: "boy", generation: 4, accent: "#D61F26" },
  nmixx: { type: "girl", generation: 4, accent: "#2B4C9B" },
  boynextdoor: { type: "boy", generation: 5, accent: "#3C8D3F" },
  riize: { type: "boy", generation: 5 },
  zerobaseone: { type: "boy", generation: 5 },
  illit: { type: "girl", generation: 5, accent: "#F08DB5" },
  babymonster: { type: "girl", generation: 5 },
  "kiss-of-life": { type: "girl", generation: 5, accent: "#C81D4B" },
  tws: { type: "boy", generation: 5, accent: "#6EA8E0" },
  kep1er: { type: "girl", generation: 4 },
  "fromis-9": { type: "girl", generation: 4, accent: "#8E6BD8" },
  cortis: { type: "boy", generation: 5, accent: "#1F7A5C" },
  hearts2hearts: { type: "girl", generation: 5, accent: "#E86A92" },
  stayc: { type: "girl", generation: 4, accent: "#E0457B" },
  "allday-project": { type: "boy", generation: 5 },
  meovv: { type: "girl", generation: 5 },
  "monsta-x": { type: "boy", generation: 3, accent: "#5B4B8A" },
  "oh-my-girl": { type: "girl", generation: 3, accent: "#F2A7C3" },
  "iz-one": { type: "girl", generation: 4, accent: "#E5609E" },
  day6: { type: "boy", generation: 3 },
  "nct-wish": { type: "boy", generation: 5 },
  astro: { type: "boy", generation: 3 },
  p1harmony: { type: "boy", generation: 4 },
};

type Member = { name: string; nameKo?: string; image?: ImageRef };

export type GroupRecord = {
  slug: string;
  name: string;
  nameKo?: string;
  type: "boy" | "girl" | "coed";
  generation: number;
  debutDate?: string;
  agency?: string;
  fandom?: string;
  /** Official fandom colors only; empty when the group has none. */
  colors: { hex: string; name?: string }[];
  /** UI accent: first official color, or a hand-picked one for groups without official colors. */
  accent: string;
  members: Member[];
  image?: ImageRef;
  logo?: ImageRef;
  gallery: ImageRef[];
  wikiUrl: string;
  fandomUrl?: string;
};

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

function parseDate(text: string): string | undefined {
  const m = text.toLowerCase().match(/([a-z]+)\s+(\d{1,2}),\s*(\d{4})/);
  if (!m || MONTHS.indexOf(m[1]) < 0) return undefined;
  return `${m[3]}-${String(MONTHS.indexOf(m[1]) + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

async function fandomProfile(g: GroupSource) {
  const candidates = [PROFILE[g.slug]?.fandomPage, g.name, g.name.toUpperCase(), g.wiki.replace(/ \(.*\)$/, "")].filter(Boolean) as string[];
  for (const title of candidates) {
    const page = await parsePage(title, "kpop.fandom.com");
    if (!page) continue;
    const $ = cheerio.load(page.html);
    const box = $("aside.portable-infobox").first();
    if (!box.length) continue;
    const val = (key: string) => box.find(`[data-source="${key}"] .pi-data-value`).first();
    const colors: { hex: string; name?: string }[] = [];
    const colorHtml = val("colors").html() ?? "";
    for (const m of colorHtml.matchAll(/background-color:\s*(#[0-9a-f]{3,6})[^>]*>[^<]*<\/span>\s*([^<]*)/gi)) {
      colors.push({ hex: m[1].toUpperCase(), name: clean(m[2]) || undefined });
    }
    const members = [...val("current").find("li"), ...val("inactive").find("li")].map((li) => clean($(li).text()));
    // Labels are listed one per line (often "KR: X" / "JP: Y"); the first one is the Korean label.
    const firstLine = (el: ReturnType<typeof val>) =>
      clean(
        (el.html() ?? "")
          .split(/<br\s*\/?>|<\/li>|<\/p>|<\/div>/i)
          .map((part) => cheerio.load(part).text())
          .find((t) => clean(t)) ?? "",
      );
    const label = (clean(val("label").find("a").first().text()) || firstLine(val("label")))
      .replace(/^[A-Za-z .]+:\s*/, "")
      .split(/\s*\(|\s*\[/)[0];
    return {
      url: page.url,
      nameKo: firstLine(val("hangul")).split(/\s*[(/]/)[0] || undefined,
      debutDate: parseDate(val("debut").text()),
      agency: label || undefined,
      fandom: clean(val("fandom").text()).replace(/\s*\(.*$/, "") || undefined,
      colors,
      members: members.filter(Boolean),
    };
  }
  console.warn(`  ! no fandom profile for ${g.slug}`);
  return null;
}

type WikiQuery = {
  query: {
    pages: { title: string; pageimage?: string; pageprops?: { wikibase_item?: string } }[];
    redirects?: { from: string; to: string }[];
    normalized?: { from: string; to: string }[];
  };
};

async function wikiPages(titles: string[]) {
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1` +
    `&prop=pageimages|pageprops&piprop=name&titles=${encodeURIComponent(titles.join("|"))}`;
  const data = await fetchJson<WikiQuery>(url);
  const resolve = new Map<string, string>();
  for (const n of data.query.normalized ?? []) resolve.set(n.from, n.to);
  for (const r of data.query.redirects ?? []) resolve.set(r.from, r.to);
  const byTitle = new Map(data.query.pages.map((p) => [p.title, p]));
  return (t: string) => {
    let cur = t;
    for (let i = 0; i < 3 && resolve.has(cur); i++) cur = resolve.get(cur)!;
    return byTitle.get(cur);
  };
}

/** Wikipedia infobox member links, so each member resolves to their own article. */
async function wikiMemberLinks(g: GroupSource): Promise<{ name: string; title: string }[]> {
  const page = await parsePage(g.wiki);
  if (!page) return [];
  const $ = cheerio.load(page.html);
  const row = $("table.infobox tr").filter((_, tr) => /^(members|past members|former members)$/i.test(clean($(tr).find("th").first().text())));
  return row
    .find("td a")
    .toArray()
    .map((a) => ({ name: clean($(a).text()), title: decodeURIComponent(($(a).attr("href") ?? "").replace(/^\/wiki\//, "")).replace(/_/g, " ") }))
    .filter((m) => m.name && m.title && !m.title.startsWith("#") && !/^(Help|File):/.test(m.title));
}

type WikidataClaims = Record<string, { mainsnak: { datavalue?: { value: string } } }[]>;

/** Commons category (P373) and logo file (P154) from the group's Wikidata item. */
async function wikidataFacts(qid?: string): Promise<{ category?: string; logoFile?: string }> {
  if (!qid) return {};
  const data = await fetchJson<{ entities: Record<string, { claims: WikidataClaims }> }>(
    `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`,
  );
  const claims = data.entities[qid]?.claims ?? {};
  const cat = claims.P373?.[0]?.mainsnak.datavalue?.value;
  // The newest logo is usually listed last.
  const logos = claims.P154 ?? [];
  const logoFile = logos[logos.length - 1]?.mainsnak.datavalue?.value;
  return { category: cat ? `Category:${cat}` : undefined, logoFile };
}

/** Hand-picked Commons logo files, for groups whose Wikidata item has none or an outdated one. */
const LOGO_OVERRIDES: Record<string, string> = {};

async function groupLogo(slug: string, file?: string): Promise<ImageRef | undefined> {
  file = LOGO_OVERRIDES[slug] ?? file;
  if (!file) return undefined;
  const info = (await commonsFiles([file], 800)).get(`File:${file.replace(/_/g, " ")}`);
  const ref = info && commonsInfoToRef(info);
  if (!ref) {
    console.warn(`  ! ${slug} logo is not freely licensed or missing`);
    return undefined;
  }
  return saveLogo(ref, slug);
}

async function gallery(slug: string, category: string | undefined, heroSource?: string): Promise<ImageRef[]> {
  if (!category) return [];
  // Breadth-first through subcategories ("X by year" → "X in 2024" …); member-only
  // categories go last so group shots win when both exist.
  const queue = [category];
  const seen = new Set(queue);
  const memberCats: string[] = [];
  const byTitle = new Map<string, Awaited<ReturnType<typeof categoryFiles>>[number]>();
  for (let visits = 0; queue.length && visits < 16 && byTitle.size < 40; visits++) {
    const cat = queue.shift()!;
    for (const p of await categoryFiles(cat, 1280, 30)) byTitle.set(p.title, p);
    for (const sub of await subcategories(cat)) {
      if (seen.has(sub) || /logo|album|cover|signature|discography|single|song|video|fan ?art/i.test(sub)) continue;
      seen.add(sub);
      if (/member/i.test(sub)) memberCats.push(sub);
      else queue.push(sub);
    }
    if (!queue.length && memberCats.length && byTitle.size < 8) queue.push(memberCats.shift()!);
  }
  const pages = [...byTitle.values()];
  const picks = pages
    .filter((p) => /\.(jpe?g|png|webp)$/i.test(p.title) && !/logo|cover|poster|signature|autograph/i.test(p.title))
    .map((p) => commonsInfoToRef(p))
    .filter((r): r is NonNullable<typeof r> => !!r && r.width >= 900 && r.sourceUrl !== heroSource)
    // Landscape group shots first; they read best in the gallery strip.
    .sort((a, b) => b.width / b.height - a.width / a.height)
    .slice(0, 8);
  const out: ImageRef[] = [];
  for (const [i, ref] of picks.entries()) out.push(await saveImage(ref, "images/gallery", `${slug}-${i + 1}`));
  return out;
}

const fold = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Members without their own Wikipedia photo often still have a Commons category
 * ("Sung Han-bin (Zerobaseone)"). Take the first freely licensed portrait-ish file from it.
 */
async function memberFromCommons(g: GroupSource, name: string): Promise<ImageRef | undefined> {
  const q = encodeURIComponent(`${name} ${g.name}`);
  const data = await fetchJson<{ query?: { search: { title: string }[] } }>(
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srnamespace=14&srlimit=8&srsearch=${q}`,
  );
  const groupKey = fold(g.name).slice(0, 4);
  const cat = data.query?.search.find((r) => {
    const t = fold(r.title);
    return t.includes(fold(name)) && (t.includes(groupKey) || t === fold(`Category:${name}`));
  });
  if (!cat) return undefined;
  const pages = await categoryFiles(cat.title, 480, 25);
  const ref = pages
    .filter((p) => /\.(jpe?g|png)$/i.test(p.title) && !/logo|signature|autograph/i.test(p.title))
    .map((p) => commonsInfoToRef(p))
    .find((r) => r && r.height >= r.width * 0.9);
  return ref ? saveImage(ref, "images/members", `${g.slug}-${fold(name)}`) : undefined;
}

async function buildGroup(g: GroupSource): Promise<GroupRecord> {
  const profile = await fandomProfile(g);
  const lookup = await wikiPages([g.wiki]);
  const main = lookup(g.wiki);

  let image: ImageRef | undefined;
  if (main?.pageimage) {
    const info = (await commonsFiles([main.pageimage], 1600)).get(`File:${main.pageimage.replace(/_/g, " ")}`);
    const ref = info && commonsInfoToRef(info);
    if (ref) image = await saveImage(ref, "images/groups", g.slug);
    else console.warn(`  ! ${g.slug} infobox image is not freely licensed`);
  }

  const { category, logoFile } = await wikidataFacts(main?.pageprops?.wikibase_item);
  const logo = await groupLogo(g.slug, logoFile);
  const galleryImages = await gallery(g.slug, category, image?.sourceUrl);

  // Members: Fandom gives the current roster; Wikipedia links give each member's own article photo.
  const links = await wikiMemberLinks(g);
  const names = profile?.members.length ? profile.members : links.map((l) => l.name);
  const memberPages = links.length ? await wikiPages(links.map((l) => l.title)) : () => undefined;
  const files = new Map<string, string>();
  for (const l of links) {
    const p = memberPages(l.title);
    if (p?.pageimage) files.set(fold(l.name), p.pageimage);
  }
  const fileInfo = files.size ? await commonsFiles([...files.values()], 480) : new Map();
  const members: Member[] = [];
  for (const name of names) {
    const file = files.get(fold(name)) ?? [...files.entries()].find(([k]) => k.startsWith(fold(name)) || fold(name).startsWith(k))?.[1];
    let img: ImageRef | undefined;
    if (file) {
      const ref = commonsInfoToRef(fileInfo.get(`File:${file.replace(/_/g, " ")}`) ?? { title: "" });
      if (ref) img = await saveImage(ref, "images/members", `${g.slug}-${fold(name)}`);
    }
    img ??= await memberFromCommons(g, name);
    members.push({ name, image: img });
  }

  // No freely licensed infobox photo: promote the first gallery shot to the hero.
  if (!image && galleryImages.length) image = galleryImages.shift();
  const colors = profile?.colors ?? [];
  const accent = colors[0]?.hex ?? PROFILE[g.slug]?.accent ?? "#3A3A3A";

  return {
    slug: g.slug,
    name: g.name,
    nameKo: profile?.nameKo,
    type: PROFILE[g.slug]?.type ?? "boy",
    generation: PROFILE[g.slug]?.generation ?? 4,
    debutDate: profile?.debutDate,
    agency: profile?.agency,
    fandom: PROFILE[g.slug]?.fandom ?? profile?.fandom,
    colors,
    accent,
    members,
    image,
    logo,
    gallery: galleryImages,
    wikiUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(g.wiki.replace(/ /g, "_"))}`,
    fandomUrl: profile?.url,
  };
}

async function main() {
  // Default to the groups build-data selected; pass slugs to target others.
  const selection = existsSync("src/data/selection.json")
    ? (JSON.parse(readFileSync("src/data/selection.json", "utf8")).selected as string[])
    : [];
  const only = process.argv.slice(2).length ? process.argv.slice(2) : selection;
  const existing: GroupRecord[] = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : [];
  const bySlug = new Map(existing.map((g) => [g.slug, g]));
  for (const g of GROUP_SOURCES) {
    if (only.length && !only.includes(g.slug)) continue;
    const rec = await buildGroup(g);
    bySlug.set(g.slug, rec);
    console.log(
      `${g.slug}: hero=${rec.image ? "yes" : "NO"} logo=${rec.logo ? "yes" : "no"} gallery=${rec.gallery.length} members=${rec.members.length} ` +
        `(${rec.members.filter((m) => m.image).length} photos) colors=${rec.colors.length} fandom=${rec.fandom ?? "-"}`,
    );
  }
  const keep = new Set(selection.length ? selection : GROUP_SOURCES.map((g) => g.slug));
  const ordered = GROUP_SOURCES.filter((g) => keep.has(g.slug)).map((g) => bySlug.get(g.slug)).filter(Boolean);
  writeFileSync(OUT, JSON.stringify(ordered, null, 2) + "\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

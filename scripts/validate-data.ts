/**
 * Data integrity gate, run before every build (npm run prebuild).
 * Fails on: schema errors, dates outside 2020-01-01..today, unknown ceremony/group/release ids,
 * duplicate awards, missing sources, and image paths that do not exist in public/.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { awardSchema, ceremonySchema, groupSchema, releaseSchema, type ImageRef } from "../src/lib/schema";

const errors: string[] = [];
const warnings: string[] = [];
const read = (p: string) => JSON.parse(readFileSync(path.join("src/data", p), "utf8"));
const today = new Date().toISOString().slice(0, 10);

function check<T>(schema: z.ZodType<T>, value: unknown, where: string): T | null {
  const r = schema.safeParse(value);
  if (r.success) return r.data;
  for (const issue of r.error.issues) errors.push(`${where}: ${issue.path.join(".")} ${issue.message}`);
  return null;
}

function checkImage(img: ImageRef | undefined, where: string) {
  if (!img) return;
  if (!existsSync(path.join("public", img.src))) errors.push(`${where}: image file missing ${img.src}`);
  if (img.thumb && !existsSync(path.join("public", img.thumb))) errors.push(`${where}: thumbnail missing ${img.thumb}`);
}

const selection = read("selection.json") as { selected: string[] };
const groups = z.array(groupSchema).safeParse(read("groups.json"));
if (!groups.success) {
  for (const issue of groups.error.issues) errors.push(`groups.json: ${issue.path.join(".")} ${issue.message}`);
}
const groupList = groups.success ? groups.data : [];
const ceremonies = check(z.array(ceremonySchema), read("ceremonies.json"), "ceremonies.json") ?? [];
const ceremonyIds = new Set(ceremonies.map((c) => c.id));

let awardCount = 0;
let releaseCount = 0;
const unverified = { spotify: 0, appleMusic: 0, youtubeMusic: 0 };

for (const slug of selection.selected) {
  const g = groupList.find((x) => x.slug === slug);
  if (!g) {
    errors.push(`groups.json: selected group "${slug}" has no profile (run scripts/fetch-groups.ts)`);
    continue;
  }
  checkImage(g.image, `${slug} hero`);
  checkImage(g.logo, `${slug} logo`);
  g.gallery.forEach((img, i) => checkImage(img, `${slug} gallery[${i}]`));
  g.members.forEach((m) => checkImage(m.image, `${slug} member ${m.name}`));
  if (!g.image) warnings.push(`${slug}: no hero photo, the monogram fallback will show`);

  const releases = check(z.array(releaseSchema), read(`releases/${slug}.json`), `releases/${slug}.json`) ?? [];
  const releaseIds = new Set(releases.map((r) => r.id));
  for (const r of releases) {
    releaseCount++;
    if (r.artwork && !existsSync(path.join("public", r.artwork))) errors.push(`releases/${slug}.json: artwork missing ${r.artwork}`);
    for (const p of ["spotify", "appleMusic", "youtubeMusic"] as const) if (!r.links[p].verified) unverified[p]++;
  }

  const awards = check(z.array(awardSchema), read(`awards/${slug}.json`), `awards/${slug}.json`) ?? [];
  const ids = new Set<string>();
  const keys = new Set<string>();
  for (const a of awards) {
    awardCount++;
    const where = `awards/${slug}.json ${a.id}`;
    if (ids.has(a.id)) errors.push(`${where}: duplicate id`);
    ids.add(a.id);
    const key = [a.ceremonyId, a.date ?? a.year, a.category.toLowerCase(), (a.work ?? "").toLowerCase()].join("|");
    if (keys.has(key)) errors.push(`${where}: duplicate award (${key})`);
    keys.add(key);
    if (!ceremonyIds.has(a.ceremonyId)) errors.push(`${where}: unknown ceremony ${a.ceremonyId}`);
    if (a.releaseId && !releaseIds.has(a.releaseId)) errors.push(`${where}: unknown release ${a.releaseId}`);
    if (a.year < 2020 || a.year > Number(today.slice(0, 4))) errors.push(`${where}: year ${a.year} out of range`);
    if (a.date && (a.date < "2020-01-01" || a.date > today)) errors.push(`${where}: date ${a.date} out of range`);
    if (a.date && Number(a.date.slice(0, 4)) !== a.year) errors.push(`${where}: date and year disagree`);
  }
}

for (const w of warnings) console.warn(`warn  ${w}`);
console.log(
  `checked ${selection.selected.length} groups, ${awardCount} awards, ${releaseCount} releases, ${ceremonies.length} ceremonies`,
);
console.log(
  `search-link fallbacks: Spotify ${unverified.spotify}, Apple Music ${unverified.appleMusic}, YouTube Music ${unverified.youtubeMusic}`,
);
if (errors.length) {
  for (const e of errors.slice(0, 50)) console.error(`error ${e}`);
  console.error(`${errors.length} error(s)`);
  process.exit(1);
}
console.log("data OK");

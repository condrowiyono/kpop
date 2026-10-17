/**
 * Build-time data access. Server components only: reads the JSON files in src/data.
 */
import "server-only";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Award, Ceremony, Group, Release } from "./schema";
import { summarize, type PackedAward, type Summary, TIERS } from "./stats";

const DATA = path.join(process.cwd(), "src", "data");
const read = <T,>(file: string, fallback?: T): T => {
  const p = path.join(DATA, file);
  if (!existsSync(p)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing data file ${p}`);
  }
  return JSON.parse(readFileSync(p, "utf8")) as T;
};

export type Meta = { dataFrom: string; dataTo: string; builtAt: string };
export type Selection = { selected: string[]; alsoConsidered: { slug: string; name: string; total: number }[] };

let cache: {
  groups: Group[];
  ceremonies: Ceremony[];
  ceremonyMap: Map<string, Ceremony>;
  awards: Map<string, Award[]>;
  releases: Map<string, Release[]>;
  summaries: Map<string, Summary>;
  ranking: string[];
} | null = null;

function load() {
  if (cache) return cache;
  const selection = read<Selection>("selection.json");
  const allGroups = read<Group[]>("groups.json");
  const groups = selection.selected
    .map((slug) => allGroups.find((g) => g.slug === slug))
    .filter((g): g is Group => !!g);
  const ceremonies = read<Ceremony[]>("ceremonies.json");
  const ceremonyMap = new Map(ceremonies.map((c) => [c.id, c]));
  const awards = new Map(groups.map((g) => [g.slug, read<Award[]>(`awards/${g.slug}.json`, [])]));
  const releases = new Map(groups.map((g) => [g.slug, read<Release[]>(`releases/${g.slug}.json`, [])]));
  const summaries = new Map(groups.map((g) => [g.slug, summarize(awards.get(g.slug)!, ceremonyMap)]));
  const ranking = [...groups]
    .sort((a, b) => summaries.get(b.slug)!.total - summaries.get(a.slug)!.total || a.name.localeCompare(b.name))
    .map((g) => g.slug);
  cache = { groups, ceremonies, ceremonyMap, awards, releases, summaries, ranking };
  return cache;
}

export const getGroups = () => load().groups;
export const getGroup = (slug: string) => load().groups.find((g) => g.slug === slug);
export const getCeremonies = () => load().ceremonies;
export const getCeremonyMap = () => load().ceremonyMap;
export const getAwards = (slug: string) => load().awards.get(slug) ?? [];
export const getReleases = (slug: string) => load().releases.get(slug) ?? [];
export const getSummary = (slug: string) => load().summaries.get(slug)!;
export const getRanking = () => load().ranking;
export const getRank = (slug: string) => load().ranking.indexOf(slug) + 1;
export const getMeta = () => read<Meta>("meta.json");
export const getSelection = () => read<Selection>("selection.json");

/** Groups ordered by all-time total, as the leaderboard shows them by default. */
export const getRankedGroups = () => load().ranking.map((slug) => getGroup(slug)!);

/** Every tracked award in compact form for client-side filtering. */
export function getPackedAwards(): PackedAward[] {
  const { groups, awards, ceremonies } = load();
  const cIndex = new Map(ceremonies.map((c, i) => [c.id, i]));
  const out: PackedAward[] = [];
  groups.forEach((g, gi) => {
    for (const a of awards.get(g.slug) ?? []) {
      const ci = cIndex.get(a.ceremonyId);
      if (ci === undefined) continue;
      out.push([gi, a.year, ci, TIERS.indexOf(a.tier)]);
    }
  });
  return out;
}

export type ReleaseWins = Release & { wins: number; daesang: number; musicShows: number };

/** Releases with their win counts, most-awarded first. */
export function getReleaseWins(slug: string): ReleaseWins[] {
  const counts = new Map<string, { wins: number; daesang: number; musicShows: number }>();
  for (const a of getAwards(slug)) {
    if (!a.releaseId) continue;
    const c = counts.get(a.releaseId) ?? { wins: 0, daesang: 0, musicShows: 0 };
    c.wins++;
    if (a.tier === "daesang") c.daesang++;
    if (a.tier === "music-show") c.musicShows++;
    counts.set(a.releaseId, c);
  }
  return getReleases(slug)
    .map((r) => ({ ...r, ...(counts.get(r.id) ?? { wins: 0, daesang: 0, musicShows: 0 }) }))
    .filter((r) => r.wins > 0)
    .sort((a, b) => b.wins - a.wins || (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""));
}

/** Per-ceremony winners across tracked groups, for the ceremonies page. */
export function getCeremonyWinners() {
  const { groups, awards } = load();
  const out = new Map<string, { year: number; slug: string; category: string; tier: Award["tier"]; work?: string; date?: string }[]>();
  for (const g of groups) {
    for (const a of awards.get(g.slug) ?? []) {
      const list = out.get(a.ceremonyId) ?? [];
      list.push({ year: a.year, slug: g.slug, category: a.category, tier: a.tier, work: a.work, date: a.date });
      out.set(a.ceremonyId, list);
    }
  }
  return out;
}

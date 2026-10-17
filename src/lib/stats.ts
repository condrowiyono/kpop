/**
 * Pure counting helpers shared by server pages and client widgets.
 * Everything here works on plain arrays so it can run on either side.
 */
import type { Award, Ceremony, Tier } from "./schema";

export const FIRST_YEAR = 2020;
export const LAST_YEAR = 2026;
export const YEARS = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);

export type Scope = "all" | "domestic" | "international";

export type Filter = {
  from: number;
  to: number;
  scope: Scope;
  /** Weekly music-show wins (Inkigayo, M Countdown, …). */
  musicShows: boolean;
  /** Brand, broadcast and culture honors that are not music awards. */
  other: boolean;
};

export const DEFAULT_FILTER: Filter = {
  from: FIRST_YEAR,
  to: LAST_YEAR,
  scope: "all",
  musicShows: true,
  other: true,
};

/** The three stacks every chart uses. Music shows are Korean, so they also count as domestic. */
export type Bucket = "domestic" | "musicShows" | "international";
export const BUCKETS: Bucket[] = ["domestic", "musicShows", "international"];
export const BUCKET_LABEL: Record<Bucket, string> = {
  domestic: "Korean awards",
  musicShows: "Music shows",
  international: "International",
};

export function bucketOf(c: Pick<Ceremony, "scope" | "kind">): Bucket {
  if (c.kind === "music-show") return "musicShows";
  return c.scope === "domestic" ? "domestic" : "international";
}

export function passes(year: number, c: Pick<Ceremony, "scope" | "kind">, f: Filter): boolean {
  if (year < f.from || year > f.to) return false;
  if (f.scope !== "all" && c.scope !== f.scope) return false;
  if (!f.musicShows && c.kind === "music-show") return false;
  if (!f.other && c.kind === "other") return false;
  return true;
}

export type YearCounts = Record<Bucket, number> & { total: number };
const emptyCounts = (): YearCounts => ({ domestic: 0, musicShows: 0, international: 0, total: 0 });

export type Summary = {
  total: number;
  /** Korean ceremonies + Korean honors + music shows. */
  domestic: number;
  international: number;
  musicShows: number;
  daesang: number;
  bonsang: number;
  byYear: Record<number, YearCounts>;
  bestYear?: { year: number; total: number };
  ceremonies: { id: string; count: number }[];
};

type Countable = Pick<Award, "year" | "ceremonyId" | "tier">;

export function summarize(awards: Countable[], ceremonies: Map<string, Ceremony>): Summary {
  const byYear: Record<number, YearCounts> = {};
  for (const y of YEARS) byYear[y] = emptyCounts();
  const perCeremony = new Map<string, number>();
  const s: Summary = { total: 0, domestic: 0, international: 0, musicShows: 0, daesang: 0, bonsang: 0, byYear, ceremonies: [] };

  for (const a of awards) {
    const c = ceremonies.get(a.ceremonyId);
    if (!c) continue;
    const bucket = bucketOf(c);
    s.total++;
    if (c.scope === "domestic") s.domestic++;
    else s.international++;
    if (bucket === "musicShows") s.musicShows++;
    if (a.tier === "daesang") s.daesang++;
    if (a.tier === "bonsang") s.bonsang++;
    byYear[a.year] ??= emptyCounts();
    byYear[a.year][bucket]++;
    byYear[a.year].total++;
    perCeremony.set(a.ceremonyId, (perCeremony.get(a.ceremonyId) ?? 0) + 1);
  }
  for (const [year, counts] of Object.entries(byYear)) {
    if (counts.total && (!s.bestYear || counts.total > s.bestYear.total)) s.bestYear = { year: Number(year), total: counts.total };
  }
  s.ceremonies = [...perCeremony.entries()].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count);
  return s;
}

/** Compact award row sent to the browser for the leaderboard: [group, year, ceremony, tier]. */
export type PackedAward = [number, number, number, number];
export const TIERS: Tier[] = ["daesang", "bonsang", "category", "music-show"];

export const TIER_LABEL: Record<Tier, string> = {
  daesang: "Daesang",
  bonsang: "Bonsang",
  category: "Category award",
  "music-show": "Music show",
};

export function formatYears(f: Pick<Filter, "from" | "to">): string {
  if (f.from === FIRST_YEAR && f.to === LAST_YEAR) return `${FIRST_YEAR} to ${LAST_YEAR}`;
  return f.from === f.to ? String(f.from) : `${f.from} to ${f.to}`;
}

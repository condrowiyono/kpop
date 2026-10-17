import { passes, TIERS, YEARS, type Filter, type PackedAward } from "@/lib/stats";
import type { BoardState } from "@/lib/url-filter";

export type LiteGroup = {
  slug: string;
  name: string;
  nameKo?: string;
  accent: string;
  type: "boy" | "girl" | "coed";
  generation: number;
  photo?: { src: string; width: number; height: number };
  topRelease?: { title: string; artwork?: string };
};

export type LiteCeremony = { scope: "domestic" | "international"; kind: "award" | "music-show" | "other" };

export type GroupStats = {
  group: LiteGroup;
  /** Index into the input group list, stable across filters. */
  index: number;
  total: number;
  domestic: number;
  musicShows: number;
  international: number;
  koreanAwards: number;
  daesang: number;
  byYear: number[];
};

const DAESANG = TIERS.indexOf("daesang");

export function computeStats(groups: LiteGroup[], ceremonies: LiteCeremony[], awards: PackedAward[], f: Filter): GroupStats[] {
  const stats: GroupStats[] = groups.map((group, index) => ({
    group,
    index,
    total: 0,
    domestic: 0,
    musicShows: 0,
    international: 0,
    koreanAwards: 0,
    daesang: 0,
    byYear: YEARS.map(() => 0),
  }));
  for (const [gi, year, ci, tier] of awards) {
    const c = ceremonies[ci];
    if (!c || !passes(year, c, f)) continue;
    const s = stats[gi];
    s.total++;
    if (c.scope === "domestic") s.domestic++;
    else s.international++;
    if (c.kind === "music-show") s.musicShows++;
    else if (c.scope === "domestic") s.koreanAwards++;
    if (tier === DAESANG) s.daesang++;
    s.byYear[year - YEARS[0]]++;
  }
  return stats;
}

const SORTERS: Record<BoardState["sort"], (a: GroupStats, b: GroupStats) => number> = {
  total: (a, b) => b.total - a.total,
  domestic: (a, b) => b.domestic - a.domestic,
  international: (a, b) => b.international - a.international,
  daesang: (a, b) => b.daesang - a.daesang,
  musicShows: (a, b) => b.musicShows - a.musicShows,
  name: (a, b) => a.group.name.localeCompare(b.group.name),
};

export const SORT_LABEL: Record<BoardState["sort"], string> = {
  total: "Most wins",
  domestic: "Most Korean wins",
  international: "Most international wins",
  daesang: "Most daesang",
  musicShows: "Most music show wins",
  name: "Name, A to Z",
};

/** Value shown in the big number column for each sort. */
export function sortValue(s: GroupStats, sort: BoardState["sort"]): number {
  return sort === "name" ? s.total : s[sort];
}

const fold = (v: string) => v.toLowerCase().replace(/[^a-z0-9가-힣]/g, "");

/** Filters by group type, generation and search, then sorts. Rank = position under the current sort. */
export function rankGroups(stats: GroupStats[], s: BoardState): GroupStats[] {
  const q = fold(s.q);
  return stats
    .filter((x) => s.type === "all" || x.group.type === s.type)
    .filter((x) => s.gen === "all" || String(x.group.generation) === s.gen)
    .filter((x) => !q || fold(x.group.name).includes(q) || fold(x.group.nameKo ?? "").includes(q))
    .sort((a, b) => SORTERS[s.sort](a, b) || b.total - a.total || a.group.name.localeCompare(b.group.name));
}

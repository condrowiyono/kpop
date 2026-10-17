import { DEFAULT_FILTER, FIRST_YEAR, LAST_YEAR, type Filter, type Scope } from "./stats";

export type SortKey = "total" | "domestic" | "international" | "daesang" | "musicShows" | "name";
export type GroupType = "all" | "boy" | "girl";

export type BoardState = Filter & {
  sort: SortKey;
  type: GroupType;
  gen: "all" | "3" | "4" | "5";
  q: string;
};

export const DEFAULT_BOARD: BoardState = { ...DEFAULT_FILTER, sort: "total", type: "all", gen: "all", q: "" };

const clampYear = (v: string | null, fallback: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= FIRST_YEAR && n <= LAST_YEAR ? n : fallback;
};

const pick = <T extends string>(v: string | null, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;

export function parseBoard(params: URLSearchParams): BoardState {
  let from = clampYear(params.get("from"), DEFAULT_BOARD.from);
  let to = clampYear(params.get("to"), DEFAULT_BOARD.to);
  if (from > to) [from, to] = [to, from];
  return {
    from,
    to,
    scope: pick<Scope>(params.get("scope"), ["all", "domestic", "international"], "all"),
    musicShows: params.get("shows") !== "0",
    other: params.get("other") !== "0",
    sort: pick<SortKey>(params.get("sort"), ["total", "domestic", "international", "daesang", "musicShows", "name"], "total"),
    type: pick<GroupType>(params.get("type"), ["all", "boy", "girl"], "all"),
    gen: pick(params.get("gen"), ["all", "3", "4", "5"] as const, "all"),
    q: (params.get("q") ?? "").slice(0, 60),
  };
}

/** Only non-default values go in the URL, so shared links stay short. */
export function serializeBoard(s: BoardState): string {
  const p = new URLSearchParams();
  if (s.from !== DEFAULT_BOARD.from) p.set("from", String(s.from));
  if (s.to !== DEFAULT_BOARD.to) p.set("to", String(s.to));
  if (s.scope !== "all") p.set("scope", s.scope);
  if (!s.musicShows) p.set("shows", "0");
  if (!s.other) p.set("other", "0");
  if (s.sort !== "total") p.set("sort", s.sort);
  if (s.type !== "all") p.set("type", s.type);
  if (s.gen !== "all") p.set("gen", s.gen);
  if (s.q.trim()) p.set("q", s.q.trim());
  const qs = p.toString();
  return qs ? `?${qs}` : "";
}

export const isDefaultFilter = (s: Filter) =>
  s.from === DEFAULT_FILTER.from &&
  s.to === DEFAULT_FILTER.to &&
  s.scope === DEFAULT_FILTER.scope &&
  s.musicShows === DEFAULT_FILTER.musicShows &&
  s.other === DEFAULT_FILTER.other;

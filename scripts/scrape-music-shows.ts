/**
 * Collects every music-show win from Wikipedia's yearly "List of <show> Chart winners"
 * pages for 2020 → current year, and writes them to .cache/raw/music-shows.json.
 */
import * as cheerio from "cheerio";
import { mkdirSync, writeFileSync } from "node:fs";
import { headerIndex, headingsFor, parsePage, tableGrid } from "./lib/wiki";

export const SHOWS = [
  { id: "inkigayo", page: "Inkigayo" },
  { id: "m-countdown", page: "M Countdown" },
  { id: "music-bank", page: "Music Bank" },
  { id: "music-core", page: "Show! Music Core" },
  { id: "show-champion", page: "Show Champion" },
  { id: "the-show", page: "The Show" },
] as const;

export type RawShowWin = {
  show: string;
  date: string; // YYYY-MM-DD
  artist: string;
  song: string;
  sourceUrl: string;
};

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

function toIsoDate(text: string, year: number): string | null {
  const m = text.toLowerCase().match(/([a-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?/);
  if (!m) return null;
  const month = MONTHS.indexOf(m[1]);
  if (month < 0) return null;
  const y = m[3] ? Number(m[3]) : year;
  return `${y}-${String(month + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

async function scrapeYear(show: (typeof SHOWS)[number], year: number): Promise<RawShowWin[]> {
  const page = await parsePage(`List of ${show.page} Chart winners (${year})`);
  if (!page) {
    console.warn(`  ! no page for ${show.id} ${year}`);
    return [];
  }
  const $ = cheerio.load(page.html);
  const wins: RawShowWin[] = [];
  $("table.wikitable").each((_, table) => {
    // When the title redirected into the show's main article, only read that year's section.
    if (page.fragment) {
      const heads = headingsFor($, table);
      if (!heads.some((h) => h.startsWith(String(year)))) return;
    }
    const grid = tableGrid($, table);
    const hi = headerIndex(grid);
    if (!hi) return;
    const col = (name: string) => hi.headers.findIndex((h) => h.includes(name));
    const dateCol = col("date");
    const artistCol = col("artist");
    const songCol = col("song");
    if (dateCol < 0 || artistCol < 0 || songCol < 0) return;

    for (const row of grid.slice(hi.start)) {
      const dateCell = row[dateCol];
      const artistCell = row[artistCol];
      const songCell = row[songCol];
      if (!dateCell || !artistCell || !songCell) continue;
      // "No show" rows span the artist and song columns with the same cell.
      if (artistCell === songCell) continue;
      const date = toIsoDate(dateCell.text, year);
      if (!date) continue;
      const song = songCell.text.replace(/^"|"$/g, "").replace(/["“”]/g, "").trim();
      wins.push({ show: show.id, date, artist: artistCell.text, song, sourceUrl: page.url });
    }
  });
  if (!wins.length) console.warn(`  ! 0 wins parsed for ${show.id} ${year} (${page.title})`);
  return wins;
}

async function main() {
  const lastYear = new Date().getFullYear();
  const all: RawShowWin[] = [];
  for (const show of SHOWS) {
    for (let year = 2020; year <= lastYear; year++) {
      const wins = await scrapeYear(show, year);
      console.log(`${show.id} ${year}: ${wins.length}`);
      all.push(...wins);
    }
  }
  mkdirSync(".cache/raw", { recursive: true });
  writeFileSync(".cache/raw/music-shows.json", JSON.stringify(all, null, 1));
  console.log(`total ${all.length} wins`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

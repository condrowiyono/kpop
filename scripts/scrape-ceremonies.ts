/**
 * Reads each group's Wikipedia awards tables (dedicated list article, or the Accolades
 * section of the main article) and writes every *won* award from 2020 onward to
 * .cache/raw/ceremonies.json. Classification into our ceremony ids happens in build-data.
 */
import * as cheerio from "cheerio";
import { mkdirSync, writeFileSync } from "node:fs";
import { GROUP_SOURCES, type GroupSource } from "./groups.config";
import { clean, headerIndex, headingsFor, parsePage, tableGrid, type Cell } from "./lib/wiki";

export type RawCeremonyWin = {
  group: string;
  ceremony: string;
  year: number;
  category: string;
  nominee: string;
  work?: { title: string; type: "song" | "album" };
  sourceUrl: string;
};

function workFromCell(cell: Cell | undefined): RawCeremonyWin["work"] {
  if (!cell) return undefined;
  const html = cell.el.html() ?? "";
  const quoted = cell.text.match(/^["“](.+?)["”]/);
  if (quoted) return { title: quoted[1].trim(), type: "song" };
  const $ = cheerio.load(html);
  const italic = clean($("i").first().text());
  if (italic && cell.text.startsWith(italic)) return { title: italic, type: "album" };
  return undefined;
}

const SKIP_HEADINGS = /listicle|honou?r|record|certification|notes|references|see also|nomination|world record/i;

async function scrapeGroup(g: GroupSource): Promise<RawCeremonyWin[]> {
  let page = g.awardsPage ? await parsePage(g.awardsPage) : null;
  if (g.awardsPage && !page) console.warn(`  ! missing awards page for ${g.slug}, using main article`);
  page ??= await parsePage(g.wiki);
  if (!page) throw new Error(`no page for ${g.slug}`);
  const isMainArticle = page.title === g.wiki || !/^List of awards/.test(page.title);

  const $ = cheerio.load(page.html);
  const out: RawCeremonyWin[] = [];
  $("table.wikitable").each((_, table) => {
    const heads = headingsFor($, table);
    if (isMainArticle && !heads.some((h) => /accolade|award/i.test(h))) return;
    if (heads.some((h) => SKIP_HEADINGS.test(h) && !/award/i.test(h))) return;

    const grid = tableGrid($, table);
    const hi = headerIndex(grid);
    if (!hi) return;
    const find = (re: RegExp) => hi.headers.findIndex((h) => re.test(h));
    const resultCol = find(/result/);
    const yearCol = find(/^year|year/);
    const categoryCol = find(/category|award$|^award\b(?!.*ceremony)/);
    const ceremonyCol = find(/ceremony|^award( show)?s?$|organi[sz]ation|event/);
    const nomineeCol = find(/nominee|recipient|work|nominated/);
    if (resultCol < 0 || yearCol < 0) return;

    // Tables without a ceremony column sit under a heading that names the ceremony.
    const headingCeremony = heads[heads.length - 1];

    for (const row of grid.slice(hi.start)) {
      const result = row[resultCol]?.text ?? "";
      if (!/^won\b|^winner/i.test(result)) continue;
      const year = Number(row[yearCol]?.text.match(/(19|20)\d{2}/)?.[0]);
      if (!year || year < 2020) continue;
      const ceremony =
        ceremonyCol >= 0 && ceremonyCol !== categoryCol ? row[ceremonyCol]?.text : headingCeremony;
      const category = categoryCol >= 0 ? row[categoryCol]?.text ?? "" : "";
      const nomineeCell = nomineeCol >= 0 ? row[nomineeCol] : undefined;
      const nominee = nomineeCell?.text ?? g.name;
      if (!ceremony) continue;
      if (g.nomineeFilter && !g.nomineeFilter.some((f) => nominee.toLowerCase().includes(f.toLowerCase()))) {
        continue;
      }
      out.push({
        group: g.slug,
        ceremony: ceremony.replace(/\s*\(.*?\)\s*$/, "").trim(),
        year,
        category,
        nominee,
        work: workFromCell(nomineeCell),
        sourceUrl: page!.url,
      });
    }
  });
  return out;
}

async function main() {
  const only = process.argv.slice(2);
  const all: RawCeremonyWin[] = [];
  for (const g of GROUP_SOURCES) {
    if (only.length && !only.includes(g.slug)) continue;
    const wins = await scrapeGroup(g);
    console.log(`${g.slug}: ${wins.length}`);
    all.push(...wins);
  }
  mkdirSync(".cache/raw", { recursive: true });
  writeFileSync(".cache/raw/ceremonies.json", JSON.stringify(all, null, 1));
  console.log(`total ${all.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";
import { fetchJson } from "./http";

export type ParsedPage = {
  title: string;
  url: string;
  html: string;
  /** Present when the request title redirected to a section (e.g. "Show Champion#2020"). */
  fragment?: string;
};

type ParseResponse = {
  parse?: { title: string; text: string; redirects?: { tofragment?: string }[] };
  error?: { code: string; info: string };
};

export async function parsePage(title: string, host = "en.wikipedia.org"): Promise<ParsedPage | null> {
  const api =
    host === "kpop.fandom.com" ? `https://${host}/api.php` : `https://${host}/w/api.php`;
  const url = `${api}?action=parse&page=${encodeURIComponent(title)}&prop=text&redirects=1&format=json&formatversion=2`;
  const data = await fetchJson<ParseResponse>(url);
  if (!data.parse) return null;
  const pageTitle = data.parse.title;
  const base = host === "kpop.fandom.com" ? `https://${host}/wiki/` : `https://${host}/wiki/`;
  return {
    title: pageTitle,
    url: base + encodeURIComponent(pageTitle.replace(/ /g, "_")),
    html: data.parse.text,
    fragment: data.parse.redirects?.[0]?.tofragment,
  };
}

export type Cell = { text: string; el: cheerio.Cheerio<Element>; isHeader: boolean };

export function clean(text: string): string {
  return text
    .replace(/\[[^\]]*\]/g, "") // footnote markers like [12] or [a]
    .replace(/\s+/g, " ")
    .replace(/[†‡§¶*]+/g, "")
    .trim();
}

/**
 * Expands a wikitable into a rectangular grid, resolving rowspan/colspan so every
 * row has a value for every column.
 */
export function tableGrid($: cheerio.CheerioAPI, table: AnyNode): Cell[][] {
  const grid: Cell[][] = [];
  const rows = $(table).find("> tbody > tr, > thead > tr, > tr").toArray();
  rows.forEach((tr, r) => {
    grid[r] ??= [];
    let c = 0;
    $(tr)
      .children("th, td")
      .each((_, cellNode) => {
        const el = $(cellNode as Element);
        while (grid[r][c]) c++;
        const rowspan = Math.max(1, parseInt(el.attr("rowspan") ?? "1", 10) || 1);
        const colspan = Math.max(1, parseInt(el.attr("colspan") ?? "1", 10) || 1);
        const elClone = el.clone();
        elClone.find("sup, style, .sortkey, .mw-ref").remove();
        const cell: Cell = {
          text: clean(elClone.text()),
          el,
          isHeader: (cellNode as Element).tagName === "th",
        };
        for (let dr = 0; dr < rowspan; dr++) {
          for (let dc = 0; dc < colspan; dc++) {
            grid[r + dr] ??= [];
            grid[r + dr][c + dc] = cell;
          }
        }
        c += colspan;
      });
  });
  return grid;
}

/** Finds the header row (first row made only of <th>) and returns lowercase labels. */
export function headerIndex(grid: Cell[][]): { headers: string[]; start: number } | null {
  for (let i = 0; i < Math.min(grid.length, 3); i++) {
    const row = grid[i];
    if (row && row.length > 1 && row.every((c) => c?.isHeader)) {
      return { headers: row.map((c) => c.text.toLowerCase()), start: i + 1 };
    }
  }
  return null;
}

/** Nearest preceding heading text (h2/h3/h4) for an element, walking up to top-level siblings. */
export function headingsFor($: cheerio.CheerioAPI, node: AnyNode): string[] {
  let top: cheerio.Cheerio<AnyNode> = $(node);
  while (top.parent().length && !top.parent().is(".mw-parser-output")) top = top.parent();
  const found: Record<string, string> = {};
  let cur = top.prev();
  while (cur.length) {
    const h = cur.is("h2, h3, h4") ? cur : cur.find("h2, h3, h4").last();
    if (h.length) {
      const level = h.prop("tagName")!.toLowerCase();
      if (!found[level]) found[level] = clean(h.text());
      if (level === "h2") break;
    }
    cur = cur.prev();
  }
  return ["h2", "h3", "h4"].map((l) => found[l]).filter(Boolean) as string[];
}

export const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9가-힣]/g, "");

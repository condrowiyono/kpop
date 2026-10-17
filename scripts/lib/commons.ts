import * as cheerio from "cheerio";
import { execFileSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import { download, fetchJson } from "./http";

export type ImageRef = {
  src: string;
  thumb?: string;
  width: number;
  height: number;
  credit: string;
  license: string;
  licenseUrl?: string;
  sourceUrl: string;
  caption?: string;
};

type ImageInfo = {
  thumburl?: string;
  thumbwidth?: number;
  thumbheight?: number;
  width: number;
  height: number;
  mime: string;
  descriptionurl: string;
  extmetadata?: Record<string, { value: string }>;
};

type CommonsPage = { title: string; missing?: boolean; imageinfo?: ImageInfo[] };

const COMMONS = "https://commons.wikimedia.org/w/api.php";
const stripHtml = (html = "") => cheerio.load(html).text().replace(/\s+/g, " ").trim();

/** Licenses we can redistribute with attribution. Anything else (fair use, unknown) is skipped. */
const FREE = /^(cc|public domain|pd|attribution|gfdl|kogl)/i;

export function commonsInfoToRef(page: CommonsPage): Omit<ImageRef, "src"> & { url: string } | null {
  const info = page.imageinfo?.[0];
  if (!info?.thumburl) return null;
  const meta = info.extmetadata ?? {};
  const license = meta.LicenseShortName?.value ?? "";
  if (!FREE.test(license)) return null;
  const credit = stripHtml(meta.Artist?.value) || "Unknown author";
  return {
    url: info.thumburl,
    width: info.thumbwidth ?? info.width,
    height: info.thumbheight ?? info.height,
    credit: credit.length > 120 ? credit.slice(0, 117) + "…" : credit,
    license,
    licenseUrl: meta.LicenseUrl?.value,
    sourceUrl: info.descriptionurl,
    caption: stripHtml(meta.ImageDescription?.value).slice(0, 160) || undefined,
  };
}

export async function commonsFiles(fileTitles: string[], width: number): Promise<Map<string, CommonsPage>> {
  const out = new Map<string, CommonsPage>();
  for (let i = 0; i < fileTitles.length; i += 40) {
    const chunk = fileTitles.slice(i, i + 40).map((t) => (t.startsWith("File:") ? t : `File:${t}`));
    const url =
      `${COMMONS}?action=query&format=json&formatversion=2&prop=imageinfo` +
      `&iiprop=url|size|mime|extmetadata&iiurlwidth=${width}&titles=${encodeURIComponent(chunk.join("|"))}`;
    const data = await fetchJson<{
      query: { pages: CommonsPage[]; normalized?: { from: string; to: string }[] };
    }>(url);
    const back = new Map((data.query.normalized ?? []).map((n) => [n.to, n.from]));
    for (const p of data.query.pages) {
      out.set(p.title, p);
      const from = back.get(p.title);
      if (from) out.set(from, p);
    }
  }
  return out;
}

export async function categoryFiles(category: string, width: number, limit = 60): Promise<CommonsPage[]> {
  const url =
    `${COMMONS}?action=query&format=json&formatversion=2&generator=categorymembers` +
    `&gcmtitle=${encodeURIComponent(category)}&gcmtype=file&gcmlimit=${limit}` +
    `&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=${width}`;
  const data = await fetchJson<{ query?: { pages: CommonsPage[] } }>(url);
  return data.query?.pages ?? [];
}

export async function subcategories(category: string): Promise<string[]> {
  const url =
    `${COMMONS}?action=query&format=json&formatversion=2&list=categorymembers` +
    `&cmtitle=${encodeURIComponent(category)}&cmtype=subcat&cmlimit=50`;
  const data = await fetchJson<{ query?: { categorymembers: { title: string }[] } }>(url);
  return data.query?.categorymembers.map((c) => c.title) ?? [];
}

/** Downloads a Commons thumbnail into public/ and returns the public ImageRef. */
export async function saveImage(
  ref: Omit<ImageRef, "src"> & { url: string },
  publicDir: string,
  baseName: string,
): Promise<ImageRef> {
  const ext = (path.extname(new URL(ref.url).pathname) || ".jpg").toLowerCase();
  const jpgRel = `${publicDir}/${baseName}.jpg`;
  const jpgAbs = path.join(process.cwd(), "public", jpgRel);
  const { url: _url, ...rest } = ref;
  if (existsSync(jpgAbs)) return { src: `/${jpgRel}`, ...rest };
  if (ext === ".jpg" || ext === ".jpeg") {
    await download(ref.url, jpgAbs);
    return { src: `/${jpgRel}`, ...rest };
  }
  // PNG/WebP thumbnails are several times heavier than JPEG for photos; convert with macOS sips.
  const rawAbs = path.join(process.cwd(), "public", `${publicDir}/${baseName}${ext}`);
  await download(ref.url, rawAbs);
  try {
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "82", rawAbs, "--out", jpgAbs], { stdio: "ignore" });
    unlinkSync(rawAbs);
    return { src: `/${jpgRel}`, ...rest };
  } catch {
    return { src: `/${publicDir}/${baseName}${ext}`, ...rest };
  }
}

/**
 * Downloads a logo without the JPEG conversion saveImage does, so transparency survives.
 * SVG files come back from Commons as PNG thumbnails at the requested width.
 */
export async function saveLogo(ref: Omit<ImageRef, "src"> & { url: string }, baseName: string): Promise<ImageRef> {
  const ext = (path.extname(new URL(ref.url).pathname) || ".png").toLowerCase();
  const rel = `images/logos/${baseName}${ext}`;
  const { url: _url, ...rest } = ref;
  const abs = path.join(process.cwd(), "public", rel);
  if (!existsSync(abs)) await download(ref.url, abs);
  return { src: `/${rel}`, ...rest };
}

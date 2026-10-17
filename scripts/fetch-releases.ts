/**
 * Resolves streaming links and cover art for every release referenced by an award.
 *
 *   Apple Music  → iTunes Search API (no key). Also supplies cover art + release date.
 *   YouTube Music → music.youtube.com search endpoint (no key).
 *   Spotify      → Spotify Web API when SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET are set,
 *                  otherwise Wikidata Spotify IDs; anything unresolved keeps a search link.
 *
 * Unresolved platforms keep a search URL with verified=false. Re-running only retries
 * those, so the script is safe to run repeatedly. Usage: npx tsx scripts/fetch-releases.ts [slug ...]
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { GROUP_SOURCES, type GroupSource } from "./groups.config";
import { download, fetchJson, fetchText, sleep } from "./lib/http";
import type { Release } from "../src/lib/schema";

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\s*[-–]\s*(single|ep)$/i, "")
    .replace(/\((feat|with|prod|korean|english|japanese|eng|kor|jp)[^)]*\)/gi, "")
    .replace(/[^a-z0-9가-힣]/g, "");

function artistMatches(g: GroupSource, artist: string) {
  const a = fold(artist);
  return [g.name, g.wiki.replace(/\s*\(.*\)$/, ""), ...(g.aliases ?? [])].some((n) => fold(n) && a.includes(fold(n)));
}

// ---------- Apple Music (iTunes Search) ----------
type ITunesItem = {
  artistName: string;
  trackName?: string;
  collectionName?: string;
  trackViewUrl?: string;
  collectionViewUrl?: string;
  artworkUrl100?: string;
  releaseDate?: string;
  collectionType?: string;
};

async function apple(g: GroupSource, r: Release) {
  const entity = r.type === "song" ? "song" : "album";
  for (const country of ["US", "KR"]) {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(`${g.name} ${r.title}`)}&entity=${entity}&limit=25&country=${country}`;
    let data: { results: ITunesItem[] };
    try {
      // Apple allows roughly 20 requests a minute.
      data = await fetchJson(url, { minGapMs: 2000, retryOn: [403], backoffMs: 20000, maxAttempts: 3 });
    } catch {
      continue;
    }
    const want = fold(r.title);
    const hits = data.results
      .filter((it) => artistMatches(g, it.artistName))
      .filter((it) => fold((r.type === "song" ? it.trackName : it.collectionName) ?? "") === want)
      // Prefer the plain title over "(English Version)" / "(Japanese ver.)" twins, then the earliest release.
      .sort((a, b) => {
        const plain = (it: ITunesItem) => Number(!/\((english|japanese|korean|.*ver)/i.test((r.type === "song" ? it.trackName : it.collectionName) ?? ""));
        return plain(b) - plain(a) || (a.releaseDate ?? "").localeCompare(b.releaseDate ?? "");
      });
    const hit = hits[0];
    if (!hit) continue;
    const link = (r.type === "song" ? hit.trackViewUrl : hit.collectionViewUrl)?.replace(/[?&]uo=\d+/, "");
    if (!link) continue;
    return {
      url: link.replace("music.apple.com/kr/", "music.apple.com/us/"),
      artwork: hit.artworkUrl100?.replace(/100x100bb/, "600x600bb"),
      releaseDate: hit.releaseDate?.slice(0, 10),
      album: r.type === "song" ? hit.collectionName?.replace(/\s*-\s*(Single|EP)$/i, "") : undefined,
    };
  }
  return null;
}

// ---------- YouTube Music ----------
const YT_FILTER = { song: "EgWKAQIIAWoKEAoQAxAEEAkQBQ==", album: "EgWKAQIYAWoKEAoQAxAEEAkQBQ==" };

type Runs = { runs?: { text: string }[] };
function* findRenderers(node: unknown): Generator<Record<string, unknown>> {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const n of node) yield* findRenderers(n);
    return;
  }
  const obj = node as Record<string, unknown>;
  if (obj.musicResponsiveListItemRenderer) yield obj.musicResponsiveListItemRenderer as Record<string, unknown>;
  for (const v of Object.values(obj)) yield* findRenderers(v);
}

async function youtubeMusic(g: GroupSource, r: Release) {
  const body = JSON.stringify({
    context: { client: { clientName: "WEB_REMIX", clientVersion: "1.20250101.01.00", hl: "en", gl: "US" } },
    query: `${g.name} ${r.title}`,
    params: YT_FILTER[r.type],
  });
  let text: string;
  try {
    text = await fetchText("https://music.youtube.com/youtubei/v1/search?prettyPrint=false", {
      minGapMs: 4000,
      retryOn: [403],
      backoffMs: 20000,
      maxAttempts: 2,
      init: {
        method: "POST",
        body,
        headers: {
          "Content-Type": "application/json",
          Origin: "https://music.youtube.com",
          Referer: "https://music.youtube.com/",
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
        },
      },
    });
  } catch {
    return null;
  }
  const want = fold(r.title);
  for (const item of findRenderers(JSON.parse(text))) {
    const cols = (item.flexColumns as { musicResponsiveListItemFlexColumnRenderer: { text: Runs } }[]) ?? [];
    const title = cols[0]?.musicResponsiveListItemFlexColumnRenderer.text.runs?.map((x) => x.text).join("") ?? "";
    const subtitle = cols[1]?.musicResponsiveListItemFlexColumnRenderer.text.runs?.map((x) => x.text).join("") ?? "";
    if (fold(title) !== want || !artistMatches(g, subtitle)) continue;
    if (r.type === "song") {
      const videoId = (item.playlistItemData as { videoId?: string } | undefined)?.videoId;
      if (videoId) return `https://music.youtube.com/watch?v=${videoId}`;
    } else {
      const browseId = (item.navigationEndpoint as { browseEndpoint?: { browseId?: string } } | undefined)?.browseEndpoint?.browseId;
      if (browseId) return `https://music.youtube.com/browse/${browseId}`;
    }
  }
  return null;
}

// ---------- Spotify ----------
let spotifyToken: string | null | undefined;
async function spotifyAuth(): Promise<string | null> {
  if (spotifyToken !== undefined) return spotifyToken;
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return (spotifyToken = null);
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  spotifyToken = res.ok ? ((await res.json()) as { access_token: string }).access_token : null;
  if (!spotifyToken) console.warn("! Spotify credentials rejected; falling back to Wikidata/search links");
  return spotifyToken;
}

async function spotifyApi(g: GroupSource, r: Release): Promise<string | null> {
  const token = await spotifyAuth();
  if (!token) return null;
  const type = r.type === "song" ? "track" : "album";
  const q = encodeURIComponent(`${type === "track" ? "track" : "album"}:${r.title} artist:${g.name}`);
  await sleep(150);
  const res = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=${type}&limit=10&market=US`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Record<string, { items: { name: string; artists: { name: string }[]; external_urls: { spotify: string } }[] }>;
  const hit = data[`${type}s`]?.items.find(
    (it) => fold(it.name) === fold(r.title) && it.artists.some((a) => artistMatches(g, a.name)),
  );
  return hit?.external_urls.spotify ?? null;
}

const wikidataCache = new Map<string, Promise<Map<string, { track?: string; album?: string }>>>();

async function loadWikidataSpotify(g: GroupSource) {
  const map = new Map<string, { track?: string; album?: string }>();
  try {
    const page = await fetchJson<{ query: { pages: { pageprops?: { wikibase_item?: string } }[] } }>(
      `https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=pageprops&titles=${encodeURIComponent(g.wiki)}`,
    );
    const qid = page.query.pages[0]?.pageprops?.wikibase_item;
    if (qid) {
      const sparql = `SELECT ?itemLabel ?track ?album WHERE { ?item wdt:P175 wd:${qid} . OPTIONAL { ?item wdt:P2207 ?track } OPTIONAL { ?item wdt:P2205 ?album } FILTER(BOUND(?track) || BOUND(?album)) SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`;
      const data = await fetchJson<{ results: { bindings: Record<string, { value: string }>[] } }>(
        `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`,
        { minGapMs: 1000 },
      );
      for (const b of data.results.bindings) {
        const key = fold(b.itemLabel.value);
        const cur = map.get(key) ?? {};
        cur.track ??= b.track?.value;
        cur.album ??= b.album?.value;
        map.set(key, cur);
      }
    }
  } catch (e) {
    console.warn(`  ! wikidata lookup failed for ${g.slug}: ${(e as Error).message}`);
  }
  return map;
}

async function spotifyWikidata(g: GroupSource, r: Release): Promise<string | null> {
  if (!wikidataCache.has(g.slug)) wikidataCache.set(g.slug, loadWikidataSpotify(g));
  const hit = (await wikidataCache.get(g.slug)!).get(fold(r.title));
  if (r.type === "song" && hit?.track) return `https://open.spotify.com/track/${hit.track}`;
  if (r.type === "album" && hit?.album) return `https://open.spotify.com/album/${hit.album}`;
  return null;
}

// ---------- main ----------
async function resolveGroup(g: GroupSource) {
  const file = `src/data/releases/${g.slug}.json`;
  if (!existsSync(file)) return;
  const releases: Release[] = JSON.parse(readFileSync(file, "utf8"));
  let changed = 0;
  const resolveOne = async (r: Release) => {
    const appleStep = async () => {
      if (r.links.appleMusic.verified && r.artwork) return;
      const a = await apple(g, r);
      if (!a) return;
      r.links.appleMusic = { url: a.url, verified: true };
      r.releaseDate ??= a.releaseDate;
      if (a.album) r.album ??= a.album;
      if (a.artwork) {
        const rel = `images/releases/${g.slug}-${r.id}.jpg`;
        try {
          await download(a.artwork, path.join("public", rel));
          r.artwork = `/${rel}`;
        } catch (e) {
          console.warn(`  ! artwork ${r.title}: ${(e as Error).message}`);
        }
      }
      changed++;
    };
    const youtubeStep = async () => {
      if (r.links.youtubeMusic.verified) return;
      const y = await youtubeMusic(g, r);
      if (y) {
        r.links.youtubeMusic = { url: y, verified: true };
        changed++;
      }
    };
    const spotifyStep = async () => {
      if (r.links.spotify.verified) return;
      const sp = (await spotifyApi(g, r)) ?? (await spotifyWikidata(g, r));
      if (sp) {
        r.links.spotify = { url: sp, verified: true };
        changed++;
      }
    };
    await Promise.all([appleStep(), youtubeStep(), spotifyStep()]);
  };
  // Each host has its own throttle, so releases can be queued together without exceeding any limit.
  await Promise.all(releases.map(resolveOne));
  writeFileSync(file, JSON.stringify(releases, null, 1) + "\n");
  const count = (p: keyof Release["links"]) => releases.filter((r) => r.links[p].verified).length;
  console.log(
    `${g.slug}: ${releases.length} releases · apple ${count("appleMusic")} · youtube ${count("youtubeMusic")} · spotify ${count("spotify")} · art ${releases.filter((r) => r.artwork).length} (${changed} updates)`,
  );
}

async function main() {
  const only = process.argv.slice(2);
  const targets = GROUP_SOURCES.filter((g) => !only.length || only.includes(g.slug));
  await Promise.all(targets.map(resolveGroup));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

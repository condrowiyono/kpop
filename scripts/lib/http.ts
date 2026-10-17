import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const USER_AGENT = "kpop-awards-tracker/0.1 (https://github.com/; data build script)";
const CACHE_DIR = path.join(process.cwd(), ".cache");

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const nextAt = new Map<string, number>();

/** Reserves the next slot for a host synchronously, so concurrent callers queue instead of colliding. */
function throttle(host: string, minGapMs: number) {
  const now = Date.now();
  const at = Math.max(now, nextAt.get(host) ?? 0);
  nextAt.set(host, at + minGapMs);
  return sleep(at - now);
}

type FetchOpts = {
  /** Cache key namespace; responses are cached on disk so re-runs are free. */
  cache?: boolean;
  minGapMs?: number;
  init?: RequestInit;
  /** Extra statuses worth retrying (YouTube answers bursts with 403). */
  retryOn?: number[];
  backoffMs?: number;
  maxAttempts?: number;
};

export async function fetchText(url: string, opts: FetchOpts = {}): Promise<string> {
  const { cache = true, minGapMs = 250, init, retryOn = [], backoffMs = 1500, maxAttempts = 5 } = opts;
  const key = createHash("sha1").update(url + (init?.body ?? "")).digest("hex");
  const file = path.join(CACHE_DIR, key);
  if (cache && existsSync(file)) return readFileSync(file, "utf8");

  const host = new URL(url).host;
  for (let attempt = 1; ; attempt++) {
    await throttle(host, minGapMs);
    const res = await fetch(url, {
      ...init,
      headers: { "User-Agent": USER_AGENT, ...(init?.headers ?? {}) },
    });
    if (res.ok) {
      const text = await res.text();
      if (cache) {
        mkdirSync(CACHE_DIR, { recursive: true });
        writeFileSync(file, text);
      }
      return text;
    }
    if ((res.status === 429 || res.status >= 500 || retryOn.includes(res.status)) && attempt < maxAttempts) {
      await sleep(backoffMs * attempt);
      continue;
    }
    throw new Error(`${res.status} ${res.statusText} for ${url}`);
  }
}

export async function fetchJson<T = unknown>(url: string, opts: FetchOpts = {}): Promise<T> {
  return JSON.parse(await fetchText(url, opts)) as T;
}

export async function download(url: string, dest: string): Promise<void> {
  if (existsSync(dest)) return;
  const host = new URL(url).host;
  for (let attempt = 1; ; attempt++) {
    await throttle(host, 400);
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (res.ok) {
      mkdirSync(path.dirname(dest), { recursive: true });
      writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      return;
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      await sleep(2000 * attempt);
      continue;
    }
    throw new Error(`${res.status} downloading ${url}`);
  }
}

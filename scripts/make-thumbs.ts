/**
 * Writes small JPEG thumbnails (macOS sips) for hero and gallery photos so list views
 * stay light, and records them on each ImageRef as `thumb`. Safe to re-run.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Group, ImageRef } from "../src/lib/schema";

const FILE = "src/data/groups.json";
const groups: Group[] = JSON.parse(readFileSync(FILE, "utf8"));

function thumb(img: ImageRef | undefined, width: number): void {
  if (!img) return;
  const rel = img.src.replace(/^\/images\//, "/images/thumbs/");
  const abs = path.join("public", rel);
  if (!existsSync(abs)) {
    mkdirSync(path.dirname(abs), { recursive: true });
    execFileSync("sips", ["--resampleWidth", String(Math.min(width, img.width)), "-s", "formatOptions", "72", path.join("public", img.src), "--out", abs], {
      stdio: "ignore",
    });
  }
  img.thumb = rel;
}

for (const g of groups) {
  thumb(g.image, 720);
  g.gallery.forEach((img) => thumb(img, 560));
}
writeFileSync(FILE, JSON.stringify(groups, null, 2) + "\n");
console.log(`thumbnails ready for ${groups.length} groups`);

// Cover art is shown at 80-200px; Apple serves 600px, so shrink it in place once.
const RELEASES = "public/images/releases";
let shrunk = 0;
if (existsSync(RELEASES)) {
  for (const f of readdirSync(RELEASES).filter((x) => x.endsWith(".jpg"))) {
    const abs = path.join(RELEASES, f);
    const width = Number(execFileSync("sips", ["-g", "pixelWidth", abs]).toString().match(/pixelWidth: (\d+)/)?.[1] ?? 0);
    if (width > 320) {
      execFileSync("sips", ["--resampleWidth", "320", "-s", "formatOptions", "78", abs, "--out", abs], { stdio: "ignore" });
      shrunk++;
    }
  }
}
console.log(`cover art resized: ${shrunk}`);

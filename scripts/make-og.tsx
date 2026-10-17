/**
 * Renders the share images (public/og/*.png) and the tab icon (src/app/icon.png) as real
 * PNG files, so static hosts serve them with the right type. Run after data changes.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import type { Award, Ceremony, Group } from "../src/lib/schema";
import { summarize } from "../src/lib/stats";

const read = <T,>(p: string): T => JSON.parse(readFileSync(path.join("src/data", p), "utf8"));
const selection = read<{ selected: string[] }>("selection.json");
const groups = read<Group[]>("groups.json").filter((g) => selection.selected.includes(g.slug));
const ceremonies = new Map(read<Ceremony[]>("ceremonies.json").map((c) => [c.id, c]));
const summary = new Map(groups.map((g) => [g.slug, summarize(read<Award[]>(`awards/${g.slug}.json`), ceremonies)]));
const ranked = [...groups].sort((a, b) => summary.get(b.slug)!.total - summary.get(a.slug)!.total);
const photo = (g: Group) => {
  const file = g.image?.thumb ?? g.image?.src;
  return file ? `data:image/jpeg;base64,${readFileSync(path.join("public", file)).toString("base64")}` : null;
};
const SIZE = { width: 1200, height: 630 };

async function save(res: ImageResponse, file: string) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

function groupCard(g: Group, rank: number) {
  const s = summary.get(g.slug)!;
  const img = photo(g);
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", background: "#15130f", color: "#fff" }}>
      {img ? (
        <img src={img} alt="" width={630} height={630} style={{ width: 630, height: 630, objectFit: "cover", objectPosition: "50% 30%" }} />
      ) : (
        <div style={{ display: "flex", width: 630, height: 630, background: g.accent }} />
      )}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 56, flex: 1, borderLeft: `12px solid ${g.accent}` }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 28, opacity: 0.8 }}>{`No. ${rank} · K-pop awards 2020 to 2026`}</div>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1, marginTop: 16 }}>{g.name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 150, fontWeight: 800, lineHeight: 0.9 }}>{String(s.total)}</div>
          <div style={{ display: "flex", fontSize: 30, opacity: 0.85, marginTop: 12 }}>{`wins · ${s.daesang} daesang · ${s.international} international`}</div>
          <div style={{ display: "flex", fontSize: 24, opacity: 0.7, marginTop: 28 }}>Trophy Count</div>
        </div>
      </div>
    </div>
  );
}

function homeCard() {
  const top = ranked.slice(0, 4);
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#f6f4ef", color: "#15130f", padding: 48 }}>
      <div style={{ display: "flex", fontSize: 64, fontWeight: 800, lineHeight: 1 }}>Who won the most in K-pop since 2020</div>
      <div style={{ display: "flex", gap: 16, marginTop: 36, flex: 1 }}>
        {top.map((g, i) => {
          const img = photo(g);
          return (
            <div key={g.slug} style={{ display: "flex", flexDirection: "column", flex: 1, borderRadius: 12, overflow: "hidden", background: g.accent, position: "relative" }}>
              {img && <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 30%" }} />}
              <div style={{ display: "flex", flexDirection: "column", position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, background: "rgba(0,0,0,0.72)", color: "#fff" }}>
                <div style={{ display: "flex", fontSize: 26, fontWeight: 700 }}>{`#${i + 1} ${g.name}`}</div>
                <div style={{ display: "flex", fontSize: 44, fontWeight: 800 }}>{`${summary.get(g.slug)!.total} wins`}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", fontSize: 24, marginTop: 24, color: "#4b473f" }}>Trophy Count · every win linked to its source</div>
    </div>
  );
}

/** Placeholder tab icon: the site initials as text. Swap for a real logo when one exists. */
function icon() {
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#15130f", color: "#f6f4ef", fontSize: 34, fontWeight: 800, borderRadius: 12 }}>
      TC
    </div>
  );
}

async function main() {
  await save(new ImageResponse(homeCard(), SIZE), "public/og/home.png");
  for (const [i, g] of ranked.entries()) await save(new ImageResponse(groupCard(g, i + 1), SIZE), `public/og/${g.slug}.png`);
  await save(new ImageResponse(icon(), { width: 64, height: 64 }), "src/app/icon.png");
  console.log(`share images: ${ranked.length + 1}, icon written`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

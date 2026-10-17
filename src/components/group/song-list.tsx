"use client";

import { Pause, Play } from "lucide-react";
import { useState } from "react";
import type { Release } from "@/lib/schema";
import { PlatformLinks } from "../platform-links";

export type SongRow = Release & { wins: number; daesang: number; musicShows: number };

/** Embeddable player URL for a release, preferring an exact Spotify match, then Apple Music. */
function embedFor(r: Release): { src: string; height: number; provider: string } | null {
  const sp = r.links.spotify;
  if (sp.verified) {
    const m = sp.url.match(/open\.spotify\.com\/(track|album)\/([A-Za-z0-9]+)/);
    if (m) return { src: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, height: m[1] === "track" ? 152 : 352, provider: "Spotify" };
  }
  const am = r.links.appleMusic;
  if (am.verified && am.url.includes("music.apple.com")) {
    return { src: am.url.replace("music.apple.com", "embed.music.apple.com"), height: am.url.includes("?i=") ? 175 : 450, provider: "Apple Music" };
  }
  return null;
}

export function SongList({ songs, groupName }: { songs: SongRow[]; groupName: string }) {
  const [playing, setPlaying] = useState<string | null>(null);
  if (!songs.length) {
    return <p className="text-sm text-ink-2">None of this group&apos;s wins in the data name a specific song or album.</p>;
  }
  return (
    <ol className="divide-y divide-line">
      {songs.map((r, i) => {
        const embed = embedFor(r);
        const isPlaying = playing === r.id;
        return (
          <li key={r.id} className="py-4">
            <div className="grid grid-cols-[1.5rem_4rem_minmax(0,1fr)] items-center gap-x-4 gap-y-3 sm:grid-cols-[2rem_5rem_minmax(0,1fr)_auto]">
              <span className="tabular font-display text-2xl font-bold text-ink-3">{i + 1}</span>
              {r.artwork ? (
                // eslint-disable-next-line @next/next/no-img-element -- static export, cover art pre-sized
                <img src={r.artwork} alt={`Cover of ${r.title}`} width={80} height={80} loading="lazy" className="size-16 rounded-md object-cover sm:size-20" />
              ) : (
                <span className="grid size-16 place-items-center rounded-md bg-surface-2 text-xs text-ink-3 sm:size-20">No cover</span>
              )}
              <div className="min-w-0">
                <p className="truncate text-base font-semibold sm:text-lg">{r.type === "album" ? <i>{r.title}</i> : r.title}</p>
                <p className="text-sm text-ink-2">
                  {r.wins === 1 ? "1 win" : `${r.wins} wins`}
                  {r.musicShows > 0 && ` · ${r.musicShows} on music shows`}
                  {r.daesang > 0 && ` · ${r.daesang} daesang`}
                </p>
                {(r.album || r.releaseDate) && (
                  <p className="truncate text-xs text-ink-3">
                    {r.album && r.album !== r.title ? `From ${r.album}` : r.type === "album" ? "Album" : "Single"}
                    {r.releaseDate && `, released ${r.releaseDate.slice(0, 4)}`}
                  </p>
                )}
              </div>
              <div className="col-span-3 flex flex-wrap items-center gap-2 sm:col-span-1">
                {embed && (
                  <button
                    type="button"
                    onClick={() => setPlaying(isPlaying ? null : r.id)}
                    aria-expanded={isPlaying}
                    className="inline-flex h-11 items-center gap-1.5 rounded-md bg-ink px-3 text-sm font-medium text-bg hover:opacity-90 sm:h-9"
                  >
                    {isPlaying ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
                    {isPlaying ? "Close player" : "Play here"}
                  </button>
                )}
                <PlatformLinks release={r} groupName={groupName} />
              </div>
            </div>
            {isPlaying && embed && (
              <iframe
                title={`${r.title} on ${embed.provider}`}
                src={embed.src}
                height={embed.height}
                loading="lazy"
                allow="autoplay *; encrypted-media *; clipboard-write; fullscreen; picture-in-picture"
                sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
                className="mt-3 w-full rounded-xl border-0"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

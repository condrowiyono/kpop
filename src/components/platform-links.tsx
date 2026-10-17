import clsx from "clsx";
import { siApplemusic, siSpotify, siYoutubemusic } from "simple-icons";
import type { Platform, Release } from "@/lib/schema";

export const PLATFORMS: { key: Platform; label: string; icon: { path: string } }[] = [
  { key: "spotify", label: "Spotify", icon: siSpotify },
  { key: "appleMusic", label: "Apple Music", icon: siApplemusic },
  { key: "youtubeMusic", label: "YouTube Music", icon: siYoutubemusic },
];

/** One hidden sprite per page; every button references it instead of repeating the paths. */
export function BrandIconSprite() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      {PLATFORMS.map((p) => (
        <symbol key={p.key} id={`icon-${p.key}`} viewBox="0 0 24 24">
          <path d={p.icon.path} fill="currentColor" />
        </symbol>
      ))}
    </svg>
  );
}

function BrandIcon({ id, size = 16 }: { id: string; size?: number }) {
  return (
    <svg width={size} height={size} aria-hidden>
      <use href={`#icon-${id}`} />
    </svg>
  );
}

/**
 * Listen links for one release. Links we matched to the exact track or album open it
 * directly; the rest open that platform's search for "<group> <title>", and say so.
 */
export function PlatformLinks({
  release,
  groupName,
  size = "sm",
  className,
}: {
  release: Release;
  groupName: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <ul className={clsx("flex flex-wrap gap-1.5", className)}>
      {PLATFORMS.map((p) => {
        const link = release.links[p.key];
        const action = link.verified ? `Open “${release.title}” on ${p.label}` : `Search ${p.label} for “${groupName} ${release.title}”`;
        return (
          <li key={p.key}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={action}
              title={action}
              className={clsx(
                "inline-flex items-center gap-1.5 rounded-md border border-control text-ink-2 transition-colors hover:border-ink hover:bg-surface-2 hover:text-ink",
                // Dashed = opens a search rather than the exact release.
                !link.verified && "border-dashed",
                size === "md" ? "h-11 px-3 text-sm" : "h-11 min-w-11 justify-center px-2.5 text-xs sm:h-9 sm:min-w-9",
              )}
            >
              <BrandIcon id={p.key} size={size === "md" ? 18 : 15} />
              {size === "md" && <span>{link.verified ? p.label : `Search ${p.label}`}</span>}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

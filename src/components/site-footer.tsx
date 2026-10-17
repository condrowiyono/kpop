import Link from "next/link";
import { getMeta } from "@/lib/data";

const fmt = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

export function SiteFooter() {
  const meta = getMeta();
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 text-sm text-ink-2 sm:px-6 md:grid-cols-[1fr_auto]">
        <div className="max-w-2xl space-y-2">
          <p>
            Wins counted from {fmt(meta.dataFrom)} through {fmt(meta.dataTo)}. 2026 is a partial year.
          </p>
          <p>
            Award data from Wikipedia&apos;s award and music-show lists, profiles from the K-pop Fandom wiki, photos from
            Wikimedia Commons under their own licenses (credited on each group page), streaming links via Apple&apos;s
            iTunes Search and YouTube Music. This is a fan project with no ties to any agency or awards show.
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 md:flex-col md:text-right">
          <li>
            <Link className="underline-offset-4 hover:underline" href="/about/">
              How wins are counted
            </Link>
          </li>
          <li>
            <Link className="underline-offset-4 hover:underline" href="/ceremonies/">
              Every ceremony
            </Link>
          </li>
          <li>
            <Link className="underline-offset-4 hover:underline" href="/compare/">
              Compare groups
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}

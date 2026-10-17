# K-pop Awards Tracker (2020–2026): Plan

## Context
The user wants a good-looking, easy-to-use web app that counts how many awards K-pop groups won from 2020 to 2026, split into domestic and international. It needs a homepage, a detail page for each group, and group photos. The project folder (`/Users/condro/Personal/Freelance/kpop-awards`) is empty, so this is a new build.

Decisions already made with the user:
- **Scope:** about 30 of the most-awarded groups active 2020–2026
- **Music show wins** count toward the **same total** as ceremony awards. Each win still carries a category tag, so it can be filtered and broken down.
- **Images:** freely licensed photos from Wikimedia Commons, with credits. A styled monogram is the fallback when no photo exists.
- **Stack:** Next.js (App Router) + TypeScript + Tailwind, built as a static export that can be deployed to Vercel or Netlify

## Biggest risk: getting the data right
No public API lists K-pop award wins, so the dataset has to be researched and stored in the repo as JSON.
- Sources: each group's Wikipedia "List of awards and nominations received by X" page and "music program wins" tables, cross-checked against Soompi and allkpop reports where needed. Every win stores a `sourceUrl`.
- The dataset records **wins only**, not nominations, dated 2020-01-01 → today (2026-10-17). 2026 is a **partial year**, and the UI says so with a "Data through Oct 2026" badge.
- Research runs in batches of 5–6 groups at a time using web search and fetch. A validation script checks the result, and a sample of totals is spot-checked by hand.
- **Domestic vs international rule:** an award is classified by the **country of the organizer or ceremony**, not by where the show takes place. MAMA, MMA, Golden Disc, Seoul Music Awards, Circle Chart and music shows count as domestic, even when MAMA is held in Japan. Billboard, AMAs, VMAs, MTV EMA, Japan Gold Disc, iHeart, Kids' Choice and People's Choice count as international. The About page explains this rule.

## Data model (`src/data/`)
- `groups.json`: `slug, name, nameKo, type (boy|girl|coed), debutDate, generation, agency, fandom, colors[2], members[], image {file, credit, license, sourceUrl}, socials`
- `ceremonies.json`: `id, name, shortName, country, scope (domestic|international), kind (ceremony|music-show|digital)`
- `awards/<slug>.json`: one file per group, with entries like `{ id, date, ceremonyId, category, tier (daesang|bonsang|category|music-show), releaseId?, sourceUrl }`. Splitting by group keeps research batches and diffs clean.
- `releases/<slug>.json`: the songs and albums tied to award wins, plus each group's main releases from 2020–2026: `{ id, title, type (song|album), releaseDate, albumId?, artwork, links { spotify, appleMusic, youtubeMusic } }`
- `groups.json` also stores `gallery[]` (several Commons photos) and `members[]` with `{ name, nameKo, image? }`
- `src/lib/schema.ts`: Zod schemas. `src/lib/stats.ts`: pure functions such as totals, by year, by ceremony, rank, best year, top songs, and daesang count, all taking a filter `{years, scope, kinds}`.
- `scripts/validate-data.ts`: runs the schema check, flags dates outside 2020-01-01 to today, catches duplicate entries (same group, ceremony, category, date), checks that every `ceremonyId` and `slug` exists, and fails if a `sourceUrl` is missing. It runs before every build (`prebuild`).

## Music links and cover art (Spotify, Apple Music, YouTube Music)
A build-time script, `scripts/fetch-releases.ts`, fills in the links and artwork and caches the results in the JSON files above. The site is static, so no API calls happen in the browser.
1. **iTunes Search API** (free, no key): look up each song or album to get its Apple Music URL and high-resolution cover art (`artworkUrl` resized to 600×600)
2. **Odesli / song.link API** (free, no key, about 10 requests/min, so the script throttles itself): pass in the Apple Music URL to get the matching **Spotify** and **YouTube Music** URLs
3. Fallback when no match is found: a search link on that platform (`open.spotify.com/search/…`, `music.youtube.com/search?q=…`), marked `verified: false` so these can be fixed by hand
4. Cover art is downloaded into `public/images/releases/`. The script can be re-run safely and skips releases it has already resolved.

In the UI, every award row with a song or album shows its cover thumbnail and three platform buttons, each with a brand icon and an accessible label. The group page has a **Discography** section: a cover-art grid with links, sorted by number of wins. "Most-awarded songs" can open an embedded Spotify player (iframe embed) to play inside the page.

## Images everywhere
- **Group:** a large hero photo plus a **gallery** strip of extra Commons photos (concerts, award shows, red carpets) with a lightbox
- **Members:** a row of portrait avatars on the detail page. Individual Commons photos are used where available, with a fandom-colored initial avatar as the fallback.
- **Leaderboard cards:** the group photo with the cover art of its most-awarded release overlaid
- **Award timeline and ceremonies page:** cover art beside each winning song or album. Ceremonies get a styled badge with an icon and the ceremony's colors, not their trademarked logos.
- **Home hero:** a collage or mosaic of the top groups' photos
- Every photo gets a credit and license line, from a captions sheet on the detail page and in the lightbox, which Commons licenses require. Images are lazy-loaded with fixed aspect ratios so the layout doesn't jump.

## Pages
1. **Home `/`**
   - Hero with the overall headline numbers (total awards tracked, groups, ceremonies) and the most-awarded group
   - **Filter bar**, stored in the URL query so views can be shared: year range chips 2020–2026, Domestic / International / All, include music shows (on by default), boy/girl, generation
   - **Leaderboard** of photo cards for each group: rank, total, domestic/international split bar, a small awards-per-year sparkline, and daesang count. It can be sorted by total, domestic, international, daesangs or name, and searched by name.
   - Charts section: stacked bars of awards per year for the top 10, and the "Daesang club" (groups with grand prizes)
2. **Group detail `/groups/[slug]`** (one static page per group)
   - Full-width photo hero in the fandom's colors, with Korean name, agency, debut, fandom and members
   - Stat tiles: total, domestic, international, daesangs, music show wins, best year
   - Charts: awards by year (domestic vs international), and top ceremonies
   - **Award timeline** grouped by year, filterable by scope and kind, with ceremony, category, song/album and a source link
   - "Most-awarded songs" list and the photo credit
3. **Extras I'm adding (the "details you missed")**
   - **Compare `/compare?g=bts,seventeen`**: 2–3 groups side by side, with shared charts and stat rows
   - **Ceremonies `/ceremonies`**: each ceremony's winners from 2020–2026, so you can see who won the MAMA daesang in each year
   - **About/Methodology `/about`**: definitions, the domestic/international rule, sources, last-updated date, and a way to report corrections
   - Light/dark mode, responsive down to 360px, keyboard and screen-reader friendly, Open Graph share image per group page, and a 404 page

## Design direction
A clean editorial look with confident type and a light background. Each group's two fandom colors are its accent, applied on its own card and detail page, so the colors carry the page instead of generic neon. Photos are the main visual element. Charts follow the `dataviz` skill (one consistent palette, accessible in both themes). The `antislop` UI, copywriting and human-accessibility skills, plus the contrast checker, are loaded before UI work.

## Libraries
`next`, `react`, `tailwindcss`, `zod`, `recharts` (charts), `lucide-react` (icons), `clsx`, `tsx` (scripts). Images are downloaded into `public/images/groups/` (no hotlinking) and served with `next/image` using `unoptimized` for static export.

## Initial group list (about 30, editable)
BTS, BLACKPINK, SEVENTEEN, Stray Kids, TWICE, NewJeans, aespa, IVE, LE SSERAFIM, (G)I-DLE (i-dle), ENHYPEN, TXT, NCT 127, NCT DREAM, ATEEZ, TREASURE, Red Velvet, ITZY, MAMAMOO, THE BOYZ, NMIXX, BOYNEXTDOOR, RIIZE, ZEROBASEONE, ILLIT, BABYMONSTER, KISS OF LIFE, TWS, Kep1er, fromis_9. After research, swap in any group that clearly outranks one on this list, such as CORTIS or Hearts2Hearts.

## Build order
1. Scaffold Next.js, Tailwind and TypeScript; add `output: 'export'`; write the schema, the stats lib and the validation script
2. Write the `ceremonies.json` reference table
3. Research the data in batches: groups.json first, then the award files for 5–6 groups per batch, running validate after each batch
4. Fetch Wikimedia Commons images (hero, gallery and members) and record their credits; run `fetch-releases` for links and cover art, then review the unverified ones
5. Build the UI: layout and theme → home → detail → compare → ceremonies → about
6. Polish: OG images, empty and loading states, mobile pass, a11y and contrast checks

## Verification
- `npm run validate-data` passes with no errors
- `npm run build` produces the static export, with a page for every group slug
- Run the dev server (`run` skill) and screenshot home, one detail page, compare and mobile width in light and dark mode
- Hand-check the totals of 5 groups (BTS, SEVENTEEN, NewJeans, aespa, IVE) against their Wikipedia lists for one or two years each
- Click the Spotify, Apple Music and YouTube Music links for about 10 releases across different groups and confirm they open the right track or album. Report how many links ended up as search fallbacks.
- Check that every displayed photo has a credit line and that no image URL points to an outside host
- Run the filters (year, scope, music shows) and confirm the totals change the same way on the home and detail pages, with the URL state surviving a reload

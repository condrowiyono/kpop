/**
 * Candidate pool for the tracker. `wiki` is the English Wikipedia article; `awardsPage`
 * is the dedicated "List of awards and nominations" article when one exists, otherwise
 * the scraper reads the Accolades tables from the main article.
 * `aliases` are extra spellings used on music-show winner lists.
 */
export type GroupSource = {
  slug: string;
  name: string;
  wiki: string;
  awardsPage?: string;
  aliases?: string[];
  /** For shared list pages (NCT), only rows whose nominee mentions one of these count. */
  nomineeFilter?: string[];
};

export const GROUP_SOURCES: GroupSource[] = [
  { slug: "bts", name: "BTS", wiki: "BTS", awardsPage: "List of awards and nominations received by BTS", aliases: ["Bangtan Boys"] },
  { slug: "blackpink", name: "BLACKPINK", wiki: "Blackpink", awardsPage: "List of awards and nominations received by Blackpink" },
  { slug: "seventeen", name: "SEVENTEEN", wiki: "Seventeen (South Korean band)", awardsPage: "List of awards and nominations received by Seventeen" },
  { slug: "stray-kids", name: "Stray Kids", wiki: "Stray Kids", awardsPage: "List of awards and nominations received by Stray Kids" },
  { slug: "twice", name: "TWICE", wiki: "Twice", awardsPage: "List of awards and nominations received by Twice" },
  { slug: "newjeans", name: "NewJeans", wiki: "NewJeans", awardsPage: "List of awards and nominations received by NewJeans", aliases: ["NJZ"] },
  { slug: "aespa", name: "aespa", wiki: "Aespa", awardsPage: "List of awards and nominations received by Aespa" },
  { slug: "ive", name: "IVE", wiki: "Ive (group)", awardsPage: "List of awards and nominations received by Ive" },
  { slug: "le-sserafim", name: "LE SSERAFIM", wiki: "Le Sserafim", awardsPage: "List of awards and nominations received by Le Sserafim" },
  { slug: "i-dle", name: "i-dle", wiki: "I-dle", awardsPage: "List of awards and nominations received by I-dle", aliases: ["(G)I-dle", "(G)I-DLE", "(여자)아이들", "G I-DLE", "GIDLE"] },
  { slug: "enhypen", name: "ENHYPEN", wiki: "Enhypen", awardsPage: "List of awards and nominations received by Enhypen" },
  { slug: "txt", name: "TOMORROW X TOGETHER", wiki: "Tomorrow X Together", awardsPage: "List of awards and nominations received by Tomorrow X Together", aliases: ["TXT"] },
  { slug: "nct-127", name: "NCT 127", wiki: "NCT 127", awardsPage: "List of awards and nominations received by NCT", nomineeFilter: ["NCT 127", "Kick It", "Sticker", "Neo Zone", "Fact Check", "2 Baddies", "Walk", "Ay-Yo", "Favorite", "Be There for Me", "Punch"] },
  { slug: "nct-dream", name: "NCT DREAM", wiki: "NCT Dream", awardsPage: "List of awards and nominations received by NCT", nomineeFilter: ["NCT Dream", "Hot Sauce", "Glitch Mode", "Beatbox", "Candy", "Hello Future", "Istj", "Smoothie", "Reload", "Ridin'", "Dream()scape", "Drippin' in Dream", "Go Back to the Future"] },
  { slug: "ateez", name: "ATEEZ", wiki: "Ateez" },
  { slug: "treasure", name: "TREASURE", wiki: "Treasure (band)", awardsPage: "List of awards and nominations received by Treasure" },
  { slug: "red-velvet", name: "Red Velvet", wiki: "Red Velvet (group)", awardsPage: "List of awards and nominations received by Red Velvet" },
  { slug: "itzy", name: "ITZY", wiki: "Itzy", awardsPage: "List of awards and nominations received by Itzy" },
  { slug: "mamamoo", name: "MAMAMOO", wiki: "Mamamoo", awardsPage: "List of awards and nominations received by Mamamoo" },
  { slug: "the-boyz", name: "THE BOYZ", wiki: "The Boyz (South Korean band)", awardsPage: "List of awards and nominations received by The Boyz" },
  { slug: "nmixx", name: "NMIXX", wiki: "Nmixx" },
  { slug: "boynextdoor", name: "BOYNEXTDOOR", wiki: "BoyNextDoor" },
  { slug: "riize", name: "RIIZE", wiki: "Riize" },
  { slug: "zerobaseone", name: "ZEROBASEONE", wiki: "Zerobaseone", awardsPage: "List of awards and nominations received by Zerobaseone", aliases: ["ZB1"] },
  { slug: "illit", name: "ILLIT", wiki: "Illit" },
  { slug: "babymonster", name: "BABYMONSTER", wiki: "Babymonster", awardsPage: "List of awards and nominations received by Babymonster" },
  { slug: "kiss-of-life", name: "KISS OF LIFE", wiki: "Kiss of Life (group)" },
  { slug: "tws", name: "TWS", wiki: "TWS (group)" },
  { slug: "kep1er", name: "Kep1er", wiki: "Kep1er" },
  { slug: "fromis-9", name: "fromis_9", wiki: "Fromis 9", aliases: ["Fromis_9", "fromis_9"] },
  { slug: "cortis", name: "CORTIS", wiki: "Cortis" },
  { slug: "hearts2hearts", name: "Hearts2Hearts", wiki: "Hearts2Hearts" },
  { slug: "stayc", name: "STAYC", wiki: "STAYC" },
  { slug: "allday-project", name: "ALLDAY PROJECT", wiki: "AllDay Project" },
  { slug: "meovv", name: "MEOVV", wiki: "Meovv" },
  { slug: "monsta-x", name: "MONSTA X", wiki: "Monsta X", awardsPage: "List of awards and nominations received by Monsta X" },
  { slug: "oh-my-girl", name: "OH MY GIRL", wiki: "Oh My Girl", awardsPage: "List of awards and nominations received by Oh My Girl" },
  { slug: "iz-one", name: "IZ*ONE", wiki: "Iz*One", awardsPage: "List of awards and nominations received by Iz*One", aliases: ["IzOne", "Iz One"] },
  { slug: "day6", name: "DAY6", wiki: "Day6" },
  { slug: "nct-wish", name: "NCT WISH", wiki: "NCT Wish" },
  { slug: "astro", name: "ASTRO", wiki: "Astro (South Korean band)" },
  { slug: "p1harmony", name: "P1Harmony", wiki: "P1Harmony" },
];


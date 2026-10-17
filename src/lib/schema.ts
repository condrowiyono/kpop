import { z } from "zod";

export const imageRefSchema = z.object({
  src: z.string().startsWith("/images/"),
  /** Small JPEG for list views (scripts/make-thumbs.ts). */
  thumb: z.string().startsWith("/images/").optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  credit: z.string().min(1),
  license: z.string().min(1),
  licenseUrl: z.string().url().optional(),
  sourceUrl: z.string().url(),
  caption: z.string().optional(),
});

export const groupSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  nameKo: z.string().optional(),
  type: z.enum(["boy", "girl", "coed"]),
  generation: z.number().int().min(1).max(6),
  debutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  agency: z.string().optional(),
  fandom: z.string().optional(),
  /** Official fandom colors; empty when the group has none. */
  colors: z.array(z.object({ hex: z.string().regex(/^#[0-9A-F]{3,6}$/i), name: z.string().optional() })),
  /** UI accent: the first official color, or a site-picked color for groups without one. */
  accent: z.string().regex(/^#[0-9A-F]{6}$/i),
  members: z.array(z.object({ name: z.string(), image: imageRefSchema.optional() })),
  image: imageRefSchema.optional(),
  gallery: z.array(imageRefSchema),
  wikiUrl: z.string().url(),
  fandomUrl: z.string().url().optional(),
});

export const ceremonySchema = z.object({
  id: z.string(),
  name: z.string(),
  short: z.string(),
  country: z.string(),
  scope: z.enum(["domestic", "international"]),
  kind: z.enum(["award", "music-show", "other"]),
});

export const tierSchema = z.enum(["daesang", "bonsang", "category", "music-show"]);

export const awardSchema = z.object({
  id: z.string(),
  year: z.number().int(),
  /** Exact broadcast date for music shows; ceremonies only carry the year. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ceremonyId: z.string(),
  category: z.string(),
  tier: tierSchema,
  work: z.string().optional(),
  releaseId: z.string().optional(),
  sourceUrl: z.string().url(),
});

const platformLink = z.object({ url: z.string().url(), verified: z.boolean() });

export const releaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(["song", "album"]),
  releaseDate: z.string().optional(),
  album: z.string().optional(),
  artwork: z.string().startsWith("/images/").optional(),
  links: z.object({
    spotify: platformLink,
    appleMusic: platformLink,
    youtubeMusic: platformLink,
  }),
});

export type ImageRef = z.infer<typeof imageRefSchema>;
export type Group = z.infer<typeof groupSchema>;
export type Ceremony = z.infer<typeof ceremonySchema>;
export type Award = z.infer<typeof awardSchema>;
export type Tier = z.infer<typeof tierSchema>;
export type Release = z.infer<typeof releaseSchema>;
export type Platform = keyof Release["links"];

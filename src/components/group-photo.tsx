import clsx from "clsx";
import type { ImageRef } from "@/lib/schema";
import { inkOn } from "@/lib/color";

type Props = {
  name: string;
  image?: ImageRef;
  accent: string;
  /** Use the small list-view file when one exists. */
  thumb?: boolean;
  className?: string;
  /** Decorative when the name is printed right beside the photo. */
  decorative?: boolean;
  priority?: boolean;
  position?: string;
};

const initials = (name: string) =>
  name
    .replace(/[^A-Za-z0-9가-힣 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

/**
 * A group or member photo. Without a freely licensed photo it falls back to an initials
 * monogram in the group's accent color, never a stand-in face.
 */
export function GroupPhoto({ name, image, accent, thumb, className, decorative, priority, position }: Props) {
  if (!image) {
    return (
      <div
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : `${name} (no photo available)`}
        aria-hidden={decorative || undefined}
        className={clsx("grid place-items-center font-display font-extrabold", className)}
        style={{ background: accent, color: inkOn(accent) }}
      >
        <span className="text-[min(40cqw,3rem)] leading-none">{initials(name)}</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export: files are pre-sized by the data scripts
    <img
      src={thumb && image.thumb ? image.thumb : image.src}
      alt={decorative ? "" : `${name}${image.caption ? `: ${image.caption}` : ""}`}
      width={image.width}
      height={image.height}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={clsx("object-cover", className)}
      style={{ background: accent, objectPosition: position ?? "50% 30%" }}
    />
  );
}

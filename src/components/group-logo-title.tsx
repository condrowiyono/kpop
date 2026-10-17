"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { ImageRef } from "@/lib/schema";

type Props = {
  name: string;
  logo?: ImageRef;
  /** Classes for the text title, used as the placeholder and the fallback. */
  className?: string;
};

/**
 * Group name heading that shows the group's logo when one exists. The text name shows
 * while the logo loads and stays if there is no logo or it fails to load. The heading
 * always keeps the name as text, so screen readers and search read the same thing.
 */
export function GroupLogoTitle({ name, logo, className }: Props) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const img = useRef<HTMLImageElement>(null);

  // The image can finish loading before hydration, which skips onLoad.
  useEffect(() => {
    const el = img.current;
    if (el?.complete) setStatus(el.naturalWidth > 0 ? "loaded" : "error");
  }, []);

  const showLogo = logo && status === "loaded";

  return (
    <h1 className="relative">
      <span className={clsx(className, showLogo && "sr-only")}>{name}</span>
      {logo && status !== "error" && (
        // eslint-disable-next-line @next/next/no-img-element -- static export: logo files are pre-sized by the data scripts
        <img
          ref={img}
          src={logo.src}
          alt=""
          width={logo.width}
          height={logo.height}
          decoding="async"
          fetchPriority="high"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          // Logos are drawn in white to match the hero's text on the dark photo.
          className={clsx(
            "h-[clamp(3rem,11vw,7.5rem)] w-auto max-w-full object-contain object-left brightness-0 invert",
            showLogo ? "block" : "pointer-events-none absolute bottom-0 left-0 opacity-0",
          )}
        />
      )}
    </h1>
  );
}

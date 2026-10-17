"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ImageRef } from "@/lib/schema";

/** Horizontal photo strip; any photo opens a full-size lightbox with its credit and license. */
export function Gallery({ images, groupName }: { images: ImageRef[]; groupName: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);

  const show = useCallback((i: number, from?: HTMLButtonElement) => {
    if (from) opener.current = from;
    setOpen(i);
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);

  const close = useCallback(() => {
    dialog.current?.close();
  }, []);

  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + images.length) % images.length)), [images.length]);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const onClose = () => {
      setOpen(null);
      opener.current?.focus();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    el.addEventListener("close", onClose);
    el.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("close", onClose);
      el.removeEventListener("keydown", onKey);
    };
  }, [step]);

  if (!images.length) return null;
  const current = open !== null ? images[open] : null;

  return (
    <>
      <ul className="rail -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {images.map((img, i) => (
          <li key={img.src} className="shrink-0 snap-start">
            <button
              type="button"
              onClick={(e) => show(i, e.currentTarget)}
              className="block overflow-hidden rounded-md"
              aria-label={`Open photo ${i + 1} of ${images.length}${img.caption ? `: ${img.caption}` : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static export, thumbnail pre-sized */}
              <img
                src={img.thumb ?? img.src}
                alt=""
                width={img.width}
                height={img.height}
                loading="lazy"
                decoding="async"
                className="h-44 w-auto max-w-none object-cover transition-transform duration-300 hover:scale-[1.03] sm:h-56"
              />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        aria-label={`${groupName} photos`}
        className="m-auto max-h-[100dvh] w-full max-w-5xl bg-transparent p-0 text-white backdrop:bg-black/85"
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        {current && (
          <figure className="flex max-h-[100dvh] flex-col gap-3 p-3 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="tabular text-sm text-white/80">
                {open! + 1} / {images.length}
              </p>
              <button type="button" onClick={close} className="grid size-11 place-items-center rounded-md bg-white/10 hover:bg-white/20" aria-label="Close photos">
                <X size={20} aria-hidden />
              </button>
            </div>
            <div className="relative min-h-0 flex-1">
              {/* eslint-disable-next-line @next/next/no-img-element -- static export, full-size Commons file */}
              <img src={current.src} alt={current.caption ?? `${groupName} photo`} width={current.width} height={current.height} className="mx-auto max-h-[72dvh] w-auto rounded-md object-contain" />
              {images.length > 1 && (
                <>
                  <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className="absolute top-1/2 left-1 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/60 hover:bg-black/80">
                    <ChevronLeft size={22} aria-hidden />
                  </button>
                  <button type="button" onClick={() => step(1)} aria-label="Next photo" className="absolute top-1/2 right-1 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/60 hover:bg-black/80">
                    <ChevronRight size={22} aria-hidden />
                  </button>
                </>
              )}
            </div>
            <figcaption className="text-sm text-white/85">
              {current.caption && <span className="block">{current.caption}</span>}
              <span className="block text-white/75">
                Photo: {current.credit},{" "}
                {current.licenseUrl ? (
                  <a href={current.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                    {current.license}
                  </a>
                ) : (
                  current.license
                )}
                ,{" "}
                <a href={current.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  via Wikimedia Commons
                </a>
              </span>
            </figcaption>
          </figure>
        )}
      </dialog>
    </>
  );
}

"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
      <h1 className="font-display text-5xl font-extrabold tracking-tight uppercase">This page failed to draw</h1>
      <p className="mt-4 text-ink-2">
        Something in the page crashed in your browser. The data itself is fine. Trying again usually fixes it; if it keeps
        happening, reload the page.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="inline-flex h-12 items-center rounded-md bg-ink px-5 text-sm font-semibold text-bg">
          Try again
        </button>
        <button type="button" onClick={() => window.location.reload()} className="inline-flex h-12 items-center rounded-md border border-control px-5 text-sm font-semibold hover:border-ink">
          Reload the page
        </button>
      </div>
    </div>
  );
}

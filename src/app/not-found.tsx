import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
      <p className="tabular font-display text-8xl font-extrabold text-ink-3">404</p>
      <h1 className="mt-2 font-display text-5xl font-extrabold tracking-tight uppercase">No page here</h1>
      <p className="mt-4 text-ink-2">
        The link may point to a group that is not among the 30 tracked, or to a page that moved.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className="inline-flex h-12 items-center rounded-md bg-ink px-5 text-sm font-semibold text-bg">
          Back to the leaderboard
        </Link>
        <Link href="/about/#groups" className="inline-flex h-12 items-center rounded-md border border-control px-5 text-sm font-semibold hover:border-ink">
          See which groups are tracked
        </Link>
      </div>
    </div>
  );
}

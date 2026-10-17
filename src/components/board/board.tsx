"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import type { PackedAward } from "@/lib/stats";
import { DEFAULT_BOARD, parseBoard, serializeBoard, type BoardState } from "@/lib/url-filter";
import { computeStats, rankGroups, type LiteCeremony, type LiteGroup } from "./compute";
import { DaesangChart } from "./daesang-chart";
import { FilterBar } from "./filter-bar";
import { Leaderboard } from "./leaderboard";
import { YearHeatmap } from "./year-heatmap";

export type BoardData = { groups: LiteGroup[]; ceremonies: LiteCeremony[]; awards: PackedAward[] };

function BoardView({ data, state, onChange }: { data: BoardData; state: BoardState; onChange?: (s: Partial<BoardState>) => void }) {
  const stats = useMemo(() => computeStats(data.groups, data.ceremonies, data.awards, state), [data, state]);
  const rows = useMemo(() => rankGroups(stats, state), [stats, state]);
  const heatRows = useMemo(() => [...rows].sort((a, b) => b.total - a.total), [rows]);

  return (
    <>
      <section id="leaderboard" aria-labelledby="leaderboard-title" className="scroll-mt-4">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
          <h2 id="leaderboard-title" className="font-display text-4xl font-extrabold tracking-tight uppercase sm:text-5xl">
            The leaderboard
          </h2>
        </div>
        <FilterBar state={state} onChange={onChange ?? (() => {})} resultCount={rows.length} totalCount={data.groups.length} />
        <div className="mt-4">
          <Leaderboard rows={rows} sort={state.sort} filter={state} />
        </div>
      </section>

      <div className="mt-20 grid grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-16 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section aria-labelledby="years-title" className="min-w-0">
          <h2 id="years-title" className="font-display text-3xl font-extrabold tracking-tight uppercase sm:text-4xl">
            Year by year
          </h2>
          <p className="mt-1 mb-5 max-w-prose text-sm text-ink-2">
            Wins per calendar year with the filters above applied. Darker cells mean more wins, measured against the
            busiest year of any group in view.
          </p>
          <YearHeatmap rows={heatRows} filter={state} />
        </section>
        <section aria-labelledby="daesang-title" className="min-w-0">
          <h2 id="daesang-title" className="font-display text-3xl font-extrabold tracking-tight uppercase sm:text-4xl">
            The daesang club
          </h2>
          <p className="mt-1 mb-5 max-w-prose text-sm text-ink-2">
            A daesang is the grand prize at a Korean awards ceremony (Artist, Album or Song of the Year and their
            equivalents). These groups won at least one in the selected years.
          </p>
          <DaesangChart rows={rows} />
        </section>
      </div>
    </>
  );
}

/** Static first paint: the default view, rendered into the HTML before the URL is read. */
export function BoardStatic({ data }: { data: BoardData }) {
  return <BoardView data={data} state={DEFAULT_BOARD} />;
}

/** Interactive board; filters live in the URL so any view can be shared. */
export function Board({ data }: { data: BoardData }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  // The URL seeds the state once; after that the state drives the URL (replace, so Back leaves the page).
  const [state, setState] = useState<BoardState>(() => parseBoard(new URLSearchParams(params.toString())));

  const onChange = useCallback(
    (patch: Partial<BoardState>) => {
      const next = { ...state, ...patch };
      setState(next);
      router.replace(`${pathname}${serializeBoard(next)}`, { scroll: false });
    },
    [state, router, pathname],
  );

  return <BoardView data={data} state={state} onChange={onChange} />;
}

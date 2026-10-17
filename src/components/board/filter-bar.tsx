"use client";

import clsx from "clsx";
import { Search, X } from "lucide-react";
import { useId } from "react";
import { DEFAULT_BOARD, type BoardState } from "@/lib/url-filter";
import { YEARS } from "@/lib/stats";
import { SORT_LABEL } from "./compute";

type Props = {
  state: BoardState;
  onChange: (next: Partial<BoardState>) => void;
  resultCount: number;
  totalCount: number;
};

const selectCls =
  "h-11 rounded-md border border-control bg-surface px-3 pr-8 text-sm text-ink hover:border-ink sm:h-10";

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const name = useId();
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-xs font-medium text-ink-3">{label}</legend>
      <div className="inline-flex rounded-md border border-control p-0.5">
        {options.map((o) => (
          <label
            key={o.value}
            className={clsx(
              "relative flex h-10 cursor-pointer items-center rounded-[5px] px-3 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)] sm:h-9",
              value === o.value ? "bg-ink font-medium text-bg" : "text-ink-2 hover:text-ink",
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex h-11 cursor-pointer items-center gap-2 text-sm text-ink-2 hover:text-ink sm:h-9">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-[var(--ink)]"
      />
      {label}
    </label>
  );
}

export function FilterBar({ state, onChange, resultCount, totalCount }: Props) {
  const searchId = useId();
  const fromId = useId();
  const toId = useId();
  const sortId = useId();
  const genId = useId();
  const isDefault = JSON.stringify(state) === JSON.stringify(DEFAULT_BOARD);
  const singleYear = state.from === state.to ? state.from : null;

  return (
    <section aria-label="Filters" className="space-y-4 border-y border-line py-5">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <div className="min-w-0 basis-full">
          <span className="mb-1.5 block text-xs font-medium text-ink-3" id={`${fromId}-years`}>
            Years
          </span>
          <div className="rail -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-labelledby={`${fromId}-years`}>
            <button
              type="button"
              aria-pressed={state.from === YEARS[0] && state.to === YEARS[YEARS.length - 1]}
              onClick={() => onChange({ from: YEARS[0], to: YEARS[YEARS.length - 1] })}
              className={clsx(
                "h-11 shrink-0 rounded-md border px-3 text-sm sm:h-9",
                state.from === YEARS[0] && state.to === YEARS[YEARS.length - 1]
                  ? "border-ink bg-ink font-medium text-bg"
                  : "border-control text-ink-2 hover:border-ink hover:text-ink",
              )}
            >
              All years
            </button>
            {YEARS.map((y) => (
              <button
                key={y}
                type="button"
                aria-pressed={singleYear === y}
                onClick={() => onChange({ from: y, to: y })}
                className={clsx(
                  "tabular h-11 shrink-0 rounded-md border px-3 text-sm sm:h-9",
                  singleYear === y
                    ? "border-ink bg-ink font-medium text-bg"
                    : "border-control text-ink-2 hover:border-ink hover:text-ink",
                )}
              >
                {y}
              </button>
            ))}
            <span className="flex shrink-0 items-center gap-1.5 pl-2 text-sm text-ink-3">
              <label htmlFor={fromId}>or from</label>
              <select
                id={fromId}
                className={selectCls}
                value={state.from}
                onChange={(e) => {
                  const from = Number(e.target.value);
                  onChange({ from, to: Math.max(from, state.to) });
                }}
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <label htmlFor={toId}>to</label>
              <select
                id={toId}
                className={selectCls}
                value={state.to}
                onChange={(e) => {
                  const to = Number(e.target.value);
                  onChange({ to, from: Math.min(to, state.from) });
                }}
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </span>
          </div>
        </div>

        <Segmented
          label="Where"
          value={state.scope}
          onChange={(scope) => onChange({ scope })}
          options={[
            { value: "all", label: "Everywhere" },
            { value: "domestic", label: "Korea" },
            { value: "international", label: "International" },
          ]}
        />

        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-ink-3">Count</legend>
          <div className="flex flex-wrap gap-x-4">
            <Check label="Music show wins" checked={state.musicShows} onChange={(musicShows) => onChange({ musicShows })} />
            <Check label="Brand and culture honors" checked={state.other} onChange={(other) => onChange({ other })} />
          </div>
        </fieldset>

        <Segmented
          label="Groups"
          value={state.type}
          onChange={(type) => onChange({ type })}
          options={[
            { value: "all", label: "All" },
            { value: "boy", label: "Boy groups" },
            { value: "girl", label: "Girl groups" },
          ]}
        />

        <div>
          <label htmlFor={genId} className="mb-1.5 block text-xs font-medium text-ink-3">
            Generation
          </label>
          <select id={genId} className={selectCls} value={state.gen} onChange={(e) => onChange({ gen: e.target.value as BoardState["gen"] })}>
            <option value="all">All generations</option>
            <option value="3">3rd generation</option>
            <option value="4">4th generation</option>
            <option value="5">5th generation</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="relative min-w-0 grow sm:max-w-xs">
          <label htmlFor={searchId} className="mb-1.5 block text-xs font-medium text-ink-3">
            Find a group
          </label>
          <Search size={16} aria-hidden className="pointer-events-none absolute bottom-3.5 left-3 text-ink-3 sm:bottom-3" />
          <input
            id={searchId}
            type="search"
            value={state.q}
            onChange={(e) => onChange({ q: e.target.value })}
            placeholder="Name or 한글 name"
            className="h-11 w-full rounded-md border border-control bg-surface pr-3 pl-9 text-sm text-ink placeholder:text-ink-3 hover:border-ink sm:h-10"
          />
        </div>
        <div>
          <label htmlFor={sortId} className="mb-1.5 block text-xs font-medium text-ink-3">
            Sort by
          </label>
          <select id={sortId} className={selectCls} value={state.sort} onChange={(e) => onChange({ sort: e.target.value as BoardState["sort"] })}>
            {Object.entries(SORT_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <p className="text-sm text-ink-3 sm:ml-auto" aria-live="polite">
          {resultCount === totalCount ? `All ${totalCount} groups` : `${resultCount} of ${totalCount} groups`}
        </p>
        {!isDefault && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_BOARD)}
            className="inline-flex h-11 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-ink underline-offset-4 hover:underline sm:h-10"
          >
            <X size={16} aria-hidden />
            Reset filters
          </button>
        )}
      </div>
    </section>
  );
}

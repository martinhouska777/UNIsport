"use client";

/*
  THE FILTER BAR — a full-width control that opens the filter sheet, with a chip
  for each filter currently narrowing the list, every chip tappable to clear
  itself, and a Clear beside them.

  It used to be a small "Filters · 2" pill floating alone on its own line above
  the grid, which read as a stray button rather than as the top of the list it
  governs. Now it spans the width the way a search field does, says what it will
  do while nothing is set ("Filter these results"), and says what it HAS done
  once something is ("2 filters"). The number of surviving rows moved onto it
  too — the count and the control that changes the count belong on one line,
  not in a separate small-caps heading underneath.

  The chips sit on one line that scrolls sideways rather than wrapping. Wrapping
  pushed the whole grid below down by a row the moment you picked a third
  filter, which is the sort of movement that makes a screen feel unreliable.

  It lives here rather than inside one screen because Match has three lists that
  can be narrowed (Browse, Session search, and the Buddy Board) and they must not
  each invent their own filter treatment. The Buddy Board used to show its
  filters as three full rows of pills sitting directly under three identical rows
  of pills in the post form — the same control twice, one meaning "what I want",
  the other "what I want to see". Behind one bar they can't be confused.

  Presentational only: it holds no filter state and knows nothing about what is
  being filtered. Colors are theme tokens.
*/
import { IconSliders, IconChevronDown } from "@/components/icons";

export type FilterChip = { key: string; label: string };

export default function FilterBar({
  count,
  chips,
  onOpen,
  onClear,
  onClearAll,
  total,
  noun = "result",
  open = false,
}: {
  /** How many filters are active — shown on the bar. */
  count: number;
  /** One chip per active filter, in the order they should read. */
  chips: FilterChip[];
  onOpen: () => void;
  onClear: (key: string) => void;
  /** Only offered when something is actually set. */
  onClearAll?: () => void;
  /** How many rows survived the filters. Omit when the list isn't loaded yet. */
  total?: number | null;
  /** What one row is called: "person", "post". Pluralised with an s. */
  noun?: string;
  /** Turns the chevron over while the dropdown below is showing. */
  open?: boolean;
}) {
  const on = count > 0;
  return (
    <div>
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={onOpen}
          aria-label="Open filters"
          className={`tap44 flex flex-1 items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors ${
            on ? "border-primary bg-primary-tint" : "border-border bg-surface"
          }`}
        >
          <span className={on ? "text-primary" : "text-muted"}>
            <IconSliders size={15} />
          </span>
          <span className={`flex-1 text-[13px] ${on ? "text-primary" : "text-muted"}`}>
            {on ? `${count} filter${count === 1 ? "" : "s"}` : "Filter these results"}
          </span>
          {total != null && (
            <span className="text-[12px] tabular-nums text-muted">
              {total} {total === 1 ? noun : `${noun}s`}
            </span>
          )}
          <span
            className={`transition-transform duration-150 motion-reduce:transition-none ${
              open ? "rotate-180" : ""
            } ${on ? "text-primary" : "text-muted"}`}
          >
            <IconChevronDown size={15} />
          </span>
        </button>
        {on && onClearAll && (
          <button
            type="button"
            onClick={onClearAll}
            className="tap44 flex-shrink-0 rounded-xl border border-border bg-surface px-3 text-[12px] text-muted"
          >
            Clear
          </button>
        )}
      </div>
      {chips.length > 0 && (
        <div className="chip-row -mx-0.5 mt-2 flex gap-1.5 overflow-x-auto px-0.5 pb-1">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => onClear(c.key)}
              aria-label={`Clear filter ${c.label}`}
              className="tap44 flex flex-shrink-0 items-center gap-1 rounded-full border border-primary bg-primary-tint px-3 py-1.5 text-[12px] text-primary"
            >
              {c.label}
              <span className="text-[13px] leading-none">×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

/*
  THE FILTER BAR — a "Filters · 2" button plus a chip for each filter currently
  narrowing the list, every chip tappable to clear itself.

  It lives here rather than inside one screen because Match now has three lists
  that can be narrowed (Browse, Session search, and the Buddy Board) and they
  must not each invent their own filter treatment. The Buddy Board used to show
  its filters as three full rows of pills sitting directly under three identical
  rows of pills in the post form — the same control twice, one meaning "what I
  want", the other "what I want to see". Behind a button they can't be confused.

  Presentational only: it holds no filter state and knows nothing about what is
  being filtered. Colors are theme tokens.
*/

export type FilterChip = { key: string; label: string };

export default function FilterBar({
  count,
  chips,
  onOpen,
  onClear,
  hint = "Optional",
}: {
  /** How many filters are active — shown on the button. */
  count: number;
  /** One chip per active filter, in the order they should read. */
  chips: FilterChip[];
  onOpen: () => void;
  onClear: (key: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="tap44 rounded-full border border-border bg-surface px-3.5 py-2 text-[13px] text-text"
        >
          Filters{count > 0 ? ` · ${count}` : ""}
        </button>
        <span className="text-[11px] text-muted">{hint}</span>
      </div>
      {chips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => onClear(c.key)}
              aria-label={`Clear filter ${c.label}`}
              className="tap44 flex items-center gap-1 rounded-full border border-primary bg-primary-tint px-3 py-1.5 text-[12px] text-primary"
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

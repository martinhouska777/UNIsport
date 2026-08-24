"use client";

/*
  BUDDY BOARD FILTERS — the sheet behind the Board's "Filters" button.

  Three short lists (focus, day, time of day), so unlike the people-matching
  sheet there is nothing to tick open or search: every option is on screen and
  tapping a picked one clears it. Same sheet chrome as FiltersSheet so the two
  read as one control in two places.

  Option lists come from lib/buddyBoard.ts and lib/onboarding.ts; colors are
  theme tokens.
*/
import { buddyFocuses, buddyTimesOfDay, focusLabel, timeOfDayLabel } from "@/lib/buddyBoard";
import { weekDays } from "@/lib/onboarding";
import { Pill, FieldLabel } from "@/components/onboarding/controls";
import type { FilterChip } from "@/components/match/FilterBar";

/** What the board is currently narrowed to. All null = show everything. */
export type BoardFilters = {
  focus: string | null;
  day: string | null;
  timeOfDay: string | null;
};

export const NO_BOARD_FILTERS: BoardFilters = { focus: null, day: null, timeOfDay: null };

export function boardFilterCount(f: BoardFilters): number {
  return [f.focus, f.day, f.timeOfDay].filter(Boolean).length;
}

/** The chips shown under the Filters button, each tappable to clear itself. */
export function boardFilterChips(f: BoardFilters): FilterChip[] {
  const chips: FilterChip[] = [];
  if (f.focus) chips.push({ key: "focus", label: focusLabel(f.focus) });
  if (f.day) {
    chips.push({
      key: "day",
      label: weekDays.find((d) => d.key === f.day)?.label ?? f.day,
    });
  }
  if (f.timeOfDay) chips.push({ key: "timeOfDay", label: timeOfDayLabel(f.timeOfDay) });
  return chips;
}

export default function BoardFiltersSheet({
  value,
  onChange,
  onClose,
}: {
  value: BoardFilters;
  onChange: (next: BoardFilters) => void;
  onClose: () => void;
}) {
  const set = (patch: Partial<BoardFilters>) => onChange({ ...value, ...patch });
  const count = boardFilterCount(value);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="max-h-[85dvh] w-full max-w-screen-sm overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-medium text-text">Filter open posts</h2>
          <button
            type="button"
            onClick={onClose}
            className="tap44 text-[13px] font-medium text-primary"
          >
            Done
          </button>
        </div>
        <p className="mb-3 text-[11px] text-muted">
          Narrows the board only — it doesn’t change the post you’re writing.
        </p>

        <div className="mb-4">
          <FieldLabel>Focus</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {buddyFocuses.map((f) => (
              <Pill
                key={f.key}
                label={f.label}
                selected={value.focus === f.key}
                onClick={() => set({ focus: value.focus === f.key ? null : f.key })}
              />
            ))}
          </div>
        </div>

        <div className="mb-4">
          <FieldLabel>Day</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {weekDays.map((d) => (
              <Pill
                key={d.key}
                label={d.label.slice(0, 3)}
                selected={value.day === d.key}
                onClick={() => set({ day: value.day === d.key ? null : d.key })}
              />
            ))}
          </div>
        </div>

        <div className="mb-4">
          <FieldLabel>Time of day</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {buddyTimesOfDay.map((t) => (
              <Pill
                key={t.key}
                label={t.label}
                selected={value.timeOfDay === t.key}
                onClick={() => set({ timeOfDay: value.timeOfDay === t.key ? null : t.key })}
              />
            ))}
          </div>
        </div>

        {count > 0 && (
          <button
            type="button"
            onClick={() => onChange(NO_BOARD_FILTERS)}
            className="tap44 w-full rounded-full border border-border bg-surface-2 py-2.5 text-[13px] text-muted"
          >
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
}

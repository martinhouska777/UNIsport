"use client";

/*
  BUDDY BOARD FILTERS — the sheet behind the Board's "Filters" button.

  Three short lists (focus, day, time of day), so unlike the people-matching
  sheet there is nothing to tick open or search: every option is on screen and
  tapping a picked one clears it. Same sheet chrome as FiltersSheet so the two
  read as one control in two places — including the one rule that matters: your
  picks are a DRAFT and the board only changes when you press Apply.

  Option lists come from lib/buddyBoard.ts and lib/onboarding.ts; colors are
  theme tokens.
*/
import { useState } from "react";
import { buddyFocuses, buddyTimesOfDay, focusLabel, timeOfDayLabel } from "@/lib/buddyBoard";
import { weekDays, verifiedGyms } from "@/lib/onboarding";
import { Pill, FieldLabel, SelectField } from "@/components/onboarding/controls";
import type { FilterChip } from "@/components/match/FilterBar";
import Button from "@/components/ui/Button";
import DropdownPanel from "@/components/ui/DropdownPanel";

/** What the board is currently narrowed to. All null = show everything. */
export type BoardFilters = {
  focus: string | null;
  day: string | null;
  timeOfDay: string | null;
  /* A gym name from lib/gyms.ts. Posts always carried one; the board just
     couldn't be narrowed by it, so "who is going to Malkin" was unanswerable. */
  gym: string | null;
};

export const NO_BOARD_FILTERS: BoardFilters = { focus: null, day: null, timeOfDay: null, gym: null };

export function boardFilterCount(f: BoardFilters): number {
  return [f.focus, f.day, f.timeOfDay, f.gym].filter(Boolean).length;
}

/** The chips shown under the Filters button, each tappable to clear itself. */
export function boardFilterChips(f: BoardFilters): FilterChip[] {
  const chips: FilterChip[] = [];
  if (f.gym) chips.push({ key: "gym", label: f.gym });
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
  onApply,
  onClose,
}: {
  /** What the board is narrowed to right now — where the draft starts. */
  value: BoardFilters;
  /** Pressed Apply: the only moment the board re-loads. */
  onApply: (next: BoardFilters) => void;
  /** Closes the sheet, throwing away anything not applied. */
  onClose: () => void;
}) {
  /* A draft, not the board itself — see components/match/FiltersSheet.tsx. The
     sheet is only mounted while open, so this starts as what was applied, and a
     chip cleared on the bar outside remounts it (the parent's `key`). */
  const [draft, setDraft] = useState<BoardFilters>(value);

  const set = (patch: Partial<BoardFilters>) => setDraft((d) => ({ ...d, ...patch }));
  const count = boardFilterCount(draft);

  // A dropdown under the bar, not a sheet up from the floor — see the note in
  // components/match/FiltersSheet.tsx.
  return (
    <DropdownPanel className="rounded-xl border border-border bg-surface p-3.5">
      <div>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-medium text-text">Filter open posts</h2>
          {count > 0 && (
            <button
              type="button"
              onClick={() => setDraft(NO_BOARD_FILTERS)}
              className="tap44 text-[13px] font-medium text-muted"
            >
              Clear all
            </button>
          )}
        </div>
        <p className="mb-3 text-[11px] text-muted">
          Narrows the board only — it doesn’t change the post you’re writing.
        </p>

        <div className="mb-4">
          <FieldLabel>Gym</FieldLabel>
          {/* A dropdown, like the post form: fifteen gyms is a list. */}
          <SelectField
            value={draft.gym ?? ""}
            onChange={(v) => set({ gym: v || null })}
            options={verifiedGyms.map((g) => ({ value: g, label: g }))}
            placeholder="Any gym"
            ariaLabel="Gym"
          />
        </div>

        <div className="mb-4">
          <FieldLabel>Focus</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {buddyFocuses.map((f) => (
              <Pill
                key={f.key}
                label={f.label}
                selected={draft.focus === f.key}
                onClick={() => set({ focus: draft.focus === f.key ? null : f.key })}
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
                selected={draft.day === d.key}
                onClick={() => set({ day: draft.day === d.key ? null : d.key })}
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
                selected={draft.timeOfDay === t.key}
                onClick={() => set({ timeOfDay: draft.timeOfDay === t.key ? null : t.key })}
              />
            ))}
          </div>
        </div>

        {/* The commit, stuck to the foot of the sheet — see FiltersSheet. */}
        <div className="sticky bottom-0 -mx-3.5 -mb-3.5 flex gap-2 border-t border-border bg-surface px-3.5 py-3">
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="md"
            full
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            {count > 0 ? `Apply ${count} filter${count === 1 ? "" : "s"}` : "Show everything"}
          </Button>
        </div>
      </div>
    </DropdownPanel>
  );
}

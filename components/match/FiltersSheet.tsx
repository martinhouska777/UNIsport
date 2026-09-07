"use client";

/*
  THE MATCH FILTER SHEET — one sheet, used by both Browse and Session search, so
  the two never offer different ways to narrow the same list.

  Every filter is optional: tick a row to open it, pick a value, untick to clear.
  Nothing ticked = see everyone.

  Activity comes first: it is the largest single cut you can make to the list,
  and it reads "anyone who does this", main activity or one of the extras, so a
  gym-first person who also runs is found by a search for runners.

  Concentration and interests follow because they're the ones people reach for
  to make a connection rather than just find a body in a gym ("who else is doing
  Ec?", "who else climbs?"). Both carry a "Same as mine" shortcut, since that's
  overwhelmingly the common case and typing your own concentration into a filter
  is silly. Gym, level and gender come last — the logistics.

  Colors are theme tokens; the option lists are the onboarding data, so a new
  concentration or interest appears here automatically.
*/
import type { ReactNode } from "react";
import {
  concentrations,
  interestOptions,
  experienceLevels,
  verifiedGyms,
  primaryActivities,
} from "@/lib/onboarding";
import type { MatchFilters } from "@/lib/supabase/matching";
import SearchableDropdown from "@/components/onboarding/SearchableDropdown";
import { Pill } from "@/components/onboarding/controls";

export const genderOptions: { key: string; label: string }[] = [
  { key: "male", label: "Men" },
  { key: "female", label: "Women" },
];

/** Everything unset — the "show me everyone" state. */
export const NO_FILTERS: MatchFilters = {
  activity: null,
  concentration: null,
  interests: null,
  gym: null,
  level: null,
  gender: null,
};

/** How many filters are actually narrowing the results right now. */
export function activeFilterCount(f: MatchFilters): number {
  return [
    f.activity,
    f.concentration,
    f.interests && f.interests.length > 0 ? f.interests : null,
    f.gym,
    f.level,
    f.gender,
  ].filter(Boolean).length;
}

/** The chips shown under the Filters button, each tappable to clear itself. */
export function activeFilterChips(
  f: MatchFilters,
): { key: keyof MatchFilters; label: string }[] {
  const chips: { key: keyof MatchFilters; label: string }[] = [];
  // Activity leads: it is the biggest cut you can make to the list.
  if (f.activity) {
    chips.push({
      key: "activity",
      label: primaryActivities.find((a) => a.key === f.activity)?.label ?? f.activity,
    });
  }
  if (f.concentration) chips.push({ key: "concentration", label: f.concentration });
  if (f.interests && f.interests.length > 0) {
    chips.push({
      key: "interests",
      label:
        f.interests.length === 1
          ? f.interests[0]
          : `${f.interests[0]} +${f.interests.length - 1}`,
    });
  }
  if (f.gym) chips.push({ key: "gym", label: f.gym });
  if (f.level) {
    chips.push({
      key: "level",
      label: experienceLevels.find((l) => l.key === f.level)?.name ?? f.level,
    });
  }
  if (f.gender) {
    chips.push({
      key: "gender",
      label: genderOptions.find((g) => g.key === f.gender)?.label ?? f.gender,
    });
  }
  return chips;
}

// A square tick-box. Ticking a row reveals its options; unticking clears it.
function CheckSquare({ checked }: { checked: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[5px] border text-[11px] font-bold ${
        checked
          ? "border-text bg-text text-background"
          : "border-border bg-surface-2 text-transparent"
      }`}
    >
      ✓
    </span>
  );
}

// One collapsible row: tick-box + title, and when ticked, whatever control the
// filter needs (pills for short lists, a searchable dropdown for long ones).
function FilterRow({
  title,
  open,
  onToggle,
  summary,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  summary?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-border py-3 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2.5 text-left"
      >
        <CheckSquare checked={open} />
        <span className="text-sm text-text">{title}</span>
        {summary && !open && (
          <span className="ml-auto truncate pl-2 text-xs text-muted">{summary}</span>
        )}
      </button>
      {open && <div className="mt-2.5 pl-[30px]">{children}</div>}
    </div>
  );
}

// The little "Same as mine" shortcut above a long dropdown.
function MineButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tap44 mb-2 rounded-full border px-3 py-1.5 text-[12px] ${
        active
          ? "border-primary bg-primary-tint text-primary"
          : "border-border bg-surface-2 text-muted"
      }`}
    >
      {label}
    </button>
  );
}

export default function FiltersSheet({
  value,
  onChange,
  openRows,
  onToggleRow,
  onClose,
  myConcentration,
  myInterests,
  showActivity = true,
}: {
  value: MatchFilters;
  onChange: (next: MatchFilters) => void;
  openRows: Set<string>;
  onToggleRow: (key: keyof MatchFilters) => void;
  onClose: () => void;
  /*
    Off on the session search, which asks for the activity itself as a required
    answer. Offering it twice, in two places, with one silently overriding the
    other, is how a filter sheet starts lying to people.
  */
  showActivity?: boolean;
  /** The signed-in user's own answers, for the "Same as mine" shortcuts. */
  myConcentration: string | null;
  myInterests: string[];
}) {
  const set = (patch: Partial<MatchFilters>) => onChange({ ...value, ...patch });

  const interests = value.interests ?? [];
  // "Same as mine" is on only when the picked set is exactly my own.
  const usingMyInterests =
    myInterests.length > 0 &&
    interests.length === myInterests.length &&
    myInterests.every((i) => interests.includes(i));

  /*
    A DROPDOWN, not a sheet. It used to slide up from the bottom of the screen
    while the button that opened it sat at the top — the two ends of one action
    at opposite ends of the phone. It now opens downwards from the bar, where
    the tap happened, the way a dropdown is expected to.
  */
  return (
    <div className="mt-2 max-h-[62dvh] overflow-y-auto rounded-xl border border-border bg-surface p-3.5">
      <div>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-medium text-text">Filters</h2>
          <button
            type="button"
            onClick={onClose}
            className="tap44 text-[13px] font-medium text-primary"
          >
            Done
          </button>
        </div>
        <p className="mb-1 text-[11px] text-muted">
          Tick a filter to narrow results. Leave all unticked to see everyone.
        </p>

        {showActivity && (
          <FilterRow
            title="Activity"
            open={openRows.has("activity")}
            onToggle={() => onToggleRow("activity")}
            summary={primaryActivities.find((a) => a.key === value.activity)?.label}
          >
            <div className="flex flex-wrap gap-1.5">
              {primaryActivities.map((a) => (
                <Pill
                  key={a.key}
                  label={a.label}
                  selected={value.activity === a.key}
                  onClick={() => set({ activity: value.activity === a.key ? null : a.key })}
                />
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-muted">
              Anyone who does this — their main thing or one of their extras.
            </p>
          </FilterRow>
        )}

        <FilterRow
          title="Concentration"
          open={openRows.has("concentration")}
          onToggle={() => onToggleRow("concentration")}
          summary={value.concentration}
        >
          {myConcentration && (
            <MineButton
              label={`Same as mine · ${myConcentration}`}
              active={value.concentration === myConcentration}
              onClick={() =>
                set({
                  concentration:
                    value.concentration === myConcentration ? null : myConcentration,
                })
              }
            />
          )}
          <SearchableDropdown
            options={concentrations}
            value={value.concentration ?? ""}
            onChange={(v) => set({ concentration: v || null })}
            placeholder="Any concentration"
            searchPlaceholder="Search concentrations…"
            ariaLabel="Concentration filter"
          />
        </FilterRow>

        <FilterRow
          title="Interests"
          open={openRows.has("interests")}
          onToggle={() => onToggleRow("interests")}
          summary={
            interests.length > 0
              ? interests.length === 1
                ? interests[0]
                : `${interests.length} picked`
              : null
          }
        >
          {myInterests.length > 0 && (
            <MineButton
              label="Same as mine"
              active={usingMyInterests}
              onClick={() => set({ interests: usingMyInterests ? null : myInterests })}
            />
          )}
          <SearchableDropdown
            multiple
            /* Once you've picked it, it leaves the list. It was appearing in
               both places at once — as a chip above and still as an option
               below — which reads as though the tap didn't take. */
            hideSelected
            options={interestOptions}
            value={interests}
            onChange={(v) => set({ interests: v.length > 0 ? v : null })}
            placeholder="Any interest"
            searchPlaceholder="Search interests…"
            ariaLabel="Interests filter"
          />
          <p className="mt-1.5 text-[11px] text-muted">
            Shows people into any of these. Sharing more still ranks higher.
          </p>
        </FilterRow>

        <FilterRow
          title="Gym"
          open={openRows.has("gym")}
          onToggle={() => onToggleRow("gym")}
          summary={value.gym}
        >
          <div className="flex flex-wrap gap-1.5">
            {verifiedGyms.map((g) => (
              <Pill
                key={g}
                label={g}
                selected={value.gym === g}
                onClick={() => set({ gym: value.gym === g ? null : g })}
              />
            ))}
          </div>
        </FilterRow>

        <FilterRow
          title="Level"
          open={openRows.has("level")}
          onToggle={() => onToggleRow("level")}
          summary={experienceLevels.find((l) => l.key === value.level)?.name}
        >
          <div className="flex flex-wrap gap-1.5">
            {experienceLevels.map((l) => (
              <Pill
                key={l.key}
                label={l.name}
                selected={value.level === l.key}
                onClick={() => set({ level: value.level === l.key ? null : l.key })}
              />
            ))}
          </div>
        </FilterRow>

        <FilterRow
          title="Gender"
          open={openRows.has("gender")}
          onToggle={() => onToggleRow("gender")}
          summary={genderOptions.find((g) => g.key === value.gender)?.label}
        >
          <div className="flex flex-wrap gap-1.5">
            {genderOptions.map((g) => (
              <Pill
                key={g.key}
                label={g.label}
                selected={value.gender === g.key}
                onClick={() => set({ gender: value.gender === g.key ? null : g.key })}
              />
            ))}
          </div>
        </FilterRow>
      </div>
    </div>
  );
}

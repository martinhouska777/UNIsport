"use client";

/*
  THE MATCH FILTER SHEET — one sheet, used by both Browse and Session search, so
  the two never offer different ways to narrow the same list.

  Every filter is optional and has its own small tab: tap a tab to see its
  options, pick a value, tap the value again (or Clear) to drop it. Nothing
  picked = see everyone.

  Nothing takes effect until you press APPLY. Every tap used to re-run the list
  behind the open sheet, so the results moved under your thumb while you were
  still choosing and there was no way to back out of a pick. You now edit a
  private copy and commit it in one go, the way filters work in every other app.

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
import { useState } from "react";
import {
  concentrations,
  interestOptions,
  experienceLevels,
  verifiedGyms,
  primaryActivities,
  classYears,
  classYearLabel,
} from "@/lib/onboarding";
import type { MatchFilters } from "@/lib/supabase/matching";
import SearchableDropdown from "@/components/onboarding/SearchableDropdown";
import { Pill } from "@/components/onboarding/controls";
import Button from "@/components/ui/Button";
import DropdownPanel from "@/components/ui/DropdownPanel";

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
  classYear: null,
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
    f.classYear,
  ].filter(Boolean).length;
}

/** "Fr '30" — a class year as a pill reads best with the word people say. */
const yearPill = (y: string) => `${classYearLabel(y)} ${y}`;

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
  if (f.classYear) chips.push({ key: "classYear", label: yearPill(f.classYear) });
  return chips;
}

/*
  THE BUTTONS AT THE FOOT OF BOTH FILTER PANELS — Cancel and Apply, the same
  width, side by side. Shared with the Buddy Board's panel so the two never
  drift apart. Cancel used to be a narrow button beside a wide one, which read
  as off-centre.
*/
export function FilterFooter({
  count,
  emptyLabel,
  onCancel,
  onApply,
}: {
  count: number;
  /** What Apply says while nothing is picked: "Show everyone", "Show everything". */
  emptyLabel: string;
  onCancel: () => void;
  onApply: () => void;
}) {
  return (
    <>
      <Button variant="secondary" size="md" className="flex-1" onClick={onCancel}>
        Cancel
      </Button>
      <Button size="md" className="flex-1" onClick={onApply}>
        {count > 0 ? `Apply ${count} filter${count === 1 ? "" : "s"}` : emptyLabel}
      </Button>
    </>
  );
}

type TabKey = keyof MatchFilters;

/*
  A FILTER TAB. The panel used to be seven full-width rows — a tick-box and a
  name on the left, the picked value far off on the right — so it took most of
  the screen before you had chosen anything. Now each filter is a small tab in a
  row that wraps; tapping one shows its options underneath, tapping it again
  hides them. A tab that already has something picked is tinted and carries a
  dot, so you can see what is set without opening anything.
*/
function FilterTab({
  label,
  open,
  set,
  onClick,
}: {
  label: string;
  open: boolean;
  set: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={`tap44 flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition-colors ${
        open
          ? "border-text bg-text text-background"
          : set
            ? "border-primary bg-primary-tint text-primary"
            : "border-border bg-surface-2 text-muted"
      }`}
    >
      {label}
      {set && (
        <span
          aria-hidden
          className={`h-1.5 w-1.5 rounded-full ${open ? "bg-background" : "bg-primary"}`}
        />
      )}
    </button>
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
  onApply,
  onClose,
  myConcentration,
  myInterests,
  showActivity = true,
}: {
  /** The filters currently narrowing the list — where the draft starts. */
  value: MatchFilters;
  /** Pressed Apply: the only moment the list is allowed to change. */
  onApply: (next: MatchFilters) => void;
  /** Closes the sheet, throwing away anything not applied. */
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
  /*
    THE DRAFT. The sheet is only mounted while it is open, so this starts as
    whatever was applied when it opened, and every pick below edits the copy.
  */
  const [draft, setDraft] = useState<MatchFilters>(value);
  /*
    Which tab is showing its options. None when the panel opens: the tabs alone
    are a short block, and the dot on a tab already says what is set.
  */
  const [openTab, setOpenTab] = useState<TabKey | null>(null);
  /*
    Clearing a chip on the bar outside changes the applied filters under us. The
    parent hands this component a `key` made of them, so that clears the draft
    by remounting the sheet — the sheet never shows a filter the bar says is
    gone, and there is no effect copying props into state behind the scenes.
  */
  const set = (patch: Partial<MatchFilters>) => setDraft((d) => ({ ...d, ...patch }));

  const count = activeFilterCount(draft);
  const toggleTab = (key: TabKey) => setOpenTab((t) => (t === key ? null : key));
  const isSet = (key: TabKey) => {
    const v = draft[key];
    return Array.isArray(v) ? v.length > 0 : v != null;
  };

  const tabs: { key: TabKey; label: string }[] = [
    ...(showActivity ? [{ key: "activity" as const, label: "Activity" }] : []),
    { key: "concentration", label: "Concentration" },
    { key: "interests", label: "Interests" },
    { key: "gym", label: "Gym" },
    { key: "level", label: "Level" },
    { key: "gender", label: "Gender" },
    { key: "classYear", label: "Class year" },
  ];

  const interests = draft.interests ?? [];
  // "Same as mine" is on only when the picked set is exactly my own.
  const usingMyInterests =
    myInterests.length > 0 &&
    interests.length === myInterests.length &&
    myInterests.every((i) => interests.includes(i));

  /*
    A DROPDOWN, not a sheet: it opens downwards from the Filters button, where
    the tap happened. DropdownPanel measures the room left below the button so
    the panel always ends ON the screen, with Cancel / Apply on its bottom edge.
  */
  return (
    <DropdownPanel
      footer={
        <FilterFooter
          count={count}
          emptyLabel="Show everyone"
          onCancel={onClose}
          onApply={() => {
            onApply(draft);
            onClose();
          }}
        />
      }
    >
      <div className="flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <FilterTab
            key={t.key}
            label={t.label}
            open={openTab === t.key}
            set={isSet(t.key)}
            onClick={() => toggleTab(t.key)}
          />
        ))}
      </div>

      {openTab && (
        <div className="mt-3 border-t border-border pt-3">
          {openTab === "activity" && (
            <div className="flex flex-wrap gap-1.5">
              {primaryActivities.map((a) => (
                <Pill
                  key={a.key}
                  label={a.label}
                  selected={draft.activity === a.key}
                  onClick={() => set({ activity: draft.activity === a.key ? null : a.key })}
                />
              ))}
            </div>
          )}

          {openTab === "concentration" && (
            <>
              {myConcentration && (
                <MineButton
                  label={`Same as mine · ${myConcentration}`}
                  active={draft.concentration === myConcentration}
                  onClick={() =>
                    set({
                      concentration:
                        draft.concentration === myConcentration ? null : myConcentration,
                    })
                  }
                />
              )}
              <SearchableDropdown
                options={concentrations}
                value={draft.concentration ?? ""}
                onChange={(v) => set({ concentration: v || null })}
                placeholder="Any concentration"
                searchPlaceholder="Search concentrations…"
                ariaLabel="Concentration filter"
              />
            </>
          )}

          {openTab === "interests" && (
            <>
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
            </>
          )}

          {openTab === "gym" && (
            <div className="flex flex-wrap gap-1.5">
              {verifiedGyms.map((g) => (
                <Pill
                  key={g}
                  label={g}
                  selected={draft.gym === g}
                  onClick={() => set({ gym: draft.gym === g ? null : g })}
                />
              ))}
            </div>
          )}

          {openTab === "level" && (
            <div className="flex flex-wrap gap-1.5">
              {experienceLevels.map((l) => (
                <Pill
                  key={l.key}
                  label={l.name}
                  selected={draft.level === l.key}
                  onClick={() => set({ level: draft.level === l.key ? null : l.key })}
                />
              ))}
            </div>
          )}

          {openTab === "gender" && (
            <div className="flex flex-wrap gap-1.5">
              {genderOptions.map((g) => (
                <Pill
                  key={g.key}
                  label={g.label}
                  selected={draft.gender === g.key}
                  onClick={() => set({ gender: draft.gender === g.key ? null : g.key })}
                />
              ))}
            </div>
          )}

          {/* A first-year's Match opens on this by default for their first
              month (lib/onboarding.ts); for everyone it is one more way in. */}
          {openTab === "classYear" && (
            <div className="flex flex-wrap gap-1.5">
              {classYears.map((y) => (
                <Pill
                  key={y}
                  label={yearPill(y)}
                  selected={draft.classYear === y}
                  onClick={() => set({ classYear: draft.classYear === y ? null : y })}
                />
              ))}
            </div>
          )}

          {/* Drops just this one filter. The concentration dropdown has no
              "none" row, so without this a picked one couldn't be undone here. */}
          {isSet(openTab) && (
            <button
              type="button"
              onClick={() => set({ [openTab]: null } as Partial<MatchFilters>)}
              className="tap44 mt-2 text-[12px] text-muted"
            >
              Clear {tabs.find((t) => t.key === openTab)?.label.toLowerCase()}
            </button>
          )}
        </div>
      )}
    </DropdownPanel>
  );
}

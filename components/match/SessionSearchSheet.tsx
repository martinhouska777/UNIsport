"use client";

/*
  SEARCH BY TIME — "who is free on Thursday around 7?", as its own sheet.

  This used to be a collapsible fold at the top of the Sessions tab, with its
  results rendered INSIDE the fold — so collapsing it hid the answer, and the
  tab opened on two controls and a fold instead of on people. The Buddy Board
  is the whole Sessions tab now; this search lives behind a small link and
  opens as a sheet with its form at the top and its results underneath, one
  list per screen.

  What it asks: an activity ("Other" means every activity) and a day; the hour
  is optional (no hour = anyone training that day) and how far either side of
  it still counts is a preset you can move (lib/onboarding.ts). Filters are
  the same sheet the People tab uses and appear WITH the results.

  Data via lib/supabase/matching.ts; colours are theme tokens.
*/
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { getSessionMatches, type Match, type MatchFilters } from "@/lib/supabase/matching";
import {
  primaryActivities,
  sessionTimeSlots,
  sessionTimeLabel,
  verifiedGyms,
  SESSION_WINDOW_HOURS,
  sessionWindows,
} from "@/lib/onboarding";
import { dayKeyOf, dateLabel } from "@/lib/schedule";
import { Pill, FieldLabel, SelectField } from "@/components/onboarding/controls";
import WeekPicker from "@/components/match/WeekPicker";
import MatchGrid from "@/components/match/MatchGrid";
import FilterBar from "@/components/match/FilterBar";
import FiltersSheet, { activeFilterCount, activeFilterChips, NO_FILTERS } from "@/components/match/FiltersSheet";
import { IconX } from "@/components/icons";

/* The session search scores out of 92 (no schedule component — the slot is fixed). */
const SESSION_MAX = 92;

function Status({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-10 text-center text-sm text-muted">{children}</div>;
}

export default function SessionSearchSheet({
  userId,
  filters,
  onChangeFilters,
  myConcentration,
  myInterests,
  onView,
  onClose,
}: {
  userId: string;
  /** The same filters the People tab uses — one piece of state, shared. */
  filters: MatchFilters;
  onChangeFilters: (next: MatchFilters) => void;
  myConcentration: string | null;
  myInterests: string[];
  onView: (m: Match, max: number) => void;
  onClose: () => void;
}) {
  // --- REQUIRED: what and when ---
  const [activity, setActivity] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  /* OPTIONAL. No time means "anyone training that day". */
  const [hour, setHour] = useState<number | null>(null);
  const [windowHours, setWindowHours] = useState(SESSION_WINDOW_HOURS);

  const [results, setResults] = useState<Match[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* True when the exact hour found nobody and we widened to the whole day. */
  const [widened, setWidened] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canSearch = !!activity && !!date;
  const anyTime = hour === null;

  const runSearch = async (withFilters: MatchFilters = filters) => {
    if (!userId || !canSearch) return;
    setSearching(true);
    setError(null);
    try {
      /* Shared filters FIRST: the answers below are this screen's own and must
         win over anything left in the sheet. No hour = the middle of the day,
         opened wide enough to cover all of it. */
      const ask = {
        ...withFilters,
        userId,
        activity: activity === "other" ? null : activity,
        day: dayKeyOf(date!),
        hour: anyTime ? 12 : hour!,
        windowHours: anyTime ? 12 : windowHours,
      };
      let rows = await getSessionMatches(ask);
      /* Nobody at 9? Then say who IS training that day rather than an empty
         screen — and say plainly that the time was widened. */
      const wide = rows.length === 0 && !anyTime && windowHours < 12;
      if (wide) rows = await getSessionMatches({ ...ask, hour: 12, windowHours: 12 });
      setWidened(wide && rows.length > 0);
      setResults(rows);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSearching(false);
    }
  };

  // Once results are on screen the filters narrow them live.
  const changeFilters = (next: MatchFilters) => {
    onChangeFilters(next);
    if (results !== null) void runSearch(next);
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 [animation:backdrop-in_0.2s_ease-out]"
      />

      <div className="sheet-floor relative flex max-h-[92%] flex-col rounded-t-3xl border-t border-border bg-surface [animation:sheet-up_0.28s_cubic-bezier(0.2,0.8,0.2,1)]">
        <div className="flex justify-center pb-1.5 pt-2.5">
          <div className="h-1 w-9 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between border-b border-border px-4 pb-3">
          <div>
            <div className="text-[15px] font-medium text-text">Search by time</div>
            <div className="mt-0.5 text-[11px] text-muted">
              Who is free to train on a day, at an hour — from people’s weekly schedules.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="tap44 press-icon flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted"
          >
            <IconX size={14} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-3 p-3.5">
            <div>
              <FieldLabel>Activity</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {primaryActivities.map((a) => (
                  <Pill key={a.key} label={a.label} selected={activity === a.key} onClick={() => setActivity(a.key)} />
                ))}
              </div>
              {activity === "other" && (
                <p className="mt-1 text-[11px] text-muted">Everyone training then, whatever they do.</p>
              )}
            </div>

            <div>
              <FieldLabel>Day</FieldLabel>
              <WeekPicker value={date} onChange={setDate} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <FieldLabel>Gym</FieldLabel>
                <SelectField
                  value={filters.gym ?? ""}
                  onChange={(v) => changeFilters({ ...filters, gym: v === "" ? null : v })}
                  options={verifiedGyms.map((g) => ({ value: g, label: g }))}
                  placeholder="Any gym"
                  ariaLabel="Gym"
                />
              </div>
              <div>
                <FieldLabel>Time</FieldLabel>
                <SelectField
                  value={hour === null ? "" : String(hour)}
                  onChange={(v) => setHour(v === "" ? null : Number(v))}
                  options={sessionTimeSlots.map((t) => ({ value: String(t.value), label: t.label }))}
                  placeholder="Any time"
                  ariaLabel="Time"
                />
              </div>
            </div>

            {!anyTime && (
              <div className="flex flex-wrap gap-1.5">
                {sessionWindows.map((w) => (
                  <Pill key={w.hours} label={w.label} selected={windowHours === w.hours} onClick={() => setWindowHours(w.hours)} />
                ))}
              </div>
            )}

            <p className="-mt-1.5 text-[11px] text-muted">
              {anyTime
                ? "Shows everyone training that day. Pick a time to narrow it down."
                : windowHours >= 12
                  ? `Shows everyone training that day, whatever time ${sessionTimeLabel(hour!)} turns into.`
                  : `Shows people training ${sessionWindows.find((w) => w.hours === windowHours)?.full ?? ""} of ${sessionTimeLabel(hour!)}.`}
            </p>

            <Button size="lg" full onClick={() => runSearch()} disabled={!canSearch || searching}>
              {searching ? "Searching…" : "Search"}
            </Button>
            {!canSearch && (
              <p className="text-center text-[11px] text-muted">Pick an activity and a day to search.</p>
            )}
          </div>

          {/* RESULTS — inside the same sheet, under the form, so the answer is
              never hidden behind the question. */}
          {error && <Status>Search failed: {error}</Status>}
          {!error && results && (
            <div className="border-t border-border pt-3">
              <div className="px-3.5 pb-3">
                <FilterBar
                  count={activeFilterCount(filters)}
                  chips={activeFilterChips(filters)}
                  onOpen={() => setFiltersOpen((v) => !v)}
                  onClear={(key) => changeFilters({ ...filters, [key]: null })}
                  onClearAll={() => changeFilters(NO_FILTERS)}
                  total={results.length}
                  noun="person"
                  plural="people"
                  open={filtersOpen}
                />
                {filtersOpen && (
                  <FiltersSheet
                    key={JSON.stringify(filters)}
                    value={filters}
                    onApply={changeFilters}
                    onClose={() => setFiltersOpen(false)}
                    myConcentration={myConcentration}
                    myInterests={myInterests}
                    showActivity={false}
                  />
                )}
              </div>
              {results.length === 0 ? (
                <Status>No one is training that day yet. Try another day.</Status>
              ) : (
                <>
                  {widened && hour !== null && (
                    <p className="px-3.5 pb-2 text-[12px] text-muted">
                      Nobody at {sessionTimeLabel(hour)} — here&apos;s who else is training
                      {date ? ` ${dateLabel(date)}` : " that day"}.
                    </p>
                  )}
                  <MatchGrid matches={results} max={SESSION_MAX} onView={onView} />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

/*
  MATCH TAB. TWO sub-tabs — it had three, and all three meant "find a partner",
  which left nobody able to say which one they were supposed to use:

  - People: all compatible partners, scored out of 100, best first.
  - Sessions: one screen for "I want to train on Thursday". The board of open
    posts is what you land on; posting your own is a button on it; and the timed
    search — pick WHAT (activity) + WHEN (day + hour), all required, and it finds
    people free within ~2h of that — is folded away above the board for when you
    already know exactly when you're going.

  Every result card carries the REASONS that person ranked where they did (see
  lib/matchReasons.ts) — the things you actually share. Tapping through to their
  profile shows the full list.

  FILTERS are shared by Browse and Session search: one sheet, one piece of state,
  so a concentration you picked on one tab still applies on the other. Browse
  re-runs the moment a filter changes; Session search waits for the Search button
  because its required day/hour aren't a filter, they're the question.

  Data comes from the SQL RPC functions via lib/supabase/matching.ts. All colors
  are theme tokens; the choice lists reuse the onboarding data so they stay
  data-driven.
*/
import { Suspense, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppState } from "@/components/AppState";
import { useProfileData } from "@/components/profile/useProfileData";
import {
  getBrowseMatches,
  getSessionMatches,
  type Match,
  type MatchFilters,
} from "@/lib/supabase/matching";
import {
  primaryActivities,
  sessionTimeSlots,
  sessionTimeLabel,
  verifiedGyms,
  SESSION_WINDOW_HOURS,
} from "@/lib/onboarding";
import { matchTier, isWorthShowing } from "@/lib/matchTier";
import MatchCard from "@/components/match/MatchCard";
import WeekPicker from "@/components/match/WeekPicker";
import { reasonRarity } from "@/lib/matchReasons";
import { dayKeyOf, dateLabel } from "@/lib/schedule";
import BuddyBoard from "@/components/match/BuddyBoard";
import FilterBar from "@/components/match/FilterBar";
import FiltersSheet, {
  NO_FILTERS,
  activeFilterCount,
  activeFilterChips,
} from "@/components/match/FiltersSheet";
import { Pill, FieldLabel, SelectField } from "@/components/onboarding/controls";
import { IconChevronDown } from "@/components/icons";

type SubTab = "people" | "sessions";

const subTabs: { key: SubTab; label: string }[] = [
  { key: "people", label: "People" },
  { key: "sessions", label: "Sessions" },
];

function Grid({
  matches,
  max,
  onView,
}: {
  matches: Match[];
  max: number;
  onView: (m: Match, max: number) => void;
}) {
  // Candidates below the weakest tier are dropped rather than shown — a 6%
  // match on screen makes the whole list look like it failed.
  const worthShowing = matches.filter((m) => isWorthShowing(m.score, max));
  /*
    Measured ACROSS the list that is actually on screen, then handed to every
    card, so each one can lead with the fact its neighbours don't have. Computed
    from worthShowing rather than from every candidate: the point is to stand out
    among the people you can see.
  */
  const rarity = reasonRarity(worthShowing);
  return (
    <div className="grid grid-cols-2 items-start gap-2 px-3 pb-4">
      {worthShowing.map((m) => (
        <MatchCard
          key={m.userId}
          match={m}
          max={max}
          rarity={rarity}
          onView={(x) => onView(x, max)}
        />
      ))}
    </div>
  );
}

function Status({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-16 text-center text-sm text-muted">{children}</div>;
}

// The Filters button plus the chips for whatever is currently narrowing the
// list. Shown on both Browse and Session search, driven by the same state — and
// the presentation itself is shared with the Buddy Board (components/match/
// FilterBar.tsx) so all three lists are narrowed the same way.
function MatchFilterBar({
  filters,
  onChange,
  open,
  onToggleOpen,
  onClear,
  onClearAll,
  total,
  openRows,
  onToggleRow,
  myConcentration,
  myInterests,
  showActivity,
}: {
  filters: MatchFilters;
  onChange: (next: MatchFilters) => void;
  open: boolean;
  onToggleOpen: () => void;
  onClear: (key: keyof MatchFilters) => void;
  onClearAll: () => void;
  /** How many people survived — null while the list is still loading. */
  total?: number | null;
  openRows: Set<string>;
  onToggleRow: (key: keyof MatchFilters) => void;
  myConcentration: string | null;
  myInterests: string[];
  showActivity?: boolean;
}) {
  return (
    <>
      <FilterBar
        count={activeFilterCount(filters)}
        chips={activeFilterChips(filters)}
        onOpen={onToggleOpen}
        onClear={(key) => onClear(key as keyof MatchFilters)}
        onClearAll={onClearAll}
        total={total}
        noun="person"
        open={open}
      />
      {open && (
        <FiltersSheet
          value={filters}
          onChange={onChange}
          openRows={openRows}
          onToggleRow={onToggleRow}
          onClose={onToggleOpen}
          myConcentration={myConcentration}
          myInterests={myInterests}
          showActivity={showActivity}
        />
      )}
    </>
  );
}

// useSearchParams() needs a Suspense boundary or the production build fails
// ("Missing Suspense boundary with useSearchParams").
export default function MatchPage() {
  return (
    <Suspense
      fallback={<div className="px-6 py-20 text-center text-sm text-muted">Loading…</div>}
    >
      <MatchScreen />
    </Suspense>
  );
}

function MatchScreen() {
  const { userId } = useAppState();
  const { data: myProfile } = useProfileData();
  const router = useRouter();
  const search = useSearchParams();

  /*
    Arriving from a gym's "Find a partner at this gym" button (/match?gym=...):
    open Sessions with the timed search unfolded and that gym already filtered
    in, so the tap carries the user's intent instead of dropping them on a blank
    list of everyone.
    Only gym names the app knows are accepted — never arbitrary URL text.
  */
  const gymParam = search.get("gym");
  const presetGym = gymParam && verifiedGyms.includes(gymParam) ? gymParam : null;

  const [tab, setTab] = useState<SubTab>(presetGym ? "sessions" : "people");

  // My own answers, for the sheet's "Same as mine" shortcuts.
  const myConcentration = (myProfile?.concentration as string) || null;
  const myInterests = useMemo(
    () => (Array.isArray(myProfile?.interests) ? (myProfile.interests as string[]) : []),
    [myProfile],
  );

  // Open another person's profile, passing the exact fit tier shown on their
  // card so the profile badge says the same thing the card did.
  const viewProfile = (m: Match, max: number) => {
    const tier = matchTier(m.score, max);
    router.push(
      tier
        ? `/people/${m.userId}?fit=${encodeURIComponent(tier.label)}`
        : `/people/${m.userId}`,
    );
  };

  // --- Shared filters (both Browse and Session search) ---
  const [filters, setFilters] = useState<MatchFilters>(() =>
    presetGym ? { ...NO_FILTERS, gym: presetGym } : NO_FILTERS,
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  // Which rows are ticked open. A row open with no pick yet = no filter.
  const [openRows, setOpenRows] = useState<Set<string>>(
    () => new Set(presetGym ? ["gym"] : []),
  );

  const toggleRow = (key: keyof MatchFilters) => {
    setOpenRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        setFilters((f) => ({ ...f, [key]: null })); // unticking clears the choice
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const clearFilter = (key: keyof MatchFilters) => {
    setFilters((f) => ({ ...f, [key]: null }));
    setOpenRows((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  /*
    --- Browse state ---
    Re-runs whenever a filter changes. `filters` is a new object every time it's
    edited, so identity is the signal: a stored result is only shown while it
    still belongs to the filters on screen, which makes "loading" something we
    derive rather than a flag to reset (resetting one inside the effect would
    cascade a render) and drops a slow reply that a newer search has overtaken.
  */
  type BrowseResult = { forFilters: MatchFilters; rows?: Match[]; error?: string };
  const [browseResult, setBrowseResult] = useState<BrowseResult | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    getBrowseMatches(userId, filters)
      .then((rows) => {
        if (active) setBrowseResult({ forFilters: filters, rows });
      })
      .catch((e: Error) => {
        if (active) setBrowseResult({ forFilters: filters, error: e.message });
      });
    return () => {
      active = false;
    };
  }, [userId, filters]);

  const current = browseResult?.forFilters === filters ? browseResult : null;
  const browse = current?.rows ?? null;
  const browseErr = current?.error ?? null;

  // --- Session-search REQUIRED state ---
  const [activity, setActivity] = useState<string | null>(null);
  /* A real DATE now, not "some Monday" — see components/match/WeekPicker.tsx.
     Matching still searches on the weekday it falls on, because a training
     schedule is a weekly habit rather than a diary. */
  const [date, setDate] = useState<string | null>(null);
  const [week, setWeek] = useState(0);
  const [hour, setHour] = useState<number | null>(null);

  const [results, setResults] = useState<Match[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [sessionErr, setSessionErr] = useState<string | null>(null);

  const canSearch = !!activity && !!date && hour !== null;
  /*
    True when the exact hour found nobody and we widened to the whole day. The
    results are then real but looser, and the screen has to say so rather than
    quietly pretending they were what was asked for.
  */
  const [widened, setWidened] = useState(false);

  const runSearch = async () => {
    if (!userId || !canSearch) return;
    setSearching(true);
    setSessionErr(null);
    try {
      // Shared filters FIRST: the three below are this screen's own required
      // answers and must win over anything left in the sheet.
      const ask = {
        ...filters,
        userId,
        activity: activity!,
        day: dayKeyOf(date!),
        hour: hour!,
      };
      let rows = await getSessionMatches(ask);
      /*
        Nobody at 9? Then say who IS training that day rather than showing an
        empty screen — three people two hours later is a far more useful answer
        than "no one", and the heading above them says plainly that the time was
        widened.
      */
      const wide = rows.length === 0;
      if (wide) rows = await getSessionMatches({ ...ask, windowHours: 12 });
      setWidened(wide && rows.length > 0);
      setResults(rows);
    } catch (e) {
      setSessionErr((e as Error).message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-screen-sm">
      {/* Header */}
      <div className="flex items-center px-4 pt-3">
        <h1 className="text-base font-medium text-text">Match</h1>
      </div>

      {/* Sub-tab switch */}
      <div className="px-3 pb-2 pt-2.5">
        <div className="flex overflow-hidden rounded-xl border border-border">
          {subTabs.map((s) => (
            <button
              key={s.key}
              type="button"
              /* The Match tour presses each of these in turn, then explains
                 the screen it just switched to (lib/tour.ts). */
              data-tour={`match-tab-${s.key}`}
              onClick={() => setTab(s.key)}
              className={`min-h-11 flex-1 py-2 text-xs font-medium transition-colors ${
                tab === s.key ? "bg-text text-background" : "bg-surface-2 text-muted"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* PEOPLE — everyone, ranked */}
      {tab === "people" && (
        <>
          <div className="px-3 pb-2">
            <MatchFilterBar
              filters={filters}
              onChange={setFilters}
              open={sheetOpen}
              onToggleOpen={() => setSheetOpen((v) => !v)}
              onClear={clearFilter}
              onClearAll={() => setFilters(NO_FILTERS)}
              total={browse?.length ?? null}
              openRows={openRows}
              onToggleRow={toggleRow}
              myConcentration={myConcentration}
              myInterests={myInterests}
            />
          </div>
          {browseErr && <Status>Couldn’t load matches: {browseErr}</Status>}
          {!browseErr && browse === null && <Status>Finding your matches…</Status>}
          {!browseErr && browse && browse.length === 0 && (
            <Status>
              {activeFilterCount(filters) > 0
                ? "Nobody matches those filters yet. Try clearing one."
                : "No matches yet. As more people finish onboarding, they’ll show up here."}
            </Status>
          )}
          {!browseErr && browse && browse.length > 0 && (
            /* The count used to live in a small-caps heading here. It is on the
               filter bar now, beside the control that changes it. */
            <Grid matches={browse} max={100} onView={viewProfile} />
          )}
        </>
      )}

      {/*
        SESSIONS. The timed search, folded away — it answers a narrower question
        than the board underneath it ("who is free at 7 on Thursday" rather than
        "who wants to train this week"), so it opens on demand instead of
        standing between you and the posts. Arriving from a gym's "find a partner
        here" button opens it, because that tap already said when-ish.
      */}
      {tab === "sessions" && (
        <div className="px-3 pb-4">
          <details className="group rounded-xl border border-border bg-surface-2" open={!!presetGym}>
            <summary className="tap44 flex cursor-pointer list-none items-center justify-between px-3.5 py-3 [&::-webkit-details-marker]:hidden">
              <span className="text-sm font-medium text-text">Find a partner by time</span>
              <span className="text-muted transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none">
                <IconChevronDown size={16} />
              </span>
            </summary>
            <div className="flex flex-col gap-3 border-t border-border p-3.5">
            {/* REQUIRED: Activity */}
            <div>
              <FieldLabel>Activity</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {primaryActivities.map((a) => (
                  <Pill
                    key={a.key}
                    label={a.label}
                    selected={activity === a.key}
                    onClick={() => setActivity(a.key)}
                  />
                ))}
              </div>
            </div>

            {/* REQUIRED: Day — a real date, up to a month out */}
            <div>
              <FieldLabel>Day</FieldLabel>
              <WeekPicker value={date} onChange={setDate} week={week} onWeekChange={setWeek} />
            </div>

            {/* REQUIRED: Time — a dropdown, which is a wheel on a phone. It was
                thirty pills you dragged sideways through to reach 7:30. */}
            <div>
              <FieldLabel>Time</FieldLabel>
              <SelectField
                value={hour === null ? "" : String(hour)}
                onChange={(v) => setHour(v === "" ? null : Number(v))}
                options={sessionTimeSlots.map((t) => ({
                  value: String(t.value),
                  label: t.label,
                }))}
                placeholder="Pick a time"
                ariaLabel="Time"
              />
              <p className="mt-1 text-[11px] text-muted">
                {hour !== null
                  ? `Shows people training within ${SESSION_WINDOW_HOURS}h of ${sessionTimeLabel(
                      hour,
                    )}.`
                  : `Pick a time — we’ll find people training within ${SESSION_WINDOW_HOURS}h of it.`}
              </p>
            </div>

            {/* OPTIONAL filters — the same sheet Browse uses */}
            <MatchFilterBar
              filters={filters}
              onChange={setFilters}
              open={sheetOpen}
              onToggleOpen={() => setSheetOpen((v) => !v)}
              onClear={clearFilter}
              onClearAll={() => setFilters(NO_FILTERS)}
              openRows={openRows}
              onToggleRow={toggleRow}
              myConcentration={myConcentration}
              myInterests={myInterests}
              showActivity={false}
            />

            <Button size="lg" full onClick={runSearch} disabled={!canSearch || searching}>
              {searching ? "Searching…" : "Search"}
            </Button>
            {!canSearch && (
              <p className="text-center text-[11px] text-muted">
                Pick an activity, day, and time to search.
              </p>
            )}
          </div>

          {/* Results */}
          {sessionErr && <Status>Search failed: {sessionErr}</Status>}
          {!sessionErr && results && (
            <div className="pt-3">
              {results.length === 0 ? (
                <Status>No one is training that day yet. Try another day.</Status>
              ) : (
                <>
                  {/* Said out loud. These people are real, but they are not
                      what was asked for, and a list that quietly answers a
                      different question is worse than an empty one. */}
                  {widened && hour !== null && (
                    <p className="px-3 pb-2 text-[12px] text-muted">
                      Nobody at {sessionTimeLabel(hour)} — here&apos;s who else is training
                      {date ? ` ${dateLabel(date)}` : " that day"}.
                    </p>
                  )}
                  <Grid matches={results} max={92} onView={viewProfile} />
                </>
              )}
            </div>
          )}
          </details>
        </div>
      )}

      {/* The board itself — the default view of this tab. */}
      {tab === "sessions" && <BuddyBoard />}

    </div>
  );
}

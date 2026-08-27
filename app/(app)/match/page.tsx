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
  weekDays,
  primaryActivities,
  sessionTimeSlots,
  sessionTimeLabel,
  verifiedGyms,
  SESSION_WINDOW_HOURS,
} from "@/lib/onboarding";
import { matchTier, isWorthShowing } from "@/lib/matchTier";
import MatchCard from "@/components/match/MatchCard";
import BuddyBoard from "@/components/match/BuddyBoard";
import FilterBar from "@/components/match/FilterBar";
import FiltersSheet, {
  NO_FILTERS,
  activeFilterCount,
  activeFilterChips,
} from "@/components/match/FiltersSheet";
import { Pill, FieldLabel } from "@/components/onboarding/controls";
import { IconChevronDown } from "@/components/icons";

type SubTab = "people" | "sessions";

const subTabs: { key: SubTab; label: string; heading: string }[] = [
  { key: "people", label: "People", heading: "SORTED BY FIT" },
  { key: "sessions", label: "Sessions", heading: "THE COMING WEEK" },
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
  return (
    <div className="grid grid-cols-2 items-start gap-2 px-3 pb-4">
      {worthShowing.map((m) => (
        <MatchCard key={m.userId} match={m} max={max} onView={(x) => onView(x, max)} />
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
  onOpen,
  onClear,
}: {
  filters: MatchFilters;
  onOpen: () => void;
  onClear: (key: keyof MatchFilters) => void;
}) {
  return (
    <FilterBar
      count={activeFilterCount(filters)}
      chips={activeFilterChips(filters)}
      onOpen={onOpen}
      onClear={(key) => onClear(key as keyof MatchFilters)}
    />
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
  const [day, setDay] = useState<string | null>(null);
  const [hour, setHour] = useState<number | null>(null);

  const [results, setResults] = useState<Match[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [sessionErr, setSessionErr] = useState<string | null>(null);

  const canSearch = !!activity && !!day && hour !== null;

  const runSearch = async () => {
    if (!userId || !canSearch) return;
    setSearching(true);
    setSessionErr(null);
    try {
      const rows = await getSessionMatches({
        userId,
        activity: activity!,
        day: day!,
        hour: hour!,
        ...filters,
      });
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
      <div className="flex items-center justify-between px-4 pt-3">
        <h1 className="text-base font-medium text-text">Match</h1>
        <span className="text-[11px] tracking-[0.06em] text-muted">
          {subTabs.find((s) => s.key === tab)?.heading}
        </span>
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
              onOpen={() => setSheetOpen(true)}
              onClear={clearFilter}
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
            <>
              <div className="px-3 pb-1.5 text-[11px] tracking-[0.06em] text-muted">
                {browse.length} {browse.length === 1 ? "PERSON" : "PEOPLE"} · SORTED BY COMPATIBILITY
              </div>
              <Grid matches={browse} max={100} onView={viewProfile} />
            </>
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
              <span className="text-sm font-medium text-text">Free at a set time?</span>
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

            {/* REQUIRED: Day */}
            <div>
              <FieldLabel>Day</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {weekDays.map((d) => (
                  <Pill
                    key={d.key}
                    label={d.label.slice(0, 3)}
                    selected={day === d.key}
                    onClick={() => setDay(d.key)}
                  />
                ))}
              </div>
            </div>

            {/* REQUIRED: Time (precise hour, scroll to pick) */}
            <div>
              <FieldLabel>Time</FieldLabel>
              <div className="-mx-0.5 chip-row flex gap-1.5 overflow-x-auto px-0.5 pb-1">
                {sessionTimeSlots.map((s) => (
                  <div key={s.value} className="flex-shrink-0">
                    <Pill
                      label={s.label}
                      selected={hour === s.value}
                      onClick={() => setHour(s.value)}
                    />
                  </div>
                ))}
              </div>
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
              onOpen={() => setSheetOpen(true)}
              onClear={clearFilter}
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
              <div className="pb-1.5 text-[11px] tracking-[0.06em] text-muted">
                {results.length} {results.length === 1 ? "PERSON" : "PEOPLE"} AVAILABLE
              </div>
              {results.length === 0 ? (
                <Status>No one matches those filters yet. Try a different time.</Status>
              ) : (
                <Grid matches={results} max={92} onView={viewProfile} />
              )}
            </div>
          )}
          </details>
        </div>
      )}

      {/* The board itself — the default view of this tab. */}
      {tab === "sessions" && <BuddyBoard />}

      {sheetOpen && (
        <FiltersSheet
          value={filters}
          onChange={setFilters}
          openRows={openRows}
          onToggleRow={toggleRow}
          onClose={() => setSheetOpen(false)}
          myConcentration={myConcentration}
          myInterests={myInterests}
        />
      )}
    </div>
  );
}

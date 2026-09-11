"use client";

/*
  MATCH TAB. TWO sub-tabs — it had three, and all three meant "find a partner",
  which left nobody able to say which one they were supposed to use:

  - People: everyone at your school, best fit first, then "Also on campus".
  - Sessions: the Buddy Board — everyone who has said what they want to train
    and when — IS the tab. You land on people, not on controls. Posting your
    own is a button on it, and the timed search ("who is free Thursday around
    7?") sits behind a small "Search by time" link that opens as its own sheet
    with its results inside it (components/match/SessionSearchSheet.tsx). It
    used to be a fold at the top of the tab with the results rendered inside
    the fold, so collapsing it hid the answer.

  Every result card carries the REASONS that person ranked where they did (see
  lib/matchReasons.ts) — the things you actually share. Tapping through to their
  profile shows the full list.

  FILTERS are shared by People and the session search: one sheet, one piece of
  state, so a concentration you picked on one still applies on the other. They
  are a DRAFT until you press Apply in the sheet (components/match/
  FiltersSheet.tsx) — the only moment either list re-runs.

  Data comes from the SQL RPC functions via lib/supabase/matching.ts. All colors
  are theme tokens; the choice lists reuse the onboarding data so they stay
  data-driven.
*/
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppState } from "@/components/AppState";
import { useProfileData } from "@/components/profile/useProfileData";
import { getBrowseMatches, type Match, type MatchFilters } from "@/lib/supabase/matching";
import { verifiedGyms } from "@/lib/onboarding";
import { isNewFirstYear as newFirstYear } from "@/lib/cohorts";
import { matchTier } from "@/lib/matchTier";
import MatchGrid from "@/components/match/MatchGrid";
import BuddyBoard from "@/components/match/BuddyBoard";
import SessionSearchSheet from "@/components/match/SessionSearchSheet";
import ShareInviteButton from "@/components/ShareInviteButton";
import FilterBar from "@/components/match/FilterBar";
import FiltersSheet, {
  NO_FILTERS,
  activeFilterCount,
  activeFilterChips,
} from "@/components/match/FiltersSheet";
import { IconSearch } from "@/components/icons";

type SubTab = "people" | "sessions";

const subTabs: { key: SubTab; label: string }[] = [
  { key: "people", label: "People" },
  { key: "sessions", label: "Sessions" },
];

function Status({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-16 text-center text-sm text-muted">{children}</div>;
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
  const { userId, signedUpAt } = useAppState();
  const { data: myProfile } = useProfileData();
  const router = useRouter();
  const search = useSearchParams();

  /*
    Arriving from a gym page's "See who else is going" (/match?gym=...): open
    Sessions with the board already narrowed to that gym, so the tap carries
    the intent instead of dropping them on everyone. Only gym names the app
    knows are accepted — never arbitrary URL text.
  */
  const gymParam = search.get("gym");
  const presetGym = gymParam && verifiedGyms.includes(gymParam) ? gymParam : null;

  const [tab, setTab] = useState<SubTab>(presetGym ? "sessions" : "people");
  const [searchOpen, setSearchOpen] = useState(false);

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

  // --- Shared filters (People and the session search) ---
  /*
    A FIRST-YEAR'S FIRST MONTH opens on their own class year: the people they
    will actually meet in September are other first-years, and a list of
    seniors on day one says "not for you". A default, not a wall — the chip
    clears with a tap. `chosen` is null until the person touches a filter, so
    the default can be worked out once the profile has loaded without an
    effect writing state; anything they set replaces it entirely.
  */
  const myYear = (myProfile?.classYear as string | undefined) ?? null;
  // The clock is read once, when the screen opens — a render must stay pure.
  const [openedAt] = useState(() => Date.now());
  const isNewFirstYear = newFirstYear(myYear, signedUpAt, openedAt);
  const defaultFilters = useMemo<MatchFilters>(
    () => ({
      ...NO_FILTERS,
      ...(presetGym ? { gym: presetGym } : {}),
      ...(isNewFirstYear && myYear ? { classYear: myYear } : {}),
    }),
    [presetGym, isNewFirstYear, myYear],
  );
  const [chosen, setChosen] = useState<MatchFilters | null>(null);
  const filters = chosen ?? defaultFilters;
  const setFilters = (next: MatchFilters) => setChosen(next);
  const [sheetOpen, setSheetOpen] = useState(false);
  const clearFilter = (key: keyof MatchFilters) => setFilters({ ...filters, [key]: null });

  /*
    --- People ---
    Re-runs whenever a filter changes. `filters` is a new object every time it's
    edited, so identity is the signal: a stored result is only shown while it
    still belongs to the filters on screen, which makes "loading" something we
    derive rather than a flag to reset, and drops a slow reply that a newer
    search has overtaken.
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
            <FilterBar
              count={activeFilterCount(filters)}
              chips={activeFilterChips(filters)}
              onOpen={() => setSheetOpen((v) => !v)}
              onClear={(key) => clearFilter(key as keyof MatchFilters)}
              onClearAll={() => setFilters(NO_FILTERS)}
              total={browse?.length ?? null}
              noun="person"
              plural="people"
              open={sheetOpen}
            />
            {sheetOpen && (
              <FiltersSheet
                /* Re-seeds the sheet's draft if the applied filters change while
                   it is open — clearing a chip on the bar above, for instance. */
                key={JSON.stringify(filters)}
                value={filters}
                onApply={setFilters}
                onClose={() => setSheetOpen(false)}
                myConcentration={myConcentration}
                myInterests={myInterests}
              />
            )}
          </div>
          {/* Said out loud while the first-month default is on, so a narrowed
              list never reads as "this is everyone". */}
          {chosen === null && isNewFirstYear && (
            <p className="px-4 pb-2 text-[11px] text-muted">
              Showing your class year first while you&apos;re new. Tap the chip to see everyone.
            </p>
          )}
          {browseErr && <Status>Couldn’t load matches: {browseErr}</Status>}
          {!browseErr && browse === null && <Status>Finding your matches…</Status>}
          {!browseErr && browse && browse.length === 0 && (
            <Status>
              {activeFilterCount(filters) > 0
                ? "Nobody matches those filters yet. Try clearing one."
                : "Nobody else at your school has finished signing up yet. Everyone who does shows up here."}
              {/* An empty Match tab has exactly one fix, and this is it. */}
              {activeFilterCount(filters) === 0 && (
                <div className="mx-auto mt-4 max-w-xs">
                  <ShareInviteButton variant="primary" size="lg" full label="Invite a housemate" />
                </div>
              )}
            </Status>
          )}
          {!browseErr && browse && browse.length > 0 && (
            /* The count lives on the filter bar, beside the control that changes it. */
            <MatchGrid matches={browse} max={100} onView={viewProfile} />
          )}
        </>
      )}

      {/*
        SESSIONS — the board is the whole tab. One list per screen: the timed
        search is a link, and opens as its own sheet with its results inside.
      */}
      {tab === "sessions" && (
        <>
          <div className="flex items-center justify-end px-3 pb-1">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="tap44 flex items-center gap-1.5 rounded-full px-2 py-1 text-[12px] font-medium text-primary"
            >
              <IconSearch size={13} />
              Search by time
            </button>
          </div>
          <BuddyBoard initialGym={presetGym} />
        </>
      )}

      {searchOpen && userId && (
        <SessionSearchSheet
          userId={userId}
          filters={filters}
          onChangeFilters={setFilters}
          myConcentration={myConcentration}
          myInterests={myInterests}
          onView={viewProfile}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </div>
  );
}

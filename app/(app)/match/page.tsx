"use client";

/*
  MATCH TAB. Two sub-tabs (mirrors the mockup):
  - Browse: all compatible partners, scored out of 100, best first.
  - Session Search: pick WHAT (activity) + WHEN (day + hour) — all required —
    then optionally narrow with gym / level / gender in a filter sheet. Results
    are people doing that activity who are free within ~2h of your hour.

  Data comes from the SQL RPC functions via lib/supabase/matching.ts. All colors
  are theme tokens; the choice lists reuse the onboarding data so they stay
  data-driven.
*/
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import {
  getBrowseMatches,
  getSessionMatches,
  type Match,
} from "@/lib/supabase/matching";
import {
  weekDays,
  experienceLevels,
  verifiedGyms,
  primaryActivities,
  sessionTimeSlots,
  sessionTimeLabel,
  SESSION_WINDOW_HOURS,
} from "@/lib/onboarding";
import MatchCard from "@/components/match/MatchCard";
import BuddyBoard from "@/components/match/BuddyBoard";
import { Pill, FieldLabel } from "@/components/onboarding/controls";

type SubTab = "browse" | "session" | "buddy";

const subTabs: { key: SubTab; label: string; heading: string }[] = [
  { key: "browse", label: "Browse", heading: "BROWSE" },
  { key: "session", label: "Session", heading: "SESSION SEARCH" },
  { key: "buddy", label: "Buddy Board", heading: "BUDDY BOARD" },
];

const genderOptions: { key: string; label: string }[] = [
  { key: "male", label: "Men" },
  { key: "female", label: "Women" },
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
  return (
    <div className="grid grid-cols-2 gap-2 px-3 pb-4">
      {matches.map((m) => (
        <MatchCard key={m.userId} match={m} max={max} onView={(x) => onView(x, max)} />
      ))}
    </div>
  );
}

function Status({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-16 text-center text-sm text-muted">{children}</div>;
}

// A square tick-box used in the optional-filters sheet. Ticking it reveals that
// filter's options; unticking clears the choice.
function CheckSquare({ checked }: { checked: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[5px] border text-[11px] font-bold ${
        checked
          ? "border-primary bg-primary text-primary-contrast"
          : "border-border bg-surface-2 text-transparent"
      }`}
    >
      ✓
    </span>
  );
}

// One collapsible filter row inside the sheet: a tick-box + title, and when
// ticked, the tappable options. Choosing one sets the value; unticking clears it.
function FilterRow({
  title,
  open,
  onToggle,
  options,
  value,
  onPick,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  options: { key: string; label: string }[];
  value: string | null;
  onPick: (key: string) => void;
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
        {value && !open && (
          <span className="ml-auto text-xs text-muted">
            {options.find((o) => o.key === value)?.label}
          </span>
        )}
      </button>
      {open && (
        <div className="mt-2.5 flex flex-wrap gap-1.5 pl-[30px]">
          {options.map((o) => (
            <Pill
              key={o.key}
              label={o.label}
              selected={value === o.key}
              onClick={() => onPick(o.key)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MatchPage() {
  const { userId } = useAppState();
  const router = useRouter();
  const [tab, setTab] = useState<SubTab>("browse");

  // Open another person's profile, passing the exact compatibility % shown on
  // their card so the profile badge stays truthful.
  const viewProfile = (m: Match, max: number) => {
    const pct = Math.round((m.score / max) * 100);
    router.push(`/people/${m.userId}?pct=${pct}`);
  };

  // --- Browse state ---
  const [browse, setBrowse] = useState<Match[] | null>(null);
  const [browseErr, setBrowseErr] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    getBrowseMatches(userId)
      .then((rows) => active && setBrowse(rows))
      .catch((e) => active && setBrowseErr(e.message));
    return () => {
      active = false;
    };
  }, [userId]);

  // --- Session-search REQUIRED state ---
  const [activity, setActivity] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [hour, setHour] = useState<number | null>(null);

  // --- Session-search OPTIONAL filters (in the sheet) ---
  const [sheetOpen, setSheetOpen] = useState(false);
  const [gym, setGym] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  // Which filter rows are ticked open. A row open with no pick yet = no filter.
  const [openRows, setOpenRows] = useState<Set<string>>(new Set());

  const toggleRow = (
    key: string,
    clear: () => void,
  ) => {
    setOpenRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        clear(); // unticking a filter clears its choice
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const activeFilters = [
    gym && { key: "gym", label: gym, clear: () => setGym(null) },
    level && {
      key: "level",
      label: experienceLevels.find((l) => l.key === level)?.name ?? level,
      clear: () => setLevel(null),
    },
    gender && {
      key: "gender",
      label: genderOptions.find((g) => g.key === gender)?.label ?? gender,
      clear: () => setGender(null),
    },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  const clearFilter = (key: string) => {
    const f = activeFilters.find((x) => x.key === key);
    f?.clear();
    setOpenRows((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

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
        gym,
        level,
        gender,
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
        <span className="text-[10px] tracking-[0.06em] text-muted">
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
              onClick={() => setTab(s.key)}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                tab === s.key ? "bg-primary text-primary-contrast" : "bg-surface-2 text-muted"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* BROWSE */}
      {tab === "browse" && (
        <>
          {browseErr && <Status>Couldn’t load matches: {browseErr}</Status>}
          {!browseErr && browse === null && <Status>Finding your matches…</Status>}
          {!browseErr && browse && browse.length === 0 && (
            <Status>
              No matches yet. As more people finish onboarding, they’ll show up here.
            </Status>
          )}
          {!browseErr && browse && browse.length > 0 && (
            <>
              <div className="px-3 pb-1.5 text-[10px] tracking-[0.06em] text-muted">
                {browse.length} {browse.length === 1 ? "PERSON" : "PEOPLE"} · SORTED BY COMPATIBILITY
              </div>
              <Grid matches={browse} max={100} onView={viewProfile} />
            </>
          )}
        </>
      )}

      {/* SESSION SEARCH */}
      {tab === "session" && (
        <div className="px-3 pb-4">
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-3.5">
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
              <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-1">
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

            {/* OPTIONAL filters: button + active chips */}
            <div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSheetOpen(true)}
                  className="rounded-full border border-border bg-surface px-3.5 py-2 text-[13px] text-text"
                >
                  Filters{activeFilters.length > 0 ? ` · ${activeFilters.length}` : ""}
                </button>
                <span className="text-[11px] text-muted">Optional</span>
              </div>
              {activeFilters.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {activeFilters.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => clearFilter(f.key)}
                      className="flex items-center gap-1 rounded-full border border-primary bg-primary/15 px-3 py-1.5 text-[12px] text-primary"
                    >
                      {f.label}
                      <span className="text-[13px] leading-none">×</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={runSearch}
              disabled={!canSearch || searching}
              className="rounded-xl bg-primary py-3 text-center text-[13px] font-medium text-primary-contrast disabled:opacity-40"
            >
              {searching ? "Searching…" : "Search"}
            </button>
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
              <div className="pb-1.5 text-[10px] tracking-[0.06em] text-muted">
                {results.length} {results.length === 1 ? "PERSON" : "PEOPLE"} AVAILABLE
              </div>
              {results.length === 0 ? (
                <Status>No one matches those filters yet. Try a different time.</Status>
              ) : (
                <Grid matches={results} max={92} onView={viewProfile} />
              )}
            </div>
          )}
        </div>
      )}

      {/* BUDDY BOARD */}
      {tab === "buddy" && <BuddyBoard />}

      {/* OPTIONAL-FILTERS SHEET */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="w-full max-w-screen-sm rounded-t-2xl border-t border-border bg-surface p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-sm font-medium text-text">Filters</h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="text-[13px] font-medium text-primary"
              >
                Done
              </button>
            </div>
            <p className="mb-1 text-[11px] text-muted">
              Tick a filter to narrow results. Leave all unticked to see everyone.
            </p>

            <FilterRow
              title="Gym"
              open={openRows.has("gym")}
              onToggle={() => toggleRow("gym", () => setGym(null))}
              options={verifiedGyms.map((g) => ({ key: g, label: g }))}
              value={gym}
              onPick={setGym}
            />
            <FilterRow
              title="Level"
              open={openRows.has("level")}
              onToggle={() => toggleRow("level", () => setLevel(null))}
              options={experienceLevels.map((l) => ({ key: l.key, label: l.name }))}
              value={level}
              onPick={setLevel}
            />
            <FilterRow
              title="Gender"
              open={openRows.has("gender")}
              onToggle={() => toggleRow("gender", () => setGender(null))}
              options={genderOptions}
              value={gender}
              onPick={setGender}
            />
          </div>
        </div>
      )}
    </div>
  );
}

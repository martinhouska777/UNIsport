"use client";

/*
  MATCH TAB. Two sub-tabs (mirrors the mockup):
  - Browse: all compatible partners, scored out of 100, best first.
  - Session Search: pick a gym + day + time block (+ optional level/gender),
    get logistics-first matches scored out of 92.

  Data comes from the SQL RPC functions via lib/supabase/matching.ts. All colors
  are theme tokens; the filter pills reuse the onboarding option lists so the
  choices stay data-driven.
*/
import { useEffect, useState } from "react";
import { useAppState } from "@/components/AppState";
import {
  getBrowseMatches,
  getSessionMatches,
  type Match,
} from "@/lib/supabase/matching";
import { weekDays, timeBlocks, experienceLevels, verifiedGyms } from "@/lib/onboarding";
import MatchCard from "@/components/match/MatchCard";
import { Pill, FieldLabel } from "@/components/onboarding/controls";

type SubTab = "browse" | "session";

const genderOptions: { key: string | null; label: string }[] = [
  { key: null, label: "Any" },
  { key: "male", label: "Men" },
  { key: "female", label: "Women" },
];

function Grid({ matches, max }: { matches: Match[]; max: number }) {
  return (
    <div className="grid grid-cols-2 gap-2 px-3 pb-4">
      {matches.map((m) => (
        <MatchCard key={m.userId} match={m} max={max} />
      ))}
    </div>
  );
}

function Status({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-16 text-center text-sm text-muted">{children}</div>;
}

export default function MatchPage() {
  const { userId } = useAppState();
  const [tab, setTab] = useState<SubTab>("browse");

  // --- Browse state ---
  const [browse, setBrowse] = useState<Match[] | null>(null);
  const [browseErr, setBrowseErr] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setBrowse(null);
    setBrowseErr(null);
    getBrowseMatches(userId)
      .then((rows) => active && setBrowse(rows))
      .catch((e) => active && setBrowseErr(e.message));
    return () => {
      active = false;
    };
  }, [userId]);

  // --- Session-search filter state ---
  const [gym, setGym] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [block, setBlock] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [gender, setGender] = useState<string | null>(null);

  const [results, setResults] = useState<Match[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [sessionErr, setSessionErr] = useState<string | null>(null);

  const canSearch = !!gym && !!day && !!block;

  const runSearch = async () => {
    if (!userId || !canSearch) return;
    setSearching(true);
    setSessionErr(null);
    try {
      const rows = await getSessionMatches({
        userId,
        gym: gym!,
        day: day!,
        block: block!,
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
          {tab === "browse" ? "BROWSE" : "SESSION SEARCH"}
        </span>
      </div>

      {/* Sub-tab switch */}
      <div className="px-3 pb-2 pt-2.5">
        <div className="flex overflow-hidden rounded-xl border border-border">
          {(["browse", "session"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                tab === t ? "bg-primary text-primary-contrast" : "bg-surface-2 text-muted"
              }`}
            >
              {t === "browse" ? "Browse" : "Session Search"}
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
              <Grid matches={browse} max={100} />
            </>
          )}
        </>
      )}

      {/* SESSION SEARCH */}
      {tab === "session" && (
        <div className="px-3 pb-4">
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-3.5">
            <div>
              <FieldLabel>Gym</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {verifiedGyms.map((g) => (
                  <Pill key={g} label={g} selected={gym === g} onClick={() => setGym(g)} />
                ))}
              </div>
            </div>

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

            <div>
              <FieldLabel>Time</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {timeBlocks.map((b) => (
                  <Pill key={b} label={b} selected={block === b} onClick={() => setBlock(b)} />
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Level (optional)</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                <Pill label="Any" selected={level === null} onClick={() => setLevel(null)} />
                {experienceLevels.map((l) => (
                  <Pill
                    key={l.key}
                    label={l.name}
                    selected={level === l.key}
                    onClick={() => setLevel(l.key)}
                  />
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Gender (optional)</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {genderOptions.map((g) => (
                  <Pill
                    key={g.label}
                    label={g.label}
                    selected={gender === g.key}
                    onClick={() => setGender(g.key)}
                  />
                ))}
              </div>
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
                Pick a gym, day, and time to search.
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
                <Status>No one matches those filters yet. Try a different slot.</Status>
              ) : (
                <Grid matches={results} max={92} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

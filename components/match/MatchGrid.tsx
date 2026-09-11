"use client";

/*
  THE RESULT GRID — the people, two to a row, for both the People tab and the
  timed session search.

  EVERYBODY IS SHOWN. Candidates below the weakest fit tier used to be dropped,
  so with a handful of accounts the tab could read "No matches yet" while real
  people were signed up. Now the tiered people come first, and everyone else
  follows under "Also on campus" with no fit label — a person you can message
  is never hidden because a score was low.
*/
import type { Match } from "@/lib/supabase/matching";
import { matchTier } from "@/lib/matchTier";
import { reasonRarity } from "@/lib/matchReasons";
import MatchCard from "@/components/match/MatchCard";

export default function MatchGrid({
  matches,
  max,
  onView,
}: {
  matches: Match[];
  /** 100 for browse, 92 for the session search (no schedule component). */
  max: number;
  onView: (m: Match, max: number) => void;
}) {
  const tiered = matches.filter((m) => matchTier(m.score, max) !== null);
  const rest = matches.filter((m) => matchTier(m.score, max) === null);
  /*
    Measured ACROSS the list that is actually on screen, then handed to every
    card, so each one can lead with the fact its neighbours don't have.
  */
  const rarity = reasonRarity(matches);
  const cards = (list: Match[]) =>
    list.map((m) => (
      <MatchCard key={m.userId} match={m} max={max} rarity={rarity} onView={(x) => onView(x, max)} />
    ));
  return (
    <div className="px-3 pb-4">
      {tiered.length > 0 && <div className="grid grid-cols-2 items-start gap-2">{cards(tiered)}</div>}
      {rest.length > 0 && (
        <>
          <div className={`pb-2 ${tiered.length > 0 ? "pt-4" : ""}`}>
            <h2 className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
              {tiered.length > 0 ? "Also on campus" : "On campus"}
            </h2>
            <p className="mt-0.5 text-[11px] text-muted">
              {tiered.length > 0
                ? "Less in common on paper — still real people at your school."
                : "Nobody overlaps with you much on paper yet. They are still real people at your school."}
            </p>
          </div>
          <div className="grid grid-cols-2 items-start gap-2">{cards(rest)}</div>
        </>
      )}
    </div>
  );
}

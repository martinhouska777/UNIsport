"use client";

/*
  THE RESULT GRID — the people on the People tab, two to a row.

  EVERYBODY IS SHOWN, in one grid, best match first (the RPCs return them in
  that order). There used to be a second section, "Also on campus", for people
  with little in common, and a "Strong fit / Good fit / Worth a try" badge on
  each card — both cut (owner, 2026-10-04). The chips on the card already say
  what you share.
*/
import type { Match } from "@/lib/supabase/matching";
import { reasonRarity } from "@/lib/matchReasons";
import MatchCard from "@/components/match/MatchCard";

export default function MatchGrid({
  matches,
  onView,
}: {
  matches: Match[];
  onView: (m: Match) => void;
}) {
  /*
    Measured ACROSS the list that is actually on screen, then handed to every
    card, so each one can lead with the fact its neighbours don't have.
  */
  const rarity = reasonRarity(matches);
  // The very first card is the one the tour lights beside the People tab.
  const first = matches[0]?.userId;
  return (
    <div className="px-3 pb-4">
      <div className="grid grid-cols-2 items-start gap-2">
        {matches.map((m) => (
          <MatchCard
            key={m.userId}
            match={m}
            rarity={rarity}
            onView={onView}
            tour={m.userId === first ? "match-first-card" : undefined}
          />
        ))}
      </div>
    </div>
  );
}

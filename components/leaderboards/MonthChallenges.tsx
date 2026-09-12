"use client";

/*
  THE SPECIAL CHALLENGES — the month's two personal events, on the Events tab.
  ---------------------------------------------------------------------------
  lib/events.ts has carried `monthlyEvents` since the events work landed and
  nothing in the app had ever shown one: the weekly task was on the boards, the
  interhouse race was above the Houses board, and the month in between was
  invisible. This is that month, on the tab the owner asked for.

  TWO, not six. `monthlyEventsNow()` picks the pair (by the month number, so
  they turn over on their own on the 1st) — a challenge you can see the whole
  list of is a menu, and a menu is not a challenge.

  Your counts are the real ones from db/events.sql, over the SAME window the
  event runs for (the 1st onwards). With no database there is nothing honest to
  show, so the section hides itself — the same rule WeekEventLine follows.
  The row is WeekEventLine's `EventLine`, so a weekly and a monthly challenge
  can never drift apart visually. Colours are theme tokens.
*/
import { useEffect, useState } from "react";
import { useAppState } from "@/components/AppState";
import { EventLine } from "@/components/leaderboards/WeekEventLine";
import { monthlyEventsNow, monthStartIso, monthEndsLabel, type EventCounts } from "@/lib/events";
import { fetchMyEventCounts } from "@/lib/supabase/events";

export default function MonthChallenges() {
  const { userId } = useAppState();
  const events = monthlyEventsNow();
  const [counts, setCounts] = useState<EventCounts | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    fetchMyEventCounts(monthStartIso())
      .then((c) => active && setCounts(c))
      .catch(() => active && setCounts(null));
    return () => {
      active = false;
    };
  }, [userId]);

  // undefined = still counting; null = no database → nothing to show honestly.
  if (counts === null) return null;

  return (
    <div className="flex flex-col gap-2">
      {events.map((e) => (
        <EventLine key={e.key} event={e} counts={counts} ends={monthEndsLabel()} />
      ))}
    </div>
  );
}

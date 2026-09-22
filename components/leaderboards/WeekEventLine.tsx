"use client";

/*
  THIS WEEK'S EVENT — one line: "Meet somebody new · 0/1 · ends Sunday".

  lib/events.ts and db/events.sql have defined weekly tasks for a while and
  nothing in the app showed one. This is the one that ships: the single weekly
  event the whole campus is on (chosen by the week number, so it changes on
  Monday on its own), with YOUR real count against it from db/events.sql and
  when it closes. Finishing it pays the bonus points the event names.

  On the Profile tab it sits with the leaderboard line; on the Leaderboards'
  Rankings tab it is the challenge above the board. Same component, so the two
  can never disagree. Hides itself when there is no database to count from.

  The ROW itself is exported as `EventLine`, because the monthly challenges on
  the Events tab are the same thing at a month's scale and should not be a
  second drawing of it (components/leaderboards/MonthChallenges.tsx).
  Colours are theme tokens.
*/
import { useEffect, useState } from "react";
import { useAppState } from "@/components/AppState";
import { IconFlag } from "@/components/icons";
import {
  weeklyEventNow,
  weekStartIso,
  weekEndsLabel,
  eventProgress,
  eventDone,
  bestRoute,
  partTarget,
  type EventCounts,
  type SportEvent,
} from "@/lib/events";
import { fetchMyEventCounts } from "@/lib/supabase/events";

/**
 * One event as a line: what it asks, how far along you are, when it closes.
 * `counts` is undefined while it is still being counted.
 */
export function EventLine({
  event,
  counts,
  ends,
  compact = false,
}: {
  event: SportEvent;
  counts: EventCounts | undefined;
  /** "ends Sunday" / "ends on the 30th" — the window this event closes at. */
  ends: string;
  compact?: boolean;
}) {
  const have = counts ?? {};
  const route = bestRoute(event, have);
  const done = eventDone(event, have);
  const progress = eventProgress(event, have);
  // "0/1" for a one-part event; "2/3 lifts · 1/2 cardio" for a route with several.
  const tally = route
    .map((p) => `${Math.min(have[p.metric] ?? 0, partTarget(event, p))}/${partTarget(event, p)}${route.length > 1 ? ` ${p.unit}` : ""}`)
    .join(" · ");

  return (
    <div
      className={`flex items-center gap-2.5 ${compact ? "border-b border-border px-3.5 py-2.5" : "rounded-2xl border border-border bg-surface px-3.5 py-3"}`}
      title={event.blurb}
    >
      <span
        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${
          done ? "bg-success-tint text-success" : "bg-accent-tint text-accent"
        }`}
      >
        <IconFlag size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5 text-[13px]">
          <span className="truncate font-medium text-text">{event.title}</span>
          <span className="flex-shrink-0 tabular-nums text-muted">
            · {counts === undefined ? "…" : tally} · {done ? `done · +${event.points} pts` : ends}
          </span>
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-sm bg-border">
          <span
            className={`block h-full rounded-sm transition-[width] duration-300 motion-reduce:transition-none ${done ? "bg-success" : "bg-accent"}`}
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        {!compact && <div className="mt-1 text-[11px] text-muted">{event.blurb} Worth +{event.points} pts.</div>}
      </div>
    </div>
  );
}

export default function WeekEventLine({ compact = false }: { compact?: boolean }) {
  const { userId } = useAppState();
  const event = weeklyEventNow();
  const [counts, setCounts] = useState<EventCounts | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    fetchMyEventCounts(weekStartIso())
      .then((c) => active && setCounts(c))
      .catch(() => active && setCounts(null));
    return () => {
      active = false;
    };
  }, [userId]);

  // undefined = still counting; null = no database → nothing to show honestly.
  if (counts === null) return null;

  return <EventLine event={event} counts={counts} ends={weekEndsLabel()} compact={compact} />;
}

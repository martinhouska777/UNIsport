"use client";

/*
  THIS WEEK'S EVENT — one line: "Meet somebody new · 0/1 · ends Sunday".

  lib/events.ts and db/events.sql have defined weekly tasks for a while and
  nothing in the app showed one. This is the one that ships: the single weekly
  event the whole campus is on (chosen by the week number, so it changes on
  Monday on its own), with YOUR real count against it from db/events.sql and
  when it closes. Finishing it pays the bonus points the event names.

  On the Profile tab it sits with the leaderboard line; on Leaderboards it is
  the first thing under the header. Same component, so the two can never
  disagree. Hides itself when there is no database to count from.
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
} from "@/lib/events";
import { fetchMyEventCounts } from "@/lib/supabase/events";

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
      className={`flex items-center gap-2.5 ${compact ? "border-b border-border px-3.5 py-2.5" : "rounded-2xl border border-border bg-surface-2 px-3.5 py-3"}`}
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
            · {counts === undefined ? "…" : tally} · {done ? `done · +${event.points} pts` : weekEndsLabel()}
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

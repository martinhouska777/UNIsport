"use client";

/*
  CHALLENGES — the top half of the Events tab.
  ---------------------------------------------------------------------------
  Two cards, WEEKLY and MONTHLY (owner, 2026-09-15). Every challenge in
  lib/events.ts runs at once now; each card previews the two you are closest
  to finishing, and tapping the card opens all of them in that window, closest
  first (ChallengesScreen below).

  Your counts are the real ones from db/events.sql over the window the
  challenge runs for — this Monday, or the 1st. With no database there is
  nothing honest to show, so the section hides itself.

  The rows are WeekEventLine's `EventLine`, so a challenge looks the same
  wherever it appears. Colours are theme tokens.
*/
import { useEffect, useState } from "react";
import { useAppState } from "@/components/AppState";
import { IconArrowLeft, IconChevronRight } from "@/components/icons";
import { EventLine } from "@/components/leaderboards/WeekEventLine";
import {
  byCloseness,
  eventDone,
  monthEndsLabel,
  monthStartIso,
  monthlyEvents,
  weekEndsLabel,
  weekStartIso,
  weeklyEvents,
  type EventCounts,
  type SportEvent,
} from "@/lib/events";
import { fetchMyEventCounts } from "@/lib/supabase/events";

const PREVIEW = 2;

type WindowKey = "week" | "month";

/* One window's card: its name, how many are done, and the closest two. */
function WindowCard({
  title,
  ends,
  events,
  counts,
  onOpen,
}: {
  title: string;
  ends: string;
  events: SportEvent[];
  counts: EventCounts | undefined;
  onOpen: () => void;
}) {
  const ordered = counts ? byCloseness(events, counts) : events;
  const done = counts ? events.filter((e) => eventDone(e, counts)).length : 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full overflow-hidden rounded-2xl border border-border bg-surface text-left active:bg-surface-2"
    >
      <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-text">{title}</div>
          <div className="text-[11px] text-muted">
            {counts ? `${done} of ${events.length} done` : `${events.length} challenges`} · {ends}
          </div>
        </div>
        <span className="flex flex-shrink-0 items-center gap-0.5 text-[12px] font-medium text-primary">
          See all
          <IconChevronRight size={14} />
        </span>
      </div>
      <div className="[&>*:last-child]:border-b-0">
        {ordered.slice(0, PREVIEW).map((e) => (
          <EventLine key={e.key} event={e} counts={counts} ends={ends} compact />
        ))}
      </div>
    </button>
  );
}

/* Every challenge in one window, closest to done first. A whole screen with a
   back arrow, like the You screen. */
function ChallengesScreen({
  title,
  ends,
  events,
  counts,
  onBack,
}: {
  title: string;
  ends: string;
  events: SportEvent[];
  counts: EventCounts | undefined;
  onBack: () => void;
}) {
  const ordered = counts ? byCloseness(events, counts) : events;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background [animation:backdrop-in_0.2s_ease-out]">
      <div className="flex items-center gap-2.5 border-b border-border bg-surface px-3.5 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="tap44 press-icon flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-2 text-text"
        >
          <IconArrowLeft size={16} />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-base font-medium text-text">{title}</h1>
          <div className="truncate text-[11px] text-muted">{ends}</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3.5 py-4">
        <div className="mx-auto flex w-full max-w-screen-sm flex-col gap-2">
          {ordered.map((e) => (
            <EventLine key={e.key} event={e} counts={counts} ends={ends} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Challenges() {
  const { userId } = useAppState();
  // undefined = still counting; null = no database → nothing to show honestly.
  const [week, setWeek] = useState<EventCounts | null | undefined>(undefined);
  const [month, setMonth] = useState<EventCounts | null | undefined>(undefined);
  const [open, setOpen] = useState<WindowKey | null>(null);

  useEffect(() => {
    let active = true;
    fetchMyEventCounts(weekStartIso())
      .then((c) => active && setWeek(c))
      .catch(() => active && setWeek(null));
    fetchMyEventCounts(monthStartIso())
      .then((c) => active && setMonth(c))
      .catch(() => active && setMonth(null));
    return () => {
      active = false;
    };
  }, [userId]);

  if (week === null && month === null) return null;

  const windows = {
    week: { title: "Weekly", ends: weekEndsLabel(), events: weeklyEvents, counts: week ?? undefined },
    month: { title: "Monthly", ends: monthEndsLabel(), events: monthlyEvents, counts: month ?? undefined },
  };

  return (
    <>
      <div className="flex flex-col gap-2.5">
        <WindowCard {...windows.week} onOpen={() => setOpen("week")} />
        <WindowCard {...windows.month} onOpen={() => setOpen("month")} />
      </div>
      {open && <ChallengesScreen {...windows[open]} onBack={() => setOpen(null)} />}
    </>
  );
}

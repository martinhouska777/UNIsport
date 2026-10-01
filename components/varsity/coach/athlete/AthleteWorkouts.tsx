"use client";

/*
  COACH → ONE ATHLETE → PAST WORKOUTS. Their erg and their water sessions,
  newest first, the way they were written.
  ---------------------------------------------------------------------------
  The calendar answers "which days", the statistics answer "how much"; this
  answers the one a coach actually asks out loud — what has this rower been
  doing? (owner, 2026-09-19). One day at a time, with its date, and every
  session in it.

  ERG OR WATER, AND THE WAY THE ROWER SEES IT (owner, 2026-10-01: "just the
  workouts on erg he has and how he sees it… so they can look at his erg or
  water performance"). A switch picks the erg or the water — weights, runs and
  the rest are on the Calendar — and a tap opens the session on the very
  screen the rower opens off their own Calendar (WorkoutDetail): the split as
  the headline, the monitor's numbers, and Compare with their other sessions
  of the same kind.

  Read-only. A session belongs to the athlete who logged it; the coach gets to
  look, and there is no policy in the database that would let them do more
  (db/varsity_coach_reads.sql).

  Colours are theme tokens; the per-session dot comes from LogRow.
*/
import { useEffect, useMemo, useState } from "react";
import LogRow from "@/components/varsity/coach/athlete/LogRow";
import Segmented from "@/components/ui/Segmented";
import WorkoutDetail from "@/components/varsity/calendar/WorkoutDetail";
import { logCategoryColor } from "@/lib/varsity/athleteProfile";
import ExampleTag from "@/components/varsity/ExampleTag";
import { fetchLogsInRange, type LogEntry } from "@/lib/varsity/logStore";

/* How far back the list reaches. A season, which is as long as anybody has
   been on this squad — and further back than any coach scrolls in one sitting. */
const DAYS_BACK = 365;

const SIDES = [
  { key: "erg" as const, label: "Erg" },
  { key: "water" as const, label: "Water" },
];
type Side = (typeof SIDES)[number]["key"];

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/* "Fri 19 Sep" — and the year only when it is not this one, because a list a
   season long crosses New Year and "3 Jan" alone would be the wrong winter. */
function dayLabel(iso: string, thisYear: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${WD[date.getDay()]} ${d} ${MO[m - 1]}${y === thisYear ? "" : ` ${y}`}`;
}

export default function AthleteWorkouts({
  athleteId,
  /* The worked example the calendar falls back to when a rower has never
     logged anything, so this screen can be looked at before a squad trains. */
  demo,
}: {
  athleteId: string;
  demo?: LogEntry[];
}) {
  const now = useMemo(() => new Date(), []);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [side, setSide] = useState<Side>("erg");
  /* The session opened full screen, as the rower sees it. */
  const [open, setOpen] = useState<LogEntry | null>(null);

  useEffect(() => {
    let active = true;
    const from = toIso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - DAYS_BACK));
    fetchLogsInRange(athleteId, from, toIso(now))
      .then((rows) => {
        if (!active) return;
        setLogs(rows);
        setLoaded(true);
      })
      /* A refused or broken read must still end the wait — a screen stuck on
         "Reading…" tells a coach nothing at all. */
      .catch(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [athleteId, now]);

  /* The example only while they have logged nothing, and tagged as one. */
  const example = logs.length === 0 && !!demo?.length;
  const shown = useMemo(
    () => (example ? demo! : logs).filter((l) => l.category === side),
    [example, demo, logs, side],
  );

  /* Newest day first, and inside a day the order they were logged in — which is
     the order they were done in, morning before afternoon. */
  const days = useMemo(() => {
    const by = new Map<string, LogEntry[]>();
    for (const l of shown) {
      if (!by.has(l.logDate)) by.set(l.logDate, []);
      by.get(l.logDate)!.push(l);
    }
    return [...by.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [shown]);

  if (!loaded) {
    return <p className="py-12 text-center text-[13px] text-muted">Reading their training…</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Segmented options={SIDES} value={side} onChange={setSide} ariaLabel="Erg or water" />
        {example && <ExampleTag />}
      </div>
      {days.length === 0 && (
        <p className="px-6 py-12 text-center text-[13px] leading-relaxed text-muted">
          No {side === "erg" ? "erg" : "water"} sessions logged yet.
        </p>
      )}
      {days.map(([iso, entries]) => (
        <div key={iso}>
          <div className="pb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            {dayLabel(iso, now.getFullYear())}
          </div>
          <div className="flex flex-col gap-2">
            {entries.map((l) => (
              <LogRow key={l.id} log={l} onOpen={() => setOpen(l)} />
            ))}
          </div>
        </div>
      ))}

      {open && (
        <WorkoutDetail
          key={open.id}
          log={open}
          /* Compare reads THIS rower's sessions of the same kind; the worked
             example has none of its own to read. */
          userId={example ? null : athleteId}
          colorOf={(l) => logCategoryColor[l.category ?? "other"] ?? "var(--muted)"}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

"use client";

/*
  COACH → ONE ATHLETE → PAST WORKOUTS. Their erg and their water sessions,
  newest first.
  ---------------------------------------------------------------------------
  The calendar answers "which days", the statistics answer "how much"; this
  answers the one a coach actually asks out loud — what has this rower been
  doing? (owner, 2026-09-19).

  ERG OR WATER, AND THE WAY THE ROWER SEES IT (owner, 2026-10-01: "just the
  workouts on erg he has and how he sees it… so they can look at his erg or
  water performance"). A switch picks the erg or the water — weights, runs and
  the rest are on the Calendar — and a tap opens the session on the very
  screen the rower opens off their own Calendar (WorkoutDetail): the split as
  the headline, the monitor's numbers, and Compare with their other sessions
  of the same kind. Rowers only: a cox's page has no Past workouts door
  (AthleteDataScreen).

  DRAWN LIKE THE WORKOUTS TAB (same day: "make it consistent with the other
  things we did"): the same full-width ERG | WATER box, and one row per
  session the way that tab draws one (LogRow) — the day on the row, not as a
  heading above it. The dot is the calendar's colour for the session: the
  plan's intensity when the coach planned it (UT2 green, UT1 yellow, hard
  red), else the kind of session.

  Read-only. A session belongs to the athlete who logged it; the coach gets to
  look, and there is no policy in the database that would let them do more
  (db/varsity_coach_reads.sql).

  Colours are theme tokens; the dot is a content colour from data (rule-1
  exception).
*/
import { useEffect, useMemo, useState } from "react";
import LogRow from "@/components/varsity/coach/athlete/LogRow";
import WorkoutDetail from "@/components/varsity/calendar/WorkoutDetail";
import ExampleTag from "@/components/varsity/ExampleTag";
import { fetchLogsInRange, type LogEntry } from "@/lib/varsity/logStore";
import { fetchPlan } from "@/lib/varsity/planStore";
import { kindOf } from "@/lib/varsity/athleteHome";
import { kindColor } from "@/lib/varsity/home";
import { logCategoryColor } from "@/lib/varsity/athleteProfile";
import type { SessionMap } from "@/lib/varsity/coachPlan";

/* How far back the list reaches. A season, which is as long as anybody has
   been on this squad — and further back than any coach scrolls in one sitting. */
const DAYS_BACK = 365;

const SIDES = ["erg", "water"] as const;
type Side = (typeof SIDES)[number];

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
  const [plan, setPlan] = useState<SessionMap>({});
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
    /* The plan, for the dots' colours only — without it they fall back to
       the kind of session, so a failed read costs nothing else. */
    fetchPlan()
      .then((p) => active && setPlan(p.sessions))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [athleteId, now]);

  /* The example only while they have logged nothing, and tagged as one. */
  const example = logs.length === 0 && !!demo?.length;
  /* Newest first, and inside a day the order they were logged in — which is
     the order they were done in, morning before afternoon. */
  const shown = useMemo(
    () =>
      (example ? demo! : logs)
        .filter((l) => l.category === side)
        .map((l, i) => ({ l, i }))
        .sort((a, b) => b.l.logDate.localeCompare(a.l.logDate) || a.i - b.i)
        .map(({ l }) => l),
    [example, demo, logs, side],
  );

  /* The calendar's rule (CalendarScreen → logColor), so a session is the same
     colour here, on the rower's calendar and on the Workouts tab. */
  const colorOf = (l: LogEntry) => {
    const planned = l.dayKey ? plan[l.dayKey] : undefined;
    return planned ? kindColor[kindOf(planned)] : (logCategoryColor[l.category ?? "other"] ?? "var(--muted)");
  };

  if (!loaded) {
    return <p className="py-12 text-center text-[13px] text-muted">Reading their training…</p>;
  }
  return (
    <div>
      {/* ERG | WATER — the Workouts tab's own full-width switch. */}
      <div className="mb-3 flex overflow-hidden rounded-xl border border-border bg-surface">
        {SIDES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSide(t)}
            aria-pressed={side === t}
            className={`flex-1 py-2.5 text-[12px] font-semibold capitalize transition-colors ${
              side === t ? "bg-text text-background" : "text-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {example && (
        <div className="mb-3">
          <ExampleTag />
        </div>
      )}
      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-8 text-center text-[12px] text-muted">
          {side === "erg" ? "No erg sessions logged yet." : "No water sessions logged yet."}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {shown.map((l) => (
            <LogRow
              key={l.id}
              log={l}
              day={dayLabel(l.logDate, now.getFullYear())}
              color={colorOf(l)}
              onOpen={() => setOpen(l)}
            />
          ))}
        </div>
      )}

      {open && (
        <WorkoutDetail
          key={open.id}
          log={open}
          /* Compare reads THIS rower's sessions of the same kind; the worked
             example has none of its own to read. */
          userId={example ? null : athleteId}
          colorOf={colorOf}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

"use client";

/*
  Varsity CALENDAR tab — your training history, day by day.
  ---------------------------------------------------------------------------
  A full month grid built from the athlete's OWN logged sessions
  (lib/varsity/logStore), in the same wall-calendar language as the plan's
  month view on Home — the coach's workout TEXT inside each day, not a dot.
  Tap a day for the whole thing; tap a legend colour for that kind of
  training's month.

  IT IS A WALL CALENDAR, so it behaves like one:

    1. THE MONTH FILLS THE SCREEN. Every row is the same height and the rows
       share whatever is left between the header and the legend, so the grid
       ends where the screen ends. (It used to size each row to its busiest
       day, which made a quiet week a thin strip and a heavy one a slab — the
       owner asked for a calendar that looks like a calendar.)
    2. EVERY DAY IS A BOX, trained or not. An empty Tuesday is the same
       rectangle as a Monday with two sessions; it just has empty space in it.
       That is what makes the grid read as a month rather than as a list of the
       days something happened.
    3. A SESSION TAKES HALF A DAY. The box is split in two, so one session
       fills the top half and leaves the bottom empty rather than stretching to
       swallow the whole day. Two sessions take a half each.
    4. EVERY SESSION SAYS WHICH KIND IT WAS — the colour is the intensity, so
       water and erg are the same green and only the word tells them apart.
       The figures stay in the day sheet: a column is about 33px of text wide.
    6. A DAY CAN BE OUT. Sick, injured, away or missed-for-another-reason
       (lib/varsity/daysOut.ts): the whole day painted in that reason's own
       colour, with its name in the middle. Only a day with nothing
       done on it can be marked: tap it, tap Missed, and it asks why (Sick,
       Injured, Away, Other) with a short note.
    5. NO PAGE HEADER. The month is the title, and the colour key sits
       directly under it — you need to know what the colours mean BEFORE you
       read the grid, not after scrolling past it. The month's totals used to
       hold that row; they were the same numbers the per-kind buttons under
       the grid already give you, one kind at a time and tappable.

  A TEAMMATE'S CALENDAR is this same screen (`teammate` prop, owner
  2026-09-14): opened from their card on the Team tab, in a window of its own.
  It is read-only — no Missed, no "Open the log", no opening a session — and
  its month comes from lib/varsity/teamTraining (demo data until accounts link
  to roster seats) instead of your own logs.

  The session blocks borrow the plan's own palette (`kindColor` in
  lib/varsity/home) rather than declaring one of their own, so a practice is the
  same colour here as on the coach's month view.
*/
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Sheet from "@/components/varsity/Sheet";
import WorkoutDetail from "@/components/varsity/calendar/WorkoutDetail";
import CategoryStatsSheet from "@/components/varsity/calendar/CategoryStatsSheet";
import { useAppState } from "@/components/AppState";
import { useUnits } from "@/components/useUnits";
import { fetchLogsInRange, type LogEntry } from "@/lib/varsity/logStore";
import { teamMonthLogs } from "@/lib/varsity/teamTraining";
import { fetchPlan } from "@/lib/varsity/planStore";
import { kindOf } from "@/lib/varsity/athleteHome";
import { kindBar, kindBlock, kindColor, kindLegend } from "@/lib/varsity/home";
import { formatMetrics } from "@/lib/varsity/logParse";
import {
  logLabel,
  logLabelParts,
  sessionPieces,
  toISO,
  type Session,
  type SessionMap,
} from "@/lib/varsity/coachPlan";
import {
  logCategoryColor,
  logCategoryLabel,
  logVolumeLabel,
  legendCategories,
} from "@/lib/varsity/athleteProfile";
import { IconArrowLeft, IconArrowRight, IconChevronRight, IconX } from "@/components/icons";
import { fetchDaysOut, saveDaysOut } from "@/lib/varsity/athleteProfile";
import {
  dayOutFill,
  dayOutName,
  dayOutReasons,
  reasonMeta,
  type DayOut,
  type DayOutReason,
  type DaysOut,
} from "@/lib/varsity/daysOut";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["M", "T", "W", "T", "F", "S", "S"];

/*
  ONE COLOUR PER SESSION, on all three screens.

  The month grid painted a session with the PLAN's palette (an erg UT1 is
  yellow) and then the day list and the opened workout painted the same session
  with the LOG's category palette (an erg is blue) — so tapping a yellow block
  opened a blue one, and the two vocabularies sat on top of each other. The
  owner's note: "erg UT1 should be yellow — when I click it, it has different
  colours".

  So: a session the coach prescribed is coloured by WHAT THE COACH PRESCRIBED,
  wherever it appears. A session logged outside the plan has no intensity to
  read and keeps the category colour — the grid leaves those blocks neutral
  rather than guessing (see blockStyle), but a dot has to be something, and the
  category is the only honest thing it can be.
*/
const logColor = (l: LogEntry, planned: Session | undefined) =>
  planned
    ? kindColor[kindOf(planned)]
    : (logCategoryColor[l.category ?? "other"] ?? "var(--muted)");

/*
  THE BLOCK IN A GRID CELL — the same colour as above, as a 28% tint.

  Water and erg are NOT told apart by it (the plan doesn't either — a UT2
  outing and a UT2 erg are both green); each block prints which it was, and the
  per-kind buttons under the grid are what the month's statistics hang off.

  Outside the plan there is no intensity to read: weights, flex and off still
  land on the right colour from their category alone, and anything else stays
  neutral rather than being coloured with a guess.
*/
const NEUTRAL_BLOCK = { background: "#94a3b8", color: "#0b0e11" };

function blockStyle(l: LogEntry, planned: Session | undefined) {
  if (planned) return kindBlock(kindOf(planned));
  switch (l.category) {
    case "weights":
      return kindBlock("weights");
    case "flex":
      return kindBlock("flex");
    case "off":
      return kindBlock("off");
    default:
      return NEUTRAL_BLOCK;
  }
}

/*
  THE KEY FOR THIS CALENDAR — the plan's key without Race. Nobody logs a
  "race": you log the piece you rowed (a 2k) and write "race" on it, so no
  block in this calendar is ever blue and the key does not spend a slot on it.
*/
const calendarLegend = kindLegend.filter((l) => l.kind !== "race");

type CalDay = { num: number; iso: string; logs: LogEntry[]; today: boolean; future: boolean };

/*
  THE DAY OUT, in the day sheet (lib/varsity/daysOut.ts).

  A day already marked says so — the reason, the note — with a way to clear it.
  Otherwise there is ONE button, MISSED, and only on a day that has happened
  with nothing logged; it opens the reasons (Sick, Injured, Away, Other) with a
  line for why. The one-tap Sick / Away buttons were cut: they also showed on
  days with training on them, which is not a day out.
*/
function DayOutSection({
  value,
  canMiss,
  onSave,
}: {
  value: DayOut | undefined;
  /** A past (or today's) day with no training on it. */
  canMiss: boolean;
  onSave: (v: DayOut | null) => void;
}) {
  const [missing, setMissing] = useState(false);
  const [reason, setReason] = useState<DayOutReason>("sick");
  const [note, setNote] = useState("");

  if (value) {
    const meta = reasonMeta(value.reason);
    return (
      <div className="mt-3 flex items-start gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3">
        <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: meta.color }} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-text">{dayOutName(value.reason)}</div>
          {value.note && <div className="mt-0.5 text-[12px] leading-relaxed text-text-2">{value.note}</div>}
        </div>
        <button
          type="button"
          onClick={() => onSave(null)}
          aria-label="Clear this day"
          className="tap44 press-icon flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-surface text-muted"
        >
          <IconX size={13} />
        </button>
      </div>
    );
  }

  if (missing) {
    return (
      <div className="mt-3 rounded-2xl border border-border bg-surface px-3.5 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Missed — why?</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {dayOutReasons.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setReason(r.key)}
              aria-pressed={reason === r.key}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium ${
                reason === r.key ? "border-primary bg-primary-tint text-text" : "border-border bg-surface text-muted"
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />
              {r.label}
            </button>
          ))}
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={120}
          placeholder="Why? (optional)"
          aria-label="Why you missed it"
          // 16px so a phone doesn't zoom in on focus.
          className="mt-2.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-base text-text outline-none placeholder:text-muted focus:border-primary"
        />
        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            onClick={() => setMissing(false)}
            className="flex-1 rounded-xl border border-border bg-surface py-2.5 text-[12px] font-medium text-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave({ reason, ...(note.trim() ? { note: note.trim() } : {}) })}
            className="flex-1 rounded-xl bg-primary-live py-2.5 text-[12px] font-semibold text-primary-contrast"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  // Only a day you did nothing on can be missed — a day with training, or one
  // still to come, gets no button at all (owner, 2026-09-13).
  if (!canMiss) return null;
  return (
    <button
      type="button"
      onClick={() => setMissing(true)}
      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-surface py-2.5 text-[12px] font-medium text-text active:bg-surface-2"
    >
      Missed
    </button>
  );
}

function DaySheet({
  label,
  logs,
  planSessions,
  dayOut,
  canMiss,
  onDayOut,
  onClose,
  onOpen,
  readOnly = false,
}: {
  label: string;
  logs: LogEntry[];
  /** The published plan, keyed by slot — the dots read their colour off it. */
  planSessions: Record<string, Session>;
  dayOut: DayOut | undefined;
  canMiss: boolean;
  onDayOut: (v: DayOut | null) => void;
  onClose: () => void;
  onOpen: (log: LogEntry) => void;
  /** A teammate's day: what they did, and nothing to press. */
  readOnly?: boolean;
}) {
  const Row = readOnly ? "div" : "button";
  return (
    <Sheet title={label} onClose={onClose}>
      {logs.length === 0 ? (
        dayOut ? null : (
          <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-6 text-center text-[12px] text-muted">
            Nothing logged this day.
          </div>
        )
      ) : (
        <div className="flex flex-col gap-2">
          {logs.map((l) => {
            const metrics = formatMetrics(l.minutes, l.metres, l.split);
            const planned = l.dayKey ? planSessions[l.dayKey] : undefined;
            /* The same name the month grid uses, so one session is called one
               thing on both screens. What it actually WAS — the coach's
               "14k UT2", or whatever the athlete called their own — goes on
               the line under it, and only when it says something the name
               doesn't already. */
            const name = logLabel(l, planned);
            const said = l.title.trim() && l.title.trim() !== name ? l.title.trim() : "";
            return (
              <Row
                key={l.id}
                {...(readOnly ? {} : { type: "button" as const, onClick: () => onOpen(l) })}
                className={`flex items-start gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3 text-left ${readOnly ? "" : "active:bg-surface-2"}`}
              >
                <span
                  className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ background: logColor(l, planned) }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-text">{name}</div>
                  {said && <div className="mt-0.5 truncate text-[12px] text-text-2">{said}</div>}
                  {metrics && <div className="mt-0.5 text-[12px] text-text-2">{metrics}</div>}
                  {l.note && <div className="mt-0.5 truncate text-[11px] text-muted">{l.note}</div>}
                </div>
                {l.source === "plan" && (
                  <span className="flex-shrink-0 rounded-md border border-border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                    Plan
                  </span>
                )}
                {!readOnly && <IconChevronRight size={15} className="mt-0.5 flex-shrink-0 text-muted" />}
              </Row>
            );
          })}
        </div>
      )}
      {!readOnly && (
        <>
          <DayOutSection value={dayOut} canMiss={canMiss} onSave={onDayOut} />
          <Link
            href="/varsity/log"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-[12px] font-medium text-text"
          >
            Open the log
            <IconChevronRight size={14} />
          </Link>
        </>
      )}
    </Sheet>
  );
}

export default function CalendarScreen({
  teammate,
}: {
  /*
    Someone else's calendar, read-only. Omit for your own.

    `real` decides WHERE their month comes from, and the two callers want
    different things. A rower opening a team-mate's calendar from the Team tab
    gets lib/varsity/teamTraining — invented, because accounts are not linked to
    roster seats yet and a squad-mate's real log is not theirs to read. A COACH
    opening one of their own athletes (the Calendar card on that rower's page in
    the console) gets the real thing out of the database, which is the whole
    point of the coach read policy (db/varsity_coach_reads.sql).
  */
  teammate?: { id: string; real?: boolean };
} = {}) {
  const { userId } = useAppState();
  const teammateId = teammate?.id ?? null;
  const teammateReal = !!teammate?.real;
  const now = useMemo(() => new Date(), []);
  const todayIso = toISO(now);

  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [picked, setPicked] = useState<{ iso: string; label: string } | null>(null);
  const [openLog, setOpenLog] = useState<LogEntry | null>(null); // full-screen detail
  const [statsFor, setStatsFor] = useState<string | null>(null); // legend → stats sheet
  // The coach's sessions, only so a logged one can borrow its colour. Loaded
  // once — the plan is shared and does not change while you scroll months.
  const [planSessions, setPlanSessions] = useState<SessionMap>({});
  const { units } = useUnits();
  // Days marked sick / injured / away / missed, keyed by ISO date.
  const [daysOut, setDaysOut] = useState<DaysOut>({});

  useEffect(() => {
    // A teammate's days out are theirs; this screen only shows what they trained.
    if (teammateId) return;
    let active = true;
    fetchDaysOut(userId).then((d) => active && setDaysOut(d));
    return () => {
      active = false;
    };
  }, [userId, teammateId]);

  // Shown at once, saved behind it; the saved map (merged fresh) wins when it lands.
  const markDay = (iso: string, v: DayOut | null) => {
    setDaysOut((prev) => {
      const next = { ...prev };
      if (v) next[iso] = v;
      else delete next[iso];
      return next;
    });
    void saveDaysOut(userId, { [iso]: v }).then(setDaysOut);
  };

  useEffect(() => {
    let active = true;
    fetchPlan().then((p) => {
      if (active) setPlanSessions(p.sessions);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (teammateId && !teammateReal) {
        setLogs(teamMonthLogs(teammateId, view.y, view.m));
        return;
      }
      const whose = teammateId ?? userId;
      if (!whose) {
        setLogs([]);
        return;
      }
      const from = toISO(new Date(view.y, view.m, 1));
      const to = toISO(new Date(view.y, view.m + 1, 0));
      const rows = await fetchLogsInRange(whose, from, to);
      if (active) setLogs(rows);
    })();
    return () => {
      active = false;
    };
  }, [userId, view, teammateId, teammateReal]);

  const logsByDay = useMemo(() => {
    const map: Record<number, LogEntry[]> = {};
    for (const l of logs) {
      const day = Number(l.logDate.split("-")[2]);
      (map[day] ??= []).push(l);
    }
    return map;
  }, [logs]);

  const calendar = useMemo<CalDay[]>(() => {
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    const out: CalDay[] = [];
    for (let n = 1; n <= daysInMonth; n++) {
      const iso = toISO(new Date(view.y, view.m, n));
      out.push({
        num: n,
        iso,
        logs: logsByDay[n] ?? [],
        today: iso === todayIso,
        future: iso > todayIso,
      });
    }
    return out;
  }, [view, logsByDay, todayIso]);

  const leadingEmpty = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // Monday-first
  // The month's session count and metres rowed used to sit under the title.
  // The colour key took that row: those two figures are the same ones the
  // per-kind buttons under the grid already give you, one kind at a time.
  // How many sessions of each kind — shown on the legend so the colours carry a
  // number even before you tap one.
  const monthCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of logs) {
      const c = l.category ?? "other";
      counts[c] = (counts[c] ?? 0) + 1;
    }
    return counts;
  }, [logs]);

  const goMonth = (delta: number) =>
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  const atCurrentMonth = view.y === now.getFullYear() && view.m === now.getMonth();

  /*
    SWIPE THE MONTH — the same gesture as the arrows, and the same rule the
    Profile calendar uses (components/profile/TrainingCalendar): only a
    decisively horizontal drag counts, so scrolling a six-row month up and
    down never changes it. Swiping forward stops at this month, like the arrow.
  */
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0 && atCurrentMonth) return;
    goMonth(dx > 0 ? -1 : 1);
  };

  return (
    /* A full-height column: title, weekday header, THE MONTH, legend. Only the
       month flexes, so the grid always reaches the bottom of the screen. */
    /* The header above the grid is deliberately tight — every pixel it gives
       up is a pixel the month gets, and the month is the screen. */
    <div className="mx-auto flex h-full w-full max-w-screen-sm flex-col px-1.5 pb-3 pt-1.5">
      {/*
        ONE ROW ABOVE THE GRID — the month with its arrows on the left, the
        colour key on the right. The owner's note: as little bar at the top as
        possible, so the month itself gets the room and the workouts fit. It
        was two rows (the month name on its own, then the key with the arrows)
        and 106px stood between the top of the tab and the first week; this
        row and the weekday letters take about half that.

        THE KEY SPREADS over whatever the month leaves (flex-1 +
        justify-between), so the row reads as full on any phone rather than a
        cluster on the right with a gap in the middle.

        The month is "Sep" on a normal phone and "September" from 420px up:
        measured, the full name plus 32px arrows plus the key need ~382px of
        row, and a 390px phone has 370. The day sheet always says the whole
        date.

        No Race in the key (calendarLegend): nobody logs a race, they log the
        2k they rowed and write "race" on it.
      */}
      <div className="flex h-8 flex-shrink-0 items-center gap-2 px-1">
        <div className="flex flex-shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => goMonth(-1)}
            className="tap44 press-icon flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-muted"
          >
            <IconArrowLeft size={14} />
          </button>
          <h1 className="px-0.5 text-[16px] font-semibold leading-none text-text">
            {MONTHS[view.m].slice(0, 3)}
            <span className="hidden min-[420px]:inline">{MONTHS[view.m].slice(3)}</span>{" "}
            <span className="text-[12px] font-medium text-muted">{view.y}</span>
          </h1>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => goMonth(1)}
            disabled={atCurrentMonth}
            className="tap44 press-icon flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-muted disabled:opacity-30"
          >
            <IconArrowRight size={14} />
          </button>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-between gap-x-1.5 pl-1">
          {calendarLegend.map((l) => (
            <span key={l.kind} className="flex flex-shrink-0 items-center gap-[3px] text-[11px] leading-tight text-muted">
              <span className="h-[7px] w-[7px] rounded-full" style={kindBar(l.kind)} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* Weekday header */}
      <div className="mt-1 grid flex-shrink-0 grid-cols-7 gap-1 border-b border-border pb-0.5">
        {DAY_NAMES.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold leading-tight tracking-[0.12em] text-muted">
            {d}
          </div>
        ))}
      </div>

      {/* The month. Every row the same height, sharing what is left of the
          screen — a wall calendar, not a list that grows with the training. */}
      {/* Swiping it left / right is the same as the arrows. */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="mt-1 grid min-h-0 flex-1 auto-rows-fr grid-cols-7 gap-1 overflow-y-auto"
      >
        {Array.from({ length: leadingEmpty }).map((_, i) => (
          <div key={`e${i}`} />
        ))}
        {calendar.map((d) => {
          const has = d.logs.length > 0;
          const label = `${MONTHS[view.m]} ${d.num}, ${view.y}`;
          const out = daysOut[d.iso];
          const outMeta = out ? reasonMeta(out.reason) : null;
          // Only an EMPTY day is painted; an older mark on a trained day keeps a dot.
          const outFill = out && !has ? dayOutFill(out.reason) : null;
          return (
            <button
              key={d.num}
              type="button"
              onClick={() => setPicked({ iso: d.iso, label })}
              /*
                EVERY day of the month is the same box, trained or not — the
                empty ones simply have empty space under their number. A grid
                where only the days you trained had a card read as a scatter of
                cards; this reads as a month.
              */
              /*
                A FLOOR UNDER EVERY CELL, the same 64px the plan's own month
                view uses. Without it the rows only shared whatever height the
                screen had left: a month that needs SIX rows instead of the
                usual five (August 2026 starts on a Saturday) squeezed every
                row a sixth shorter, and the text inside stopped fitting. With
                a floor the grid simply scrolls — the cells stay readable and
                a six-row month looks like the five-row one above it.
              */
              /* overflow-CLIP, not hidden: it still rounds the blocks into the
                 corners, but it is not a scroll container, so the day keeps its
                 automatic minimum size — a cell can never be squeezed shorter
                 than the words inside it (owner, 2026-09-14: "Weights" and
                 "Hard 11.3k" had their bottoms cut off). */
              className={`flex min-h-[64px] flex-col overflow-clip rounded-lg border text-left ${
                d.today
                  ? "border-primary bg-primary-tint"
                  : "border-border bg-surface active:bg-surface-2"
              }`}
            >
              <span
                className={`flex items-center justify-between px-1 pt-1 text-[12px] font-semibold leading-none ${
                  d.today ? "text-primary" : has ? "text-text" : d.future ? "text-muted/40" : "text-muted"
                }`}
              >
                {d.num}
                {/* A DAY OUT — the dot by the date (lib/varsity/daysOut.ts). */}
                {outMeta && has && (
                  <span
                    aria-label={outMeta.label}
                    className="h-[7px] w-[7px] flex-shrink-0 rounded-full"
                    style={{ background: outMeta.color }}
                  />
                )}
              </span>

              {/*
                ONE SESSION TAKES HALF THE DAY, two share it half and half,
                three in thirds. For a few hours on 2026-09-14 one session
                filled the whole body; the owner then asked for a single session
                to take only half again (same day, later), so a day with one
                outing does not look like a day with two. An empty spacer takes
                the other half.
              */}
              {/*
                A DAY OUT, with nothing logged: its colour fills the day (sick
                pink, injured orange, away cyan, missed slate —
                lib/varsity/daysOut.ts) with its name in the middle.

                It fills the BODY of the cell, not the cell — the date keeps
                the same dark strip across the top that every trained day has
                (owner, 2026-09-13). Painting the whole box made a sick day the
                one cell in the month whose number sat on colour, and the grid
                stopped reading as one calendar.
              */}
              {outFill && (
                <span
                  className="mt-0.5 flex min-h-0 flex-1 items-center justify-center rounded-b-[5px] px-0.5"
                  style={{ background: outFill }}
                >
                  <span className="truncate text-[9px] font-semibold text-text">{dayOutName(out!.reason)}</span>
                </span>
              )}
              <span className={`mt-0.5 flex-1 flex-col gap-px ${outFill ? "hidden" : "flex"}`}>
                {has && (
                  <>
                  {d.logs.map((l) => {
                    const planned: Session | undefined = l.dayKey ? planSessions[l.dayKey] : undefined;
                    /*
                      HOW MUCH, not what. The title above already says the type,
                      so this line used to read "Erg" directly under "Erg · UT2"
                      — two of the cell's three lines spent on one word.

                      Now it carries the size of the session: metres for rowing,
                      minutes for everything else (see logVolumeLabel). Still the
                      figure ALONE, because the column is about 33px of text wide
                      and "Water · 16k" truncates to "Wate…", losing the number it
                      was there for. It sits in the BOTTOM-RIGHT of the block,
                      beside the intensity, so the name above it gets the full
                      width and nothing is cut off.
                    */
                    const sub = logVolumeLabel(l.category, l.metres, l.minutes);
                    /* Named the same way every time, and in two pieces: the
                       KIND on the first line with the figure to its right, the
                       INTENSITY under it (lib/varsity/coachPlan →
                       logLabelParts). */
                    const { kind, intensity: word } = logLabelParts(l, planned);
                    /*
                      THE WORK, NOT THE WORD (owner, 2026-09-16) — the same as
                      Home's week strip. The colour already says the intensity:
                      a UT1 or Hard session prints its pieces ("8×500m", "30'
                      r20"), a UT2 just its kilometres (the figure below, so no
                      word at all). A break is allowed after "×" so "4×2000m"
                      goes onto two lines whole instead of being cut mid-number.
                      A piece longer than three short lines doesn't fit a 33px
                      column, so that one keeps the word.
                    */
                    const pieces =
                      word && (planned?.intensity === "UT1" || planned?.intensity === "hard")
                        ? sessionPieces(planned)
                        : "";
                    const intensity =
                      word && planned?.intensity === "UT2" && sub
                        ? null
                        : pieces && pieces.length <= 14
                          ? pieces.replace(/×/g, "×​")
                          : word;
                    return (
                      <span
                        key={l.id}
                        /* px-0.5, not px-1: those four pixels are what let
                           "Water" and "22.5k" share the first line without
                           either one truncating (measured at 390px). */
                        /* flex-[1_0_0%]: an equal share of the day, and NEVER
                           less than its own words (no min-h-0, no overflow) —
                           the day grows instead, and the month scrolls. */
                        className="flex-[1_0_0%] px-0.5 py-0.5"
                        style={blockStyle(l, planned)}
                      >
                        {/* No AM / PM tag — the two letters were eating the
                            line the title needed to fit (owner, 2026-09-14:
                            "cut that text"). */}
                        {/* 9px. It ran at 8px to match the plan's month view;
                            the owner asked for the calendar a size up. 10px
                            was tried and cut "UT2" to "U…" beside a figure
                            on a 360px-wide phone — 9px is the largest size
                            that keeps the whole bottom line.

                            THE KIND GETS THE WHOLE TOP LINE. It used to share
                            it with the figure ("Water" left, "14k" right), and
                            in a column ~33px wide that is what made the longer
                            names give way — the owner's note: put the
                            kilometres bottom-right "so you can see the whole
                            thing". So the name runs the full width of the
                            block, and the figure drops to the line below. */}
                        <span className="block text-[9px] font-medium leading-[1.15] [overflow-wrap:anywhere]">
                          {kind}
                        </span>
                        {/* THE BOTTOM LINE: what it was (UT2 / Hard) on the
                            left, HOW MUCH on the right. One line, because the
                            figure must never be pushed out of a cell this
                            short — the intensity truncates first, the number
                            never does. A session with no intensity leaves the
                            left half empty and the figure still sits in the
                            bottom-right corner, where it is always in the same
                            place from day to day. */}
                        {(intensity || sub) && (
                          /* ALWAYS TWO LINES (owner, 2026-09-16: "make sure all
                             the text fits"): the intensity, then the figure on
                             its own line at the right. It used to share a line
                             when both happened to fit, so "UT2 15 km" sat on
                             one line in one cell and on two in the next. */
                          <span className="mt-px flex flex-col">
                            <span className="min-w-0 text-[9px] leading-[1.15] opacity-80 [overflow-wrap:anywhere]">
                              {intensity}
                            </span>
                            {sub && (
                              <span className="self-end whitespace-nowrap text-[9px] font-medium leading-[1.15] opacity-80">
                                {sub}
                              </span>
                            )}
                          </span>
                        )}
                      </span>
                    );
                  })}
                  {d.logs.length === 1 && <span aria-hidden className="min-h-0 flex-[1_1_0%]" />}
                  </>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* The month by kind of training — the axis the colours no longer carry.
          Each is a button: tap it for that training's sessions, time and
          distance this month. */}
      <div className="mt-2 flex flex-shrink-0 flex-wrap items-center gap-1.5 px-1">
        {legendCategories.map((c) => {
          const count = monthCounts[c] ?? 0;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setStatsFor(c)}
              aria-label={`${logCategoryLabel[c]} statistics for ${MONTHS[view.m]}`}
              className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-muted active:bg-surface-2"
            >
              {logCategoryLabel[c]}
              <span className={count > 0 ? "font-semibold text-text" : "text-muted"}>{count}</span>
            </button>
          );
        })}
      </div>

      {picked && (
        <DaySheet
          key={picked.iso}
          label={picked.label}
          logs={logsByDay[Number(picked.iso.split("-")[2])] ?? []}
          planSessions={planSessions}
          dayOut={daysOut[picked.iso]}
          canMiss={
            picked.iso <= todayIso &&
            !(logsByDay[Number(picked.iso.split("-")[2])] ?? []).some((l) => l.category !== "off")
          }
          onDayOut={(v) => markDay(picked.iso, v)}
          onClose={() => setPicked(null)}
          onOpen={(log) => setOpenLog(log)}
          readOnly={!!teammateId}
        />
      )}

      {statsFor && (
        <CategoryStatsSheet
          category={statsFor}
          monthLabel={`${MONTHS[view.m]} ${view.y}`}
          /* The weeks the month has actually had: all of it in the past, up to
             today in this one — a per-week average must not count days to come. */
          weeks={(atCurrentMonth ? now.getDate() : new Date(view.y, view.m + 1, 0).getDate()) / 7}
          logs={logs}
          units={units}
          onClose={() => setStatsFor(null)}
        />
      )}

      {openLog && (
        <WorkoutDetail
          key={openLog.id}
          log={openLog}
          userId={userId}
          /* The same rule the grid and the day list use, so a session keeps its
             colour all the way in — including a Compare row, which swaps the
             workout on screen without leaving. */
          colorOf={(l) => logColor(l, l.dayKey ? planSessions[l.dayKey] : undefined)}
          onClose={() => setOpenLog(null)}
        />
      )}
    </div>
  );
}

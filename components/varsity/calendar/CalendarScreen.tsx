"use client";

/*
  Varsity CALENDAR tab — one month, plan ahead and log behind.
  ---------------------------------------------------------------------------
  A full month grid from TWO sources: days that have gone show what the athlete
  LOGGED (lib/varsity/logStore); days still to come show what the coach
  PRESCRIBED (the published plan, via lib/varsity/athleteHome). Today is where
  they meet — a logged session is painted solid, a prescribed one not yet done
  is painted faint with its colour round the edge (kindPlanned). Home used to
  carry a second, plan-only month behind a "Month" button; it now points here,
  so there is one calendar and it always answers both "what did I do" and
  "what is coming".

  The coach's workout TEXT sits inside each day, not a dot. Tap a day for the
  whole thing; tap a legend colour for that kind of training's month.

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
    5. NO PAGE HEADER. The month is the title. The month's totals sit next to
       it instead of in a bar at the bottom.

  The session blocks borrow the plan's own palette (`kindColor` in
  lib/varsity/home) rather than declaring one of their own, so a practice is the
  same colour here as on the coach's month view.
*/
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sheet from "@/components/varsity/Sheet";
import WorkoutDetail from "@/components/varsity/calendar/WorkoutDetail";
import CategoryStatsSheet from "@/components/varsity/calendar/CategoryStatsSheet";
import { useAppState } from "@/components/AppState";
import { useUnits } from "@/components/useUnits";
import { formatDistance } from "@/lib/varsity/units";
import { fetchLogsInRange, type LogEntry } from "@/lib/varsity/logStore";
import { fetchPlan, type Plan } from "@/lib/varsity/planStore";
import { kindOf, prescribedForMonth, planEndIso, type PlannedSession } from "@/lib/varsity/athleteHome";
import { kindBar, kindBlock, kindPlanned, kindLegend } from "@/lib/varsity/home";
import { formatMetrics } from "@/lib/varsity/logParse";
import { toISO, sessionLabel, type Session, type SessionMap } from "@/lib/varsity/coachPlan";
import {
  logCategoryColor,
  logCategoryLabel,
  logVolumeLabel,
  legendCategories,
  rowingCategories,
} from "@/lib/varsity/athleteProfile";
import { IconArrowLeft, IconArrowRight, IconChevronRight, IconClock, IconMessage } from "@/components/icons";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["M", "T", "W", "T", "F", "S", "S"];

const colorOf = (category: string | null) => logCategoryColor[category ?? "other"] ?? "var(--muted)";

/*
  WHAT COLOUR A LOGGED SESSION IS.

  The same colour the PLAN gave it — green UT2, amber UT1, red hard, purple
  weights — so a practice looks the same on the coach's month view and in your own history
  instead of the two screens using different palettes for the same day. A log
  carries the plan slot it came from (`dayKey`), which is how we find the
  coach's session and read its intensity.

  Water and erg are therefore NOT told apart by colour (the plan doesn't either
  — a UT2 outing and a UT2 erg are both green). Each block prints which it was,
  and the legend at the bottom is still what the month's statistics hang off.

  A session logged outside the plan has no intensity to read. Weights, flex and
  off still land on the right colour from their category alone; anything else
  stays neutral rather than being coloured with a guess.
*/
const NEUTRAL_BLOCK = { background: "color-mix(in oklab, var(--muted) 20%, transparent)" };

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

type CalDay = {
  num: number;
  iso: string;
  logs: LogEntry[];
  /* Prescribed for the day and NOT logged against. Ahead of today that is the
     plan; behind it, a session that was missed. */
  planned: PlannedSession[];
  today: boolean;
  future: boolean;
};

function DaySheet({
  label,
  iso,
  past,
  logs,
  planned,
  onClose,
  onOpen,
}: {
  label: string;
  iso: string;
  past: boolean; // the day has gone (not today)
  logs: LogEntry[];
  planned: PlannedSession[];
  onClose: () => void;
  onOpen: (log: LogEntry) => void;
}) {
  return (
    <Sheet title={label} onClose={onClose}>
      {logs.length === 0 && planned.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface-2 px-4 py-6 text-center text-[12px] text-muted">
          {past ? "Nothing logged this day." : "Nothing prescribed this day."}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {logs.map((l) => {
            const metrics = formatMetrics(l.minutes, l.metres, l.split);
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => onOpen(l)}
                className="flex items-start gap-3 rounded-2xl border border-border bg-surface-2 px-3.5 py-3 text-left active:bg-surface"
              >
                <span
                  className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ background: colorOf(l.category) }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-text">{l.title}</div>
                  {metrics && <div className="mt-0.5 text-[12px] text-text-2">{metrics}</div>}
                  {l.note && <div className="mt-0.5 truncate text-[11px] text-muted">{l.note}</div>}
                </div>
                {l.source === "plan" && (
                  <span className="flex-shrink-0 rounded-md border border-border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                    Plan
                  </span>
                )}
                <IconChevronRight size={15} className="mt-0.5 flex-shrink-0 text-muted" />
              </button>
            );
          })}
          {/* The coach's sessions with no log against them: what is coming, or
              — on a day that has gone — what was missed. Same fields Home's
              day detail showed: period + time, type, the workout, the note. */}
          {planned.map((p) => (
            <div
              key={p.dayKey}
              className="flex items-stretch gap-2.5 rounded-2xl border border-border bg-surface-2 px-3.5 py-3"
            >
              <div className="w-[3px] flex-shrink-0 rounded" style={kindBar(p.kind)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[11px] text-muted">
                    <IconClock size={11} /> {p.period} · {p.session.time}
                  </span>
                  <span className="text-[11px] text-muted">{sessionLabel(p.session)}</span>
                  <span
                    className={`ml-auto flex-shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
                      past ? "border-border text-muted" : "border-accent-line bg-accent-tint text-accent"
                    }`}
                  >
                    {past ? "Not logged" : "Planned"}
                  </span>
                </div>
                <div className="mt-1 text-[13px] font-semibold text-text">{p.label}</div>
                {p.session.note && (
                  <div className="mt-1.5 flex gap-2 rounded-lg border border-accent-line bg-accent-tint px-2.5 py-1.5">
                    <span className="mt-0.5 flex-shrink-0 text-accent">
                      <IconMessage size={11} />
                    </span>
                    <span className="text-[11px] leading-relaxed text-text-2">{p.session.note}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* A day you can still log opens the Log tab ON that day; a day ahead
          has nothing to log yet, so no button. */}
      {(past || logs.length > 0 || planned.length > 0) && iso <= toISO(new Date()) && (
        <Link
          href={`/varsity/log?day=${iso}`}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-[12px] font-medium text-text"
        >
          Open the log
          <IconChevronRight size={14} />
        </Link>
      )}
    </Sheet>
  );
}

export default function CalendarScreen() {
  const { userId } = useAppState();
  const now = useMemo(() => new Date(), []);
  const todayIso = toISO(now);

  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [picked, setPicked] = useState<{ iso: string; label: string } | null>(null);
  const [openLog, setOpenLog] = useState<LogEntry | null>(null); // full-screen detail
  const [statsFor, setStatsFor] = useState<string | null>(null); // legend → stats sheet
  // The coach's plan: what is prescribed ahead of today, and the colour a
  // logged session borrows from the slot it came from. Loaded once — the plan
  // is shared and does not change while you scroll months.
  const [plan, setPlan] = useState<Plan | null>(null);
  const planSessions: SessionMap = plan?.sessions ?? {};
  const { units } = useUnits();

  useEffect(() => {
    let active = true;
    fetchPlan().then((p) => {
      if (active) setPlan(p);
    });
    return () => {
      active = false;
    };
  }, []);

  // This month's prescribed sessions, by day (published blocks only).
  const planned = useMemo(
    () => (plan ? prescribedForMonth(plan, view.y, view.m) : {}),
    [plan, view],
  );

  useEffect(() => {
    let active = true;
    (async () => {
      if (!userId) {
        setLogs([]);
        return;
      }
      const from = toISO(new Date(view.y, view.m, 1));
      const to = toISO(new Date(view.y, view.m + 1, 0));
      const rows = await fetchLogsInRange(userId, from, to);
      if (active) setLogs(rows);
    })();
    return () => {
      active = false;
    };
  }, [userId, view]);

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
      const dayLogs = logsByDay[n] ?? [];
      // A prescribed slot with a log against it is shown as the log, not twice.
      const loggedKeys = new Set(dayLogs.map((l) => l.dayKey).filter(Boolean));
      out.push({
        num: n,
        iso,
        logs: dayLogs,
        planned: (planned[iso] ?? []).filter((p) => !loggedKeys.has(p.dayKey)),
        today: iso === todayIso,
        future: iso > todayIso,
      });
    }
    return out;
  }, [view, logsByDay, planned, todayIso]);

  const leadingEmpty = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // Monday-first
  const monthSessions = logs.length;
  // Sessions still ahead this month — the headline for a month with no log yet.
  const monthPlanned = calendar.reduce((sum, d) => sum + (d.future || d.today ? d.planned.length : 0), 0);
  const monthMetres = logs.reduce(
    (sum, l) => sum + (rowingCategories.has(l.category ?? "") ? l.metres ?? 0 : 0),
    0,
  );
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
  // Page forward as far as the published plan reaches, and never short of this
  // month. Behind, as far as you like — that is your history.
  const lastIso = planEndIso(plan ?? { blocks: [], sessions: {} } as Plan) ?? todayIso;
  const lastMonth = Math.max(now.getFullYear() * 12 + now.getMonth(), Number(lastIso.slice(0, 4)) * 12 + Number(lastIso.slice(5, 7)) - 1);
  const atLastMonth = view.y * 12 + view.m >= lastMonth;

  return (
    /* A full-height column: title, weekday header, THE MONTH, legend. Only the
       month flexes, so the grid always reaches the bottom of the screen. */
    <div className="mx-auto flex h-full w-full max-w-screen-sm flex-col px-2.5 pb-3 pt-3">
      {/* The month IS the title — no page header above it. Its totals sit here
          rather than in a bar underneath the grid, where they were the last
          thing you reached and the first thing scrolled off. */}
      <div className="flex flex-shrink-0 items-center justify-between px-1.5">
        <div>
          <div className="flex items-baseline gap-1.5">
            <h1 className="text-xl font-semibold leading-none text-text">{MONTHS[view.m]}</h1>
            <span className="text-[12px] font-medium text-muted">{view.y}</span>
          </div>
          <div className="mt-1 text-[11px] text-muted">
            {monthSessions === 0 ? (
              monthPlanned > 0 ? (
                <>
                  <span className="font-semibold text-text">{monthPlanned}</span> sessions planned
                </>
              ) : (
                "Nothing logged yet"
              )
            ) : (
              <>
                <span className="font-semibold text-text">{monthSessions}</span> sessions
                {monthMetres > 0 && (
                  <>
                    {" · "}
                    <span className="font-semibold text-text">
                      {formatDistance(monthMetres, units.distance)}
                    </span>{" "}
                    rowed
                  </>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => goMonth(-1)}
            className="tap44 press-icon flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-muted"
          >
            <IconArrowLeft size={14} />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => goMonth(1)}
            disabled={atLastMonth}
            className="tap44 press-icon flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-muted disabled:opacity-30"
          >
            <IconArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Weekday header */}
      <div className="mt-3 grid flex-shrink-0 grid-cols-7 gap-1 border-b border-border pb-1.5">
        {DAY_NAMES.map((d, i) => (
          <div key={i} className="text-center text-[11px] font-semibold tracking-[0.12em] text-muted">
            {d}
          </div>
        ))}
      </div>

      {/* The month. Every row the same height, sharing what is left of the
          screen — a wall calendar, not a list that grows with the training. */}
      <div className="mt-1.5 grid min-h-0 flex-1 auto-rows-fr grid-cols-7 gap-1 overflow-y-auto">
        {Array.from({ length: leadingEmpty }).map((_, i) => (
          <div key={`e${i}`} />
        ))}
        {calendar.map((d) => {
          // Ahead of today (and today itself) the unlogged plan is drawn too;
          // behind it, only what was done — a missed day is empty space.
          const ahead = d.future || d.today;
          const has = d.logs.length > 0 || (ahead && d.planned.length > 0);
          const label = `${MONTHS[view.m]} ${d.num}, ${view.y}`;
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
              className={`flex flex-col overflow-hidden rounded-lg border p-[3px] text-left ${
                d.today
                  ? "border-primary bg-primary-tint"
                  : "border-border bg-surface active:bg-surface-2"
              }`}
            >
              <span
                className={`px-px text-[11px] font-semibold leading-none ${
                  d.today ? "text-primary" : has ? "text-text" : "text-muted"
                }`}
              >
                {d.num}
              </span>
              {/*
                HALF A DAY EACH. Two rows, so one session fills the top half and
                leaves the bottom empty instead of stretching over the whole
                box — a morning outing should not look like a day that was
                trained twice. A third session (it happens) makes its own row
                and the three share.
              */}
              <span className="mt-0.5 grid min-h-0 flex-1 auto-rows-fr grid-rows-2 gap-px">
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
                      was there for. A session logged with no figures falls back
                      to the category word, so nothing is ever blank.
                    */
                    const sub = logVolumeLabel(l.category, l.metres, l.minutes);
                    /* An afternoon session belongs in the afternoon half, not
                       wherever it happened to be saved first. A log with no
                       period on it just takes the next free half. */
                    const half = l.period === "PM" ? 2 : l.period === "AM" ? 1 : undefined;
                    return (
                      <span
                        key={l.id}
                        className="overflow-hidden rounded px-1 py-0.5"
                        style={{ ...blockStyle(l, planned), gridRowStart: half }}
                      >
                        {/* Three lines, then an ellipsis. Without a cap, one
                            long title ("Main strength — squat, pull, press")
                            makes its whole week twice as tall as the rest of
                            the month; with a hard clip it breaks mid-word, the
                            way the plan's month view does. */}
                        <span
                          className="block break-words text-[10px] font-medium leading-tight text-text"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {l.title}
                        </span>
                        {sub && (
                          <span className="mt-px block truncate text-[10px] leading-none text-text-2">
                            {sub}
                          </span>
                        )}
                      </span>
                    );
                  })}
                  {/* The plan for a day still to come: the coach's words, in the
                      faint planned style, in the half the period belongs to. */}
                  {ahead &&
                    d.planned.map((p) => (
                      <span
                        key={p.dayKey}
                        className="overflow-hidden rounded px-1 py-0.5"
                        style={{ ...kindPlanned(p.kind), gridRowStart: p.period === "PM" ? 2 : 1 }}
                      >
                        <span
                          className="block break-words text-[10px] font-medium leading-tight text-text"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {p.label}
                        </span>
                      </span>
                    ))}
                  </>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* What the colours mean — the plan's own legend, drawn from the same
          data, so the two month views can never explain themselves
          differently. */}
      <div className="mt-3 flex flex-shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-1 pt-2.5">
        {kindLegend.map((l) => (
          <span key={l.kind} className="flex items-center gap-1 text-[11px] text-muted">
            <span className="h-1.5 w-3 rounded-sm" style={kindBar(l.kind)} />
            {l.label}
          </span>
        ))}
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
              className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted active:bg-surface"
            >
              {logCategoryLabel[c]}
              <span className={count > 0 ? "font-semibold text-text" : "text-muted"}>{count}</span>
            </button>
          );
        })}
      </div>

      {picked && (
        <DaySheet
          label={picked.label}
          iso={picked.iso}
          past={picked.iso < todayIso}
          logs={logsByDay[Number(picked.iso.split("-")[2])] ?? []}
          planned={calendar.find((d) => d.iso === picked.iso)?.planned ?? []}
          onClose={() => setPicked(null)}
          onOpen={(log) => setOpenLog(log)}
        />
      )}

      {statsFor && (
        <CategoryStatsSheet
          category={statsFor}
          monthLabel={`${MONTHS[view.m]} ${view.y}`}
          logs={logs}
          units={units}
          onClose={() => setStatsFor(null)}
        />
      )}

      {openLog && (
        <WorkoutDetail key={openLog.id} log={openLog} userId={userId} onClose={() => setOpenLog(null)} />
      )}
    </div>
  );
}

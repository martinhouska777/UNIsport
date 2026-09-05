"use client";

/*
  Varsity CALENDAR tab — your training history, day by day.
  ---------------------------------------------------------------------------
  A full month grid built from the athlete's OWN logged sessions
  (lib/varsity/logStore), in the same wall-calendar language as the plan's
  month view on Home — the coach's workout TEXT inside each day, not a dot.
  Tap a day for the whole thing; tap a legend colour for that kind of
  training's month.

  FOUR THINGS IT DOES DIFFERENTLY FROM THE PLAN'S MONTH VIEW, all of them
  problems that view has:

    1. ROWS SIZE TO THEIR CONTENT. That one shares the height equally between
       rows (auto-rows-fr), so a long workout is cut off mid-word while an
       empty week holds the same space. Here a busy week grows and a quiet week
       shrinks, and no session text is ever clipped.
    2. A DAY YOU DID NOTHING IS NOT A BOX. Only days you trained get a card;
       the rest are just their number. Half a month of empty bordered boxes was
       the loudest thing on that screen and it carried no information.
    3. EVERY SESSION SAYS WHICH KIND IT WAS — the colour is the intensity, so
       water and erg are the same green and only the word tells them apart.
       The figures stay in the day sheet: a column is about 33px of text wide.
    4. NO PAGE HEADER. The month is the title. The month's totals sit next to
       it instead of in a bar at the bottom.

  All colors are theme tokens — the session blocks now borrow the plan's own
  token-based `kindStyles` (lib/varsity/home) rather than declaring a palette of
  their own. The only content colours left are the dots in the day sheet.
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
import { fetchPlan } from "@/lib/varsity/planStore";
import { kindOf } from "@/lib/varsity/athleteHome";
import { kindStyles, kindLegend } from "@/lib/varsity/home";
import { formatMetrics } from "@/lib/varsity/logParse";
import { toISO, type Session, type SessionMap } from "@/lib/varsity/coachPlan";
import {
  logCategoryColor,
  logCategoryLabel,
  legendCategories,
  rowingCategories,
} from "@/lib/varsity/athleteProfile";
import { IconArrowLeft, IconArrowRight, IconChevronRight } from "@/components/icons";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["M", "T", "W", "T", "F", "S", "S"];

const colorOf = (category: string | null) => logCategoryColor[category ?? "other"] ?? "var(--muted)";

/*
  WHAT COLOUR A LOGGED SESSION IS.

  The same colour the PLAN gave it — green UT2, red hard, amber weights — so a
  practice looks the same on the coach's month view and in your own history
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
const NEUTRAL_BLOCK = "bg-muted/20";

function blockClass(l: LogEntry, planned: Session | undefined): string {
  if (planned) return kindStyles[kindOf(planned)].block;
  switch (l.category) {
    case "weights":
      return kindStyles.weights.block;
    case "flex":
      return kindStyles.recovery.block;
    case "off":
      return kindStyles.off.block;
    default:
      return NEUTRAL_BLOCK;
  }
}

type CalDay = { num: number; iso: string; logs: LogEntry[]; today: boolean; future: boolean };

function DaySheet({
  label,
  logs,
  onClose,
  onOpen,
}: {
  label: string;
  logs: LogEntry[];
  onClose: () => void;
  onOpen: (log: LogEntry) => void;
}) {
  return (
    <Sheet title={label} onClose={onClose}>
      {logs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface-2 px-4 py-6 text-center text-[12px] text-muted">
          Nothing logged this day.
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
        </div>
      )}
      <Link
        href="/varsity/log"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-[12px] font-medium text-text"
      >
        Open the log
        <IconChevronRight size={14} />
      </Link>
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
  // The coach's sessions, only so a logged one can borrow its colour. Loaded
  // once — the plan is shared and does not change while you scroll months.
  const [planSessions, setPlanSessions] = useState<SessionMap>({});
  const { units } = useUnits();

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
  const monthSessions = logs.length;
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
  const atCurrentMonth = view.y === now.getFullYear() && view.m === now.getMonth();

  return (
    <div className="mx-auto w-full max-w-screen-sm px-2.5 pb-10 pt-3">
      {/* The month IS the title — no page header above it. Its totals sit here
          rather than in a bar underneath the grid, where they were the last
          thing you reached and the first thing scrolled off. */}
      <div className="flex items-center justify-between px-1.5">
        <div>
          <div className="flex items-baseline gap-1.5">
            <h1 className="text-xl font-semibold leading-none text-text">{MONTHS[view.m]}</h1>
            <span className="text-[12px] font-medium text-muted">{view.y}</span>
          </div>
          <div className="mt-1 text-[11px] text-muted">
            {monthSessions === 0 ? (
              "Nothing logged yet"
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
            disabled={atCurrentMonth}
            className="tap44 press-icon flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-muted disabled:opacity-30"
          >
            <IconArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Weekday header */}
      <div className="mt-3 grid grid-cols-7 gap-1 border-b border-border pb-1.5">
        {DAY_NAMES.map((d, i) => (
          <div key={i} className="text-center text-[11px] font-semibold tracking-[0.12em] text-muted">
            {d}
          </div>
        ))}
      </div>

      {/* The month. Rows take the height their busiest day needs — a week of
          doubles is tall, a week off is a single line — so nothing is clipped
          and no empty week eats a fifth of the screen. */}
      <div
        className="mt-1.5 grid grid-cols-7 gap-1"
        style={{ gridAutoRows: "minmax(2.75rem, auto)" }}
      >
        {Array.from({ length: leadingEmpty }).map((_, i) => (
          <div key={`e${i}`} />
        ))}
        {calendar.map((d) => {
          const has = d.logs.length > 0;
          const label = `${MONTHS[view.m]} ${d.num}, ${view.y}`;
          return (
            <button
              key={d.num}
              type="button"
              onClick={() => setPicked({ iso: d.iso, label })}
              className={`flex flex-col overflow-hidden rounded-lg p-[3px] text-left ${
                d.today
                  ? "border border-primary bg-primary-tint"
                  : has
                    ? "border border-border bg-surface active:bg-surface-2"
                    : "border border-transparent active:bg-surface"
              }`}
            >
              <span
                className={`px-px text-[11px] font-semibold leading-none ${
                  d.today ? "text-primary" : has ? "text-text" : d.future ? "text-muted/40" : "text-muted"
                }`}
              >
                {d.num}
              </span>
              {has && (
                <span className="mt-0.5 flex flex-col gap-px">
                  {d.logs.map((l) => {
                    const planned: Session | undefined = l.dayKey ? planSessions[l.dayKey] : undefined;
                    /*
                      Which kind of training it was, since the colour now says
                      how hard rather than what — and water and erg share a
                      colour at the same intensity.

                      The word ALONE. A column is about 33px of text wide, so
                      "Water · 16k" truncates to "Wate…" and loses the number it
                      was there for. The figures live in the day sheet.
                    */
                    const sub = logCategoryLabel[l.category ?? "other"];
                    return (
                      <span
                        key={l.id}
                        className={`block rounded px-1 py-0.5 ${blockClass(l, planned)}`}
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
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* What the colours mean — the plan's own legend, drawn from the same
          data, so the two month views can never explain themselves
          differently. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-1 pt-2.5">
        {kindLegend.map((l) => (
          <span key={l.kind} className="flex items-center gap-1 text-[11px] text-muted">
            <span className={`h-1.5 w-3 rounded-sm ${kindStyles[l.kind].bar}`} />
            {l.label}
          </span>
        ))}
      </div>

      {/* The month by kind of training — the axis the colours no longer carry.
          Each is a button: tap it for that training's sessions, time and
          distance this month. */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 px-1">
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
          logs={logsByDay[Number(picked.iso.split("-")[2])] ?? []}
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

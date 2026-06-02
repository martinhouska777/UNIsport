"use client";

/*
  Varsity CALENDAR tab — your training history, day by day.
  ---------------------------------------------------------------------------
  A full month grid built from the athlete's OWN logged sessions
  (lib/varsity/logStore). Each day shows colored dots for what was trained; tap
  a day to see exactly what you did. Prev/next move between months; a summary
  bar shows that month's sessions + metres. All colors are theme tokens; the
  per-category dots are CONTENT colors from data, applied via inline style.
*/
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sheet from "@/components/varsity/Sheet";
import { useAppState } from "@/components/AppState";
import { fetchLogsInRange, type LogEntry } from "@/lib/varsity/logStore";
import { formatMetrics } from "@/lib/varsity/logParse";
import { toISO } from "@/lib/varsity/coachPlan";
import {
  logCategoryColor,
  logCategoryLabel,
  legendCategories,
  rowingCategories,
} from "@/lib/varsity/athleteProfile";
import { IconChevronDown, IconChevronRight } from "@/components/icons";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["M", "T", "W", "T", "F", "S", "S"];

type CalDay = { num: number; iso: string; dots: string[]; today: boolean; future: boolean };

function DaySheet({
  label,
  logs,
  onClose,
}: {
  label: string;
  logs: LogEntry[];
  onClose: () => void;
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
              <div
                key={l.id}
                className="flex items-start gap-3 rounded-2xl border border-border bg-surface-2 px-3.5 py-3"
              >
                <span
                  className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ background: logCategoryColor[l.category ?? "other"] ?? "var(--muted)" }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-text">{l.title}</div>
                  {metrics && <div className="mt-0.5 text-[12px] text-text/90">{metrics}</div>}
                  {l.note && <div className="mt-0.5 text-[11px] text-muted">{l.note}</div>}
                </div>
                {l.source === "plan" && (
                  <span className="flex-shrink-0 rounded-md border border-border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted">
                    Plan
                  </span>
                )}
              </div>
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
      const seen = new Set<string>();
      const dots: string[] = [];
      for (const l of logsByDay[n] ?? []) {
        const c = l.category ?? "other";
        if (!seen.has(c) && dots.length < 4) {
          seen.add(c);
          dots.push(c);
        }
      }
      out.push({ num: n, iso, dots, today: iso === todayIso, future: iso > todayIso });
    }
    return out;
  }, [view, logsByDay, todayIso]);

  const leadingEmpty = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // Monday-first
  const monthSessions = logs.length;
  const monthMetres = logs.reduce(
    (sum, l) => sum + (rowingCategories.has(l.category ?? "") ? l.metres ?? 0 : 0),
    0,
  );
  const metresLabel =
    monthMetres >= 1000
      ? `${(monthMetres / 1000).toFixed(monthMetres >= 10000 ? 0 : 1)}k`
      : String(monthMetres);

  const goMonth = (delta: number) =>
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  const atCurrentMonth = view.y === now.getFullYear() && view.m === now.getMonth();

  return (
    <div className="mx-auto w-full max-w-screen-sm px-4 pb-10 pt-4">
      <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-accent">
        Training history
      </div>
      <h1 className="mt-0.5 text-2xl font-semibold text-text">Calendar</h1>
      <p className="mt-0.5 text-[12px] text-muted">Every day you trained — tap a day to see it.</p>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
        {/* Month header + nav */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold text-text">{MONTHS[view.m]}</span>
            <span className="text-[11px] font-medium tracking-wide text-muted">{view.y}</span>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => goMonth(-1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface-2 text-muted"
            >
              <IconChevronDown size={15} className="rotate-90" />
            </button>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => goMonth(1)}
              disabled={atCurrentMonth}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface-2 text-muted disabled:opacity-30"
            >
              <IconChevronDown size={15} className="-rotate-90" />
            </button>
          </div>
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b border-border px-2 pb-1 pt-2">
          {DAY_NAMES.map((d, i) => (
            <div key={i} className="py-0.5 text-center text-[9px] font-semibold tracking-[0.12em] text-muted">
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1 px-2 pb-3 pt-2">
          {Array.from({ length: leadingEmpty }).map((_, i) => (
            <div key={`e${i}`} className="aspect-square" />
          ))}
          {calendar.map((d) => {
            const has = d.dots.length > 0;
            const label = `${MONTHS[view.m]} ${d.num}, ${view.y}`;
            return (
              <button
                key={d.num}
                type="button"
                onClick={() => setPicked({ iso: d.iso, label })}
                className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl pt-1 ${
                  d.today
                    ? "border border-primary/40 bg-primary/15"
                    : has
                      ? "border border-border bg-surface-2 active:bg-surface"
                      : "active:bg-surface-2"
                }`}
              >
                <span
                  className={`text-[13px] font-medium leading-none ${
                    d.today ? "font-bold text-primary" : d.future ? "text-muted" : "text-text"
                  }`}
                >
                  {d.num}
                </span>
                <span className="flex h-1.5 items-center gap-0.5">
                  {d.dots.map((c, i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: logCategoryColor[c] ?? "var(--muted)" }}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border bg-surface-2 px-4 py-2.5">
          {legendCategories.map((c) => (
            <div key={c} className="flex items-center gap-1.5 text-[10px] text-muted">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: logCategoryColor[c] ?? "var(--muted)" }}
              />
              {logCategoryLabel[c]}
            </div>
          ))}
        </div>

        {/* Month summary */}
        <div className="flex items-center gap-4 border-t border-border px-4 py-3">
          <div>
            <div className="text-base font-semibold leading-none text-text">{monthSessions}</div>
            <div className="mt-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-muted">
              Sessions
            </div>
          </div>
          <div className="h-6 w-px bg-border" />
          <div>
            <div className="text-base font-semibold leading-none text-text">{metresLabel}</div>
            <div className="mt-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-muted">
              Metres rowed
            </div>
          </div>
          <span className="ml-auto text-[10px] text-muted">in {MONTHS[view.m]}</span>
        </div>
      </div>

      {picked && (
        <DaySheet
          label={picked.label}
          logs={logsByDay[Number(picked.iso.split("-")[2])] ?? []}
          onClose={() => setPicked(null)}
        />
      )}
    </div>
  );
}

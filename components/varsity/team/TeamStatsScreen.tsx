"use client";

/*
  THE SQUAD'S STATISTICS, FULL SCREEN — the coach's version of the athlete's
  StatsFullScreen.
  ---------------------------------------------------------------------------
  The card on top of the Team tab is a glance: this week, two numbers. This is
  the whole screen given over to how the squad is training — the same reading
  every rower has of themselves (a graph over a window, and the numbers under
  it), about the team (owner, 2026-09-21: "something there to see full
  statistics… similar to what each individual athlete has… and you can compare
  it to previous weeks").

  Every column is a WEEK, and every figure is the average person's — the
  squad's boats added up and divided by the people who were in them
  (lib/varsity/teamStats.ts), which is exactly what the card says about this
  week. Under the graph: what the window came to, then the weeks one under the
  other, newest first, so a week is read against the ones before it without
  anyone doing the subtraction.

  Two choices, the same dropdowns the athlete has: the MEASURE (km, hours,
  people) and the WINDOW (a month, three, six). Nothing is compared in colour:
  a taper week is supposed to fall.

  Portalled to <body> and re-wrapped in <ThemeProvider>, like the athlete's,
  so it covers the tab bar and keeps the Varsity theme. All colours are theme
  tokens (rule 1).
*/
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import ThemeProvider from "@/components/ThemeProvider";
import { useVarsityTheme } from "@/components/varsity/useVarsityTheme";
import { useUnits } from "@/components/useUnits";
import Plot from "@/components/varsity/profile/Plot";
import Dropdown from "@/components/varsity/profile/Dropdown";
import { IconX, IconCalendar } from "@/components/icons";
import { averageMetres, averageMinutes } from "@/lib/varsity/boatMileage";
import { formatDistance, formatDuration } from "@/lib/varsity/units";
import {
  defaultTeamRange,
  fetchTeamWeeks,
  teamMetricByKey,
  teamMetrics,
  teamRangeByKey,
  teamRanges,
  teamReport,
  trainedWeeks,
  weekStarts,
  windowAverage,
  windowLabel,
  type TeamWeekStat,
} from "@/lib/varsity/teamStats";

export default function TeamStatsScreen({ onClose }: { onClose: () => void }) {
  const vTheme = useVarsityTheme();
  const { units } = useUnits();
  const now = useMemo(() => new Date(), []);

  const [rangeKey, setRangeKey] = useState(defaultTeamRange);
  const [metricKey, setMetricKey] = useState(teamMetrics[0].key);
  const [openMenu, setOpenMenu] = useState<"metric" | "range" | null>(null);
  /* Every week the longest window can show, read ONCE; a shorter window is
     the tail of the same list, so changing it never goes back to the database. */
  const [weeks, setWeeks] = useState<TeamWeekStat[] | null>(null);

  const range = teamRangeByKey(rangeKey);
  const metric = teamMetricByKey(metricKey);

  useEffect(() => {
    let active = true;
    const most = Math.max(...teamRanges.map((r) => r.weeks));
    fetchTeamWeeks(weekStarts(now, most))
      .then((w) => active && setWeeks(w))
      .catch(() => active && setWeeks([]));
    return () => {
      active = false;
    };
  }, [now]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const shown = useMemo(() => (weeks ? weeks.slice(-range.weeks) : []), [weeks, range]);
  const points = shown.map((w) => ({ label: w.short, value: metric.of(w.mileage), latest: w.latest }));
  const empty = weeks !== null && trainedWeeks(shown).length === 0;
  const groups = teamReport(shown, units);
  const plotMetric = { label: metric.label(units), format: metric.format };

  return createPortal(
    <ThemeProvider tokens={vTheme.dark} light={vTheme.light}>
      <div className="fixed inset-0 z-[60] flex flex-col bg-background [animation:backdrop-in_0.18s_ease-out]">
        {/* ── The bar. What you are looking at, and the way out. ── */}
        <div className="flex flex-shrink-0 items-center gap-3 border-b border-border px-3 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close team statistics"
            className="tap44 press-icon flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted"
          >
            <IconX size={15} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold leading-tight text-text">
              Team statistics
            </div>
            {shown.length > 0 && (
              <div className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-muted">
                <IconCalendar size={11} />
                {windowLabel(shown)} · week by week
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain pb-[max(2rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto w-full max-w-screen-sm px-3.5">
            {/* ── The two choices, the athlete's own dropdowns. ── */}
            <div className="flex flex-wrap items-center gap-2 py-3">
              <Dropdown
                label={metric.label(units)}
                options={teamMetrics.map((m) => ({ key: m.key, label: m.label(units) }))}
                value={metric.key}
                open={openMenu === "metric"}
                onOpen={(v) => setOpenMenu(v ? "metric" : null)}
                onPick={(k) => {
                  setMetricKey(k);
                  setOpenMenu(null);
                }}
              />
              <Dropdown
                label={range.label}
                options={teamRanges.map((r) => ({ key: r.key, label: r.label }))}
                value={range.key}
                open={openMenu === "range"}
                onOpen={(v) => setOpenMenu(v ? "range" : null)}
                onPick={(k) => {
                  setRangeKey(k);
                  setOpenMenu(null);
                }}
              />
            </div>

            {weeks === null ? (
              <p className="py-12 text-center text-[13px] text-muted">Adding up the boats…</p>
            ) : empty ? (
              <p className="px-6 py-12 text-center text-[13px] leading-relaxed text-muted">
                {metric.empty}
              </p>
            ) : (
              <>
                {/* THE GRAPH — one column a week, a dashed average across the
                    weeks that had training, the best week's number on it. */}
                <div className="rounded-2xl border border-border bg-surface p-3">
                  <Plot
                    points={points}
                    metric={plotMetric}
                    units={units}
                    chart="bars"
                    height={190}
                    values="peak"
                    average={windowAverage(shown, metric)}
                  />
                </div>

                {/* WHAT THE WINDOW CAME TO — teamStats decides what is said
                    and in what order; this only draws it (rule 7). */}
                {groups.map((g) => (
                  <div key={g.key} className="mt-5">
                    <div className="pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                      {g.title}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {g.cells.map((c) => (
                        <div key={c.key} className="rounded-xl border border-border bg-surface px-3 py-2.5">
                          <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">
                            {c.label}
                          </div>
                          <div className="mt-1 text-[17px] font-semibold leading-none text-text">
                            {c.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* WEEK BY WEEK, newest first — the comparison, written as the
                    weeks themselves rather than as a difference somebody has
                    to trust. A week with no boats says so and is not a zero. */}
                <div className="mt-5">
                  <div className="pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                    Week by week
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                    <div className="grid grid-cols-[1.4fr_1fr_1fr_0.8fr] gap-2 border-b border-border px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">
                      <span>Week</span>
                      <span className="text-right">{units.distance === "mi" ? "Miles" : "Km"}</span>
                      <span className="text-right">Hours</span>
                      <span className="text-right">People</span>
                    </div>
                    {[...shown].reverse().map((w) => {
                      const had = w.mileage.boats > 0;
                      return (
                        <div
                          key={w.start.getTime()}
                          className={`grid grid-cols-[1.4fr_1fr_1fr_0.8fr] gap-2 border-b border-border px-3 py-2.5 text-[13px] last:border-b-0 ${
                            w.latest ? "bg-surface-2" : ""
                          }`}
                        >
                          <span className="truncate font-medium text-text">
                            {w.latest ? "This week" : w.label}
                          </span>
                          {had ? (
                            <>
                              <span className="text-right tabular-nums text-text">
                                {formatDistance(averageMetres(w.mileage), units.distance)}
                              </span>
                              <span className="text-right tabular-nums text-text">
                                {formatDuration(Math.round(averageMinutes(w.mileage)))}
                              </span>
                              <span className="text-right tabular-nums text-muted">{w.mileage.people.length}</span>
                            </>
                          ) : (
                            <span className="col-span-3 text-right text-[12px] text-muted">no boats written down</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </ThemeProvider>,
    document.body,
  );
}

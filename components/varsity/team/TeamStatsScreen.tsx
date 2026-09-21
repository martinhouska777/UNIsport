"use client";

/*
  THE SQUAD'S STATISTICS, FULL SCREEN — the coach's version of the athlete's
  StatsFullScreen.
  ---------------------------------------------------------------------------
  The card on top of the Team tab is a glance: this week, two numbers. This is
  the whole screen given over to how the squad is training — the athlete's own
  statistics screen, copied and customised for the team (owner, 2026-09-21):

    • the same two choices, the MEASURE (average km, average hours, people on
      the water) and the WINDOW — a week read day by day, a month and the
      semester read week by week
    • the same graph, and a column you can TAP: the day (or week) is then read
      out underneath — what one person did on average, how many were out, in
      how many boats, and for a day the crews themselves with each boat's
      distance and time
    • the window's figures in the same cells the athlete's report uses, and
      the days or weeks listed newest first so one is read against the ones
      before it

  Every figure is the average person's — the squad's boats added up and
  divided by the people who were in them (lib/varsity/teamStats.ts), which is
  exactly what the card says about this week. Nothing is compared in colour:
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
import type { Boat } from "@/lib/varsity/coachLineup";
import { crewLabel } from "@/lib/varsity/racePieces";
import { formatDistance, formatDuration } from "@/lib/varsity/units";
import {
  defaultTeamRange,
  fetchTeamLineups,
  fillBuckets,
  teamMetricByKey,
  teamMetrics,
  teamRangeByKey,
  teamRanges,
  teamReport,
  trainedBuckets,
  windowAverage,
  windowLabel,
  type TeamBucket,
} from "@/lib/varsity/teamStats";

export default function TeamStatsScreen({ onClose }: { onClose: () => void }) {
  const vTheme = useVarsityTheme();
  const { units } = useUnits();
  const now = useMemo(() => new Date(), []);

  const [rangeKey, setRangeKey] = useState(defaultTeamRange);
  const [metricKey, setMetricKey] = useState(teamMetrics[0].key);
  const [openMenu, setOpenMenu] = useState<"metric" | "range" | null>(null);
  /* Every boat the longest window can show, read ONCE; a window is then just
     a way of bucketing the same boats, so changing it never goes back to the
     database. Null until the read lands. */
  const [lineups, setLineups] = useState<Record<string, Boat[]> | null>(null);
  /* The tapped column — the latest bucket until someone taps, as on the
     athlete's screen. Held per window: a day index means nothing on weeks. */
  const [picked, setPicked] = useState<{ range: string; index: number } | null>(null);

  const range = teamRangeByKey(rangeKey);
  const metric = teamMetricByKey(metricKey);

  useEffect(() => {
    let active = true;
    fetchTeamLineups(now)
      .then((l) => active && setLineups(l))
      .catch(() => active && setLineups({}));
    return () => {
      active = false;
    };
  }, [now]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const buckets: TeamBucket[] = useMemo(
    () => (lineups ? fillBuckets(range, now, lineups) : []),
    [lineups, range, now],
  );
  const points = buckets.map((b) => ({ label: b.short, value: metric.of(b.mileage), latest: b.latest }));
  const empty = lineups !== null && trainedBuckets(buckets).length === 0;
  const groups = teamReport(buckets, range, units);
  const plotMetric = { label: metric.label(units), format: metric.format };
  const selected =
    picked && picked.range === range.key ? Math.min(picked.index, buckets.length - 1) : buckets.length - 1;
  const readOut = buckets[selected] ?? null;
  const each = range.bucket === "day" ? "day" : "week";

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
            <div className="truncate text-[15px] font-semibold leading-tight text-text">Team statistics</div>
            {buckets.length > 0 && (
              <div className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-muted">
                <IconCalendar size={11} />
                {windowLabel(buckets)} · {each} by {each}
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

            {lineups === null ? (
              <p className="py-12 text-center text-[13px] text-muted">Adding up the boats…</p>
            ) : empty ? (
              <p className="px-6 py-12 text-center text-[13px] leading-relaxed text-muted">{metric.empty}</p>
            ) : (
              <>
                {/* THE GRAPH — a column a day or a week, a dashed average across
                    the ones that had training, the best one's number on it, and
                    a tap on any column to read it out below. */}
                <div className="rounded-2xl border border-border bg-surface p-3">
                  <Plot
                    points={points}
                    metric={plotMetric}
                    units={units}
                    chart="bars"
                    height={190}
                    values="peak"
                    average={windowAverage(buckets, metric)}
                    selected={selected}
                    onSelect={(i) => setPicked({ range: range.key, index: i })}
                  />
                </div>

                {/* THE TAPPED COLUMN, read out. */}
                {readOut && <ReadOut bucket={readOut} each={each} units={units} />}

                {/* WHAT THE WINDOW CAME TO — teamStats decides what is said
                    and in what order; this only draws it (rule 7). */}
                {groups.map((g) => (
                  <div key={g.key} className="mt-5">
                    <div className="pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{g.title}</div>
                    <div className="grid grid-cols-2 gap-2">
                      {g.cells.map((c) => (
                        <div key={c.key} className="rounded-xl border border-border bg-surface px-3 py-2.5">
                          <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">{c.label}</div>
                          <div className="mt-1 text-[17px] font-semibold leading-none text-text">{c.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* DAY BY DAY or WEEK BY WEEK, newest first — the comparison,
                    written as the days themselves rather than as a difference
                    somebody has to trust. One with no boats says so, and is
                    not a zero. Tapping a row picks its column. */}
                <div className="mt-5">
                  <div className="pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                    {each} by {each}
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                    <div className="grid grid-cols-[1.4fr_1fr_1fr_0.8fr] gap-2 border-b border-border px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">
                      <span>{each}</span>
                      <span className="text-right">{units.distance === "mi" ? "Miles" : "Km"}</span>
                      <span className="text-right">Hours</span>
                      <span className="text-right">People</span>
                    </div>
                    {buckets
                      .map((b, i) => ({ b, i }))
                      .reverse()
                      .map(({ b, i }) => {
                        const had = b.mileage.boats > 0;
                        return (
                          <button
                            key={b.start.getTime()}
                            type="button"
                            onClick={() => setPicked({ range: range.key, index: i })}
                            className={`grid w-full grid-cols-[1.4fr_1fr_1fr_0.8fr] gap-2 border-b border-border px-3 py-2.5 text-left text-[13px] last:border-b-0 ${
                              i === selected ? "bg-surface-2" : ""
                            }`}
                          >
                            <span className="truncate font-medium text-text">
                              {b.latest ? (each === "day" ? "Today" : "This week") : b.label}
                            </span>
                            {had ? (
                              <>
                                <span className="text-right tabular-nums text-text">
                                  {formatDistance(averageMetres(b.mileage), units.distance)}
                                </span>
                                <span className="text-right tabular-nums text-text">
                                  {formatDuration(Math.round(averageMinutes(b.mileage)))}
                                </span>
                                <span className="text-right tabular-nums text-muted">{b.mileage.people.length}</span>
                              </>
                            ) : (
                              <span className="col-span-3 text-right text-[12px] text-muted">no boats written down</span>
                            )}
                          </button>
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

/*
  ONE COLUMN, READ OUT — the day or the week that was tapped. The average
  person's distance and time, who was out and in how many boats; and for a
  DAY, the crews themselves, each boat with what it did, because "what
  happened on Tuesday" is answered by the boats, not by an average.
*/
function ReadOut({
  bucket,
  each,
  units,
}: {
  bucket: TeamBucket;
  each: "day" | "week";
  units: { distance: "km" | "mi" };
}) {
  const m = bucket.mileage;
  const had = m.boats > 0;
  const withFigures = bucket.boats.filter((b) => (b.metres ?? 0) > 0 || (b.minutes ?? 0) > 0);
  return (
    <div className="mt-3 rounded-2xl border border-border bg-surface px-3.5 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[13px] font-semibold text-text">
          {bucket.latest ? (each === "day" ? "Today" : "This week") : bucket.label}
        </div>
        {had && (
          <div className="text-[11px] text-muted">
            {m.people.length} {m.people.length === 1 ? "person" : "people"} · {m.boats} {m.boats === 1 ? "boat" : "boats"}
          </div>
        )}
      </div>
      {!had ? (
        <p className="mt-1.5 text-[12px] text-muted">
          {m.unfilled > 0
            ? `${m.unfilled} ${m.unfilled === 1 ? "boat" : "boats"} went out, nothing written on ${m.unfilled === 1 ? "it" : "them"} yet.`
            : `No boats on this ${each}.`}
        </p>
      ) : (
        <>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border bg-surface-2 px-3 py-2">
              <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">Per person</div>
              <div className="mt-0.5 text-[16px] font-semibold leading-none text-text">
                {formatDistance(averageMetres(m), units.distance)}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-surface-2 px-3 py-2">
              <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">Per person</div>
              <div className="mt-0.5 text-[16px] font-semibold leading-none text-text">
                {formatDuration(Math.round(averageMinutes(m)))}
              </div>
            </div>
          </div>
          {each === "day" && withFigures.length > 0 && (
            <div className="mt-2.5 flex flex-col gap-1">
              {withFigures.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="min-w-0 truncate text-text">
                    <span className="mr-1.5 font-mono text-[10px] text-muted">{b.badge}</span>
                    {crewLabel(b)}
                  </span>
                  <span className="flex-shrink-0 tabular-nums text-muted">
                    {b.metres ? formatDistance(b.metres, units.distance) : ""}
                    {b.metres && b.minutes ? " · " : ""}
                    {b.minutes ? formatDuration(b.minutes) : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

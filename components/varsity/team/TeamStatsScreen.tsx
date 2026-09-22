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
    • the same graph, with the number written on EVERY column whenever the
      numbers fit (owner: "show everywhere when it fits"), and a column you
      can TAP: the day (or week) is then read out underneath — what one
      person did on average, and for a day the crews themselves with each
      boat's distance and time. An empty day reads out NOTHING: "5 boats,
      nothing written on them" was text nobody asked for.
    • the averages — what an outing was, how long, how often the average
      person went out — and nothing else: per-person-per-week, biggest week,
      and the "who" counts (people, boats) all came off on the owner's call
    • at the foot, a TABLE, the way a coach would lay it out in a spreadsheet:
      one row a day or a week, kilometres, the change on the row before,
      hours, outings — so a week is compared against the weeks before it by
      reading down a column. A row with no boats shows dashes, not a sentence.

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
import { formatDistance, formatDuration, metresToUnit, type Units } from "@/lib/varsity/units";
import {
  defaultTeamRange,
  fetchTeamLineups,
  fillBuckets,
  outingsPerPerson,
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
                {/* THE GRAPH — a column a day or a week, its number on every
                    column while they fit (the best one alone when they don't),
                    a dashed average across the ones that had training, and a
                    tap on any column to read it out below. */}
                <div className="rounded-2xl border border-border bg-surface p-3">
                  <Plot
                    points={points}
                    metric={plotMetric}
                    units={units}
                    chart="bars"
                    height={190}
                    values="auto"
                    average={windowAverage(buckets, metric)}
                    selected={selected}
                    onSelect={(i) => setPicked({ range: range.key, index: i })}
                  />
                </div>

                {/* THE TAPPED COLUMN, read out — only when there is something
                    in it. An empty day says nothing at all. */}
                {readOut && readOut.mileage.boats > 0 && (
                  <ReadOut bucket={readOut} each={each} units={units} />
                )}

                {/* THE AVERAGES — teamStats decides what is said and in what
                    order; this only draws it (rule 7). */}
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

                <CompareTable
                  buckets={buckets}
                  each={each}
                  units={units}
                  selected={selected}
                  onPick={(i) => setPicked({ range: range.key, index: i })}
                />
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
  ONE COLUMN, READ OUT — the day or the week that was tapped: the average
  person's distance and time, and for a DAY the crews themselves, each boat
  with what it did, because "what happened on Tuesday" is answered by the
  boats, not by an average. No counts of people or boats (owner).
*/
function ReadOut({ bucket, each, units }: { bucket: TeamBucket; each: "day" | "week"; units: Units }) {
  const m = bucket.mileage;
  const withFigures = bucket.boats.filter((b) => (b.metres ?? 0) > 0 || (b.minutes ?? 0) > 0);
  return (
    <div className="mt-3 rounded-2xl border border-border bg-surface px-3.5 py-3">
      <div className="text-[13px] font-semibold text-text">
        {bucket.latest ? (each === "day" ? "Today" : "This week") : bucket.label}
      </div>
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
    </div>
  );
}

/*
  THE TABLE — a spreadsheet, on purpose (owner: "just like an Excel table").
  Newest row on top. Each row is one day or one week: the average person's
  kilometres, the change on the row before it (the previous day or week that
  had training — never coloured), the hours, and how many outings the average
  person had. A row with no boats is dashes. The row being read out above is
  marked, and tapping a row reads it out.
*/
function CompareTable({
  buckets,
  each,
  units,
  selected,
  onPick,
}: {
  buckets: TeamBucket[];
  each: "day" | "week";
  units: Units;
  selected: number;
  onPick: (i: number) => void;
}) {
  const unit = units.distance;
  const km = (m: number) => {
    const v = metresToUnit(m, unit);
    return v >= 100 ? v.toFixed(0) : v.toFixed(1);
  };
  const hrs = (min: number) => formatDuration(Math.round(min));

  /* The previous row that had training, for the ± column. */
  const prevTrained = (i: number): TeamBucket | null => {
    for (let k = i - 1; k >= 0; k--) if (buckets[k].mileage.boats > 0) return buckets[k];
    return null;
  };
  const delta = (i: number): string => {
    const b = buckets[i];
    const p = prevTrained(i);
    if (!p || b.mileage.boats === 0) return "";
    const d = metresToUnit(averageMetres(b.mileage) - averageMetres(p.mileage), unit);
    if (Math.abs(d) < 0.05) return "±0";
    return `${d > 0 ? "+" : "−"}${Math.abs(d) >= 100 ? Math.abs(d).toFixed(0) : Math.abs(d).toFixed(1)}`;
  };

  const cols = "grid-cols-[minmax(0,1.5fr)_3.4rem_3.2rem_3.6rem_3rem]";
  const cell = "px-2 py-2 text-right tabular-nums";

  return (
    <div className="mt-5">
      <div className="pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
        {each} by {each}
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-surface text-[12px]">
        <div className={`grid ${cols} border-b border-border bg-surface-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted`}>
          <span className="px-2.5 py-2 text-left">{each}</span>
          <span className={cell}>{unit === "mi" ? "Mi" : "Km"}</span>
          <span className={cell}>±</span>
          <span className={cell}>Hours</span>
          <span className={cell}>Out</span>
        </div>
        {buckets
          .map((b, i) => ({ b, i }))
          .reverse()
          .map(({ b, i }, row) => {
            const had = b.mileage.boats > 0;
            return (
              <button
                key={b.start.getTime()}
                type="button"
                onClick={() => onPick(i)}
                aria-pressed={i === selected}
                className={`grid ${cols} w-full items-center border-b border-border text-left last:border-b-0 ${
                  i === selected ? "bg-primary-tint" : row % 2 === 1 ? "bg-surface-2/60" : ""
                }`}
              >
                <span className={`truncate px-2.5 py-2 ${b.latest ? "font-semibold text-text" : "font-medium text-text"}`}>
                  {b.latest ? (each === "day" ? "Today" : "This week") : b.label}
                </span>
                {had ? (
                  <>
                    <span className={`${cell} font-semibold text-text`}>{km(averageMetres(b.mileage))}</span>
                    <span className={`${cell} text-muted`}>{delta(i)}</span>
                    <span className={`${cell} text-text`}>{hrs(averageMinutes(b.mileage))}</span>
                    <span className={`${cell} text-muted`}>{outingsPerPerson(b.mileage).toFixed(1)}</span>
                  </>
                ) : (
                  <>
                    <span className={`${cell} text-muted`}>—</span>
                    <span className={`${cell} text-muted`}></span>
                    <span className={`${cell} text-muted`}>—</span>
                    <span className={`${cell} text-muted`}>—</span>
                  </>
                )}
              </button>
            );
          })}
      </div>
    </div>
  );
}

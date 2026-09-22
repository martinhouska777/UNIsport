"use client";

/*
  THE SQUAD'S STATISTICS, FULL SCREEN — the coach's version of the athlete's
  StatsFullScreen, with the same handles.
  ---------------------------------------------------------------------------
  The card on top of the Team tab is a glance: this week, two numbers. This is
  the whole screen given over to how the squad is training — the athlete's own
  statistics screen, copied and customised for the team (owner, 2026-09-21:
  "exactly the same as the athlete's statistics, with the same functions"):

    • the same THREE choices: the MEASURE (average km, average hours, people
      on the water), the WINDOW — a week read day by day, a month and the
      semester read week by week, or two dates the coach chooses — and the
      SHAPE, columns or a line
    • the same graph, with the number written on EVERY column whenever the
      numbers fit (owner: "show everywhere when it fits"); a TAP reads a
      column out below, and a DRAG across the columns zooms into that stretch
      — three weeks out of a semester become those three weeks, day by day.
      "Zoom out" puts back the window you were on before the first zoom.
    • an empty day reads out NOTHING — "5 boats, nothing written on them" and
      "27 people · 14 boats" were text nobody asked for
    • the averages — what an outing was, how long, how often the average
      person went out — and nothing else
    • at the foot, a TABLE the way a coach would lay it out in a spreadsheet:
      one row a day or a week, kilometres, the change on the row before,
      hours — so a week is compared against the weeks before it by reading
      down a column. A row with no boats is dashes; tapping a row picks it.

  Every figure is the average person's — the squad's boats added up and
  divided by the people who were in them (lib/varsity/teamStats.ts), which is
  exactly what the card says about this week. Nothing is compared in colour:
  a taper week is supposed to fall.

  Boats are read ONCE for the longest built-in window; a custom window or a
  zoom that reaches outside it fetches only the days it is missing. Portalled
  to <body> and re-wrapped in <ThemeProvider>, like the athlete's, so it
  covers the tab bar and keeps the Varsity theme. All colours are theme tokens.
*/
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import ThemeProvider from "@/components/ThemeProvider";
import { useVarsityTheme } from "@/components/varsity/useVarsityTheme";
import { useUnits } from "@/components/useUnits";
import Plot from "@/components/varsity/profile/Plot";
import Dropdown from "@/components/varsity/profile/Dropdown";
import Sheet from "@/components/varsity/Sheet";
import { IconX, IconCalendar, IconArrowLeft } from "@/components/icons";
import { averageMetres, averageMinutes } from "@/lib/varsity/boatMileage";
import type { Boat } from "@/lib/varsity/coachLineup";
import { chartTypes, type ChartType } from "@/lib/varsity/athleteStats";
import { fetchLineupsFor } from "@/lib/varsity/lineupStore";
import { crewLabel } from "@/lib/varsity/racePieces";
import { formatDistance, formatDuration, metresToUnit, type Units } from "@/lib/varsity/units";
import {
  TEAM_CUSTOM_RANGE,
  allKeys,
  customTeamRange,
  defaultTeamRange,
  fillBuckets,
  teamBuckets,
  teamMetricByKey,
  teamMetrics,
  teamRangeByKey,
  teamRanges,
  teamReport,
  toIso,
  trainedBuckets,
  windowAverage,
  windowLabel,
  type TeamBucket,
  type TeamRange,
} from "@/lib/varsity/teamStats";

type Dates = { start: string; end: string };

export default function TeamStatsScreen({ onClose }: { onClose: () => void }) {
  const vTheme = useVarsityTheme();
  const { units } = useUnits();
  const now = useMemo(() => new Date(), []);

  const [rangeKey, setRangeKey] = useState(defaultTeamRange);
  /* Two dates the coach chose, or a stretch dragged on the graph. While it is
     set it IS the window. */
  const [custom, setCustom] = useState<Dates | null>(null);
  /* The window before the first zoom, so "Zoom out" undoes however many zooms
     in one press. Picking a window by hand forgets it. */
  const [beforeZoom, setBeforeZoom] = useState<{ rangeKey: string; custom: Dates | null } | null>(null);
  const [metricKey, setMetricKey] = useState(teamMetrics[0].key);
  const [chart, setChart] = useState<ChartType>("bars");
  const [openMenu, setOpenMenu] = useState<"metric" | "range" | "chart" | null>(null);
  const [picking, setPicking] = useState(false);
  /* Practice key → its boats, for every day read so far (an absent key that
     was asked for is stored as [] so it is never asked for again). Null until
     the first read lands. */
  const [lineups, setLineups] = useState<Record<string, Boat[]> | null>(null);
  /* The tapped column — the latest bucket until someone taps. Held with the
     window's label: an index means nothing once the window changes. */
  const [picked, setPicked] = useState<{ window: string; index: number } | null>(null);

  const range: TeamRange = custom ? customTeamRange(custom.start, custom.end) : teamRangeByKey(rangeKey);
  const metric = teamMetricByKey(metricKey);
  const windowId = `${range.key}:${range.start ?? ""}:${range.end ?? ""}`;

  const pickRange = (key: string) => {
    setBeforeZoom(null);
    setCustom(null);
    setRangeKey(key);
  };
  const pickDates = (d: Dates) => {
    setBeforeZoom(null);
    setCustom(d);
  };
  const zoomTo = (start: string, end: string) => {
    if (!beforeZoom) setBeforeZoom({ rangeKey, custom });
    setCustom({ start, end });
  };
  const zoomOut = () => {
    if (!beforeZoom) return;
    setRangeKey(beforeZoom.rangeKey);
    setCustom(beforeZoom.custom);
    setBeforeZoom(null);
  };

  /* The first read: everything the longest built-in window can show. */
  useEffect(() => {
    let active = true;
    fetchLineupsFor(allKeys(now))
      .then((l) => {
        if (!active) return;
        const filled: Record<string, Boat[]> = {};
        for (const k of allKeys(now)) filled[k] = l[k] ?? [];
        setLineups(filled);
      })
      .catch(() => active && setLineups({}));
    return () => {
      active = false;
    };
  }, [now]);

  /* A window reaching outside what has been read fetches only what it lacks. */
  const bare = useMemo(() => teamBuckets(range, now), [range, now]);
  const missing = useMemo(
    () => (lineups ? bare.flatMap((b) => b.dayKeys).filter((k) => !(k in lineups)) : []),
    [bare, lineups],
  );
  useEffect(() => {
    if (!missing.length) return;
    let active = true;
    fetchLineupsFor(missing).then((l) => {
      if (!active) return;
      setLineups((cur) => {
        const next = { ...(cur ?? {}) };
        for (const k of missing) next[k] = l[k] ?? [];
        return next;
      });
    });
    return () => {
      active = false;
    };
  }, [missing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const loading = lineups === null || missing.length > 0;
  const buckets: TeamBucket[] = useMemo(
    () => (lineups ? fillBuckets(range, now, lineups) : []),
    [lineups, range, now],
  );
  const points = buckets.map((b) => ({ label: b.short, value: metric.of(b.mileage), latest: b.latest }));
  const empty = !loading && trainedBuckets(buckets).length === 0;
  const groups = teamReport(buckets, range, units);
  const plotMetric = { label: metric.label(units), format: metric.format };
  const selected =
    picked && picked.window === windowId ? Math.min(picked.index, buckets.length - 1) : buckets.length - 1;
  const readOut = buckets[selected] ?? null;
  const each = range.bucket === "day" ? "day" : "week";
  const rangeOptions = [
    ...teamRanges.map((r) => ({ key: r.key, label: r.label })),
    { key: TEAM_CUSTOM_RANGE, label: "Choose dates…" },
  ];

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
          {beforeZoom && (
            <button
              type="button"
              onClick={zoomOut}
              className="tap44 flex flex-shrink-0 items-center gap-1 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-[12px] font-medium text-text"
            >
              <IconArrowLeft size={13} /> Zoom out
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain pb-[max(2rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto w-full max-w-screen-sm px-3.5">
            {/* ── The three choices, the athlete's own dropdowns. ── */}
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
                options={rangeOptions}
                value={range.key}
                open={openMenu === "range"}
                onOpen={(v) => setOpenMenu(v ? "range" : null)}
                onPick={(k) => {
                  setOpenMenu(null);
                  if (k === TEAM_CUSTOM_RANGE) setPicking(true);
                  else pickRange(k);
                }}
              />
              <Dropdown
                label={chartTypes.find((c) => c.key === chart)?.label ?? "Columns"}
                options={chartTypes.map((c) => ({ key: c.key, label: c.label }))}
                value={chart}
                open={openMenu === "chart"}
                onOpen={(v) => setOpenMenu(v ? "chart" : null)}
                onPick={(k) => {
                  setChart(k as ChartType);
                  setOpenMenu(null);
                }}
              />
            </div>

            {loading ? (
              <p className="py-12 text-center text-[13px] text-muted">Adding up the boats…</p>
            ) : empty ? (
              <p className="px-6 py-12 text-center text-[13px] leading-relaxed text-muted">{metric.empty}</p>
            ) : (
              <>
                {/* THE GRAPH — its number on every column while they fit (the
                    best one alone when they don't), a dashed average across
                    the ones that had training; tap to read out, drag to zoom. */}
                <div className="rounded-2xl border border-border bg-surface p-3">
                  <Plot
                    points={points}
                    metric={plotMetric}
                    units={units}
                    chart={chart}
                    height={190}
                    values="auto"
                    average={windowAverage(buckets, metric)}
                    selected={selected}
                    onSelect={(i) => setPicked({ window: windowId, index: i })}
                    onRangeSelect={(from, to) => {
                      const a = buckets[from];
                      const b = buckets[to];
                      if (!a || !b) return;
                      // One DAY is already as close as the graph goes; a week
                      // (or more) of anything opens up day by day.
                      if (from === to && range.bucket === "day") return setPicked({ window: windowId, index: from });
                      zoomTo(toIso(a.start), toIso(b.end));
                      setPicked(null);
                    }}
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
                  onPick={(i) => setPicked({ window: windowId, index: i })}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {picking && (
        <DatesSheet
          start={range.start ?? toIso(buckets[0]?.start ?? now)}
          end={range.end ?? toIso(now)}
          today={toIso(now)}
          onApply={(d) => {
            pickDates(d);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </ThemeProvider>,
    document.body,
  );
}

/*
  TWO DATES — the window the coach wants, when none of the three built-in ones
  is it ("how did the two weeks before the race go"). The phone's own date
  picker on each field, 16px so nothing zooms.
*/
function DatesSheet({
  start,
  end,
  today,
  onApply,
  onClose,
}: {
  start: string;
  end: string;
  today: string;
  onApply: (d: Dates) => void;
  onClose: () => void;
}) {
  const [a, setA] = useState(start);
  const [b, setB] = useState(end);
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(a) && /^\d{4}-\d{2}-\d{2}$/.test(b);
  const field =
    "w-full rounded-lg border border-border bg-surface px-3 py-2 text-base text-text outline-none focus:border-primary-line";
  return (
    <Sheet title="Choose dates" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">From</span>
          <input type="date" value={a} max={today} onChange={(e) => setA(e.target.value)} className={`${field} mt-1`} />
        </label>
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">To</span>
          <input type="date" value={b} max={today} onChange={(e) => setB(e.target.value)} className={`${field} mt-1`} />
        </label>
      </div>
      <p className="mt-3 text-[12px] text-muted">Up to a month is read day by day; longer is read week by week.</p>
      <button
        type="button"
        disabled={!ok}
        onClick={() => onApply(a <= b ? { start: a, end: b } : { start: b, end: a })}
        className="tap44 mt-4 w-full rounded-full bg-primary px-5 py-2.5 text-[13px] font-semibold text-primary-contrast disabled:opacity-50"
      >
        Show these dates
      </button>
    </Sheet>
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
  had training — never coloured), and the hours. A row with no boats is
  dashes. The row being read out above is marked, and tapping a row reads it
  out. The outings column came off (owner, 2026-09-21).
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

  const cols = "grid-cols-[minmax(0,1.6fr)_3.6rem_3.4rem_4rem]";
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
                  </>
                ) : (
                  <>
                    <span className={`${cell} text-muted`}>—</span>
                    <span className={`${cell} text-muted`}></span>
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

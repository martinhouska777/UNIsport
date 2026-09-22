"use client";

/*
  THE STATISTICS, FULL SCREEN.
  ---------------------------------------------------------------------------
  The profile card is a glance: one graph, three numbers, on half a phone. This
  is the other thing — the whole screen given over to the training, for when an
  athlete actually wants to read it.

  What is here that isn't on the card:
    • the graph at full size, with the best bucket's number printed on it and a
      dashed average across it, so every column is visibly above or below par
    • RECOVERY as a fourth measure (owner, 2026-09-22): how much you slept, how
      tired you were and how sore, as three curves in three colours on the one
      0-10 axis they honestly share, each named beside its colour. The columns,
      the average and the shape dropdown stand down for it — none of them mean
      anything when three things are being read at once.
    • a column you can TAP: a DAY is then read out underneath — every session
      in it, in its colour, with how long and how far (no split). A WEEK column, or a
      stretch you dragged across, is read out as totals instead: how much water,
      erg, weights… (owner, 2026-09-13 — a list of every session in 13–19 Jul
      is noise; what you want is how much you rowed and how long you lifted)
    • DISTANCE first — the total, the water and the erg it is made of, the
      average row — then TIME: in total, in an average week, per day, and on
      each thing, and only then CONSISTENCY: how steady, days trained, and
      with a plan up planned / done / missed / extra (never "against the
      plan"), ending in the days out — sick, injured, away — counted in days.
      How far, how long, how steady: the judgement goes last.
    • the training mix — what all that time actually was, named by what was
      logged (a bike on a flex day is Bike). It reads THE SAME WINDOW as the
      graph (owner, 2026-09-22): picking three months up top lands on these
      bars too, and a stretch you dragged across is the mix of that stretch.
      The pill it briefly carried is gone — the dates are already on the graph.

  DRAG TO ZOOM (owner, 2026-09-13). Drag a thumb or the mouse sideways across
  the graph and it zooms into that stretch — three weeks out of three months
  become those three weeks, day by day. It is simply a window of those dates,
  so EVERYTHING under the graph follows it: the numbers, the groups, and the
  training mix.
  "Zoom out" puts back the window you were on before the first zoom.

  NO CAPTIONS under the numbers (same day: "just do the data"). Every number
  is its label and its value; the grey line under each ("of 12 days", "not
  logged", "per 500 m"…) and the explainer lines are gone.

  The three choices (measure, window, shape) are the SAME three the card has,
  and they are the same dropdowns; changing one here changes it on the card,
  because both read the one saved profile.

  Portalled to <body> and re-wrapped in <ThemeProvider>, like the sheets, so it
  covers the tab bar and keeps the Varsity theme. All colours are theme tokens
  (rule 1); the mix's colours are the calendar's own data colours, inline —
  the documented exception.
*/
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ThemeProvider from "@/components/ThemeProvider";
import { useVarsityTheme } from "@/components/varsity/useVarsityTheme";
import Plot, { type PlotCurve } from "@/components/varsity/profile/Plot";
import { CurveLegend } from "@/components/varsity/profile/CurveLegend";
import Dropdown from "@/components/varsity/profile/Dropdown";
import { IconX, IconCalendar, IconArrowLeft } from "@/components/icons";
import { formatDistance, formatDuration, type Units } from "@/lib/varsity/units";
import type { SessionMap } from "@/lib/varsity/coachPlan";
import {
  chartTypes,
  statMetrics,
  statRanges,
  shortDate,
  CUSTOM_RANGE,
  longSpan,
  type Bucket,
  type ChartType,
  type StatMetric,
  type StatRange,
} from "@/lib/varsity/athleteStats";
import { rowingReport, bucketDetail, type StatTone } from "@/lib/varsity/rowingStats";
import { trainingMix } from "@/lib/varsity/trainingMix";
import TrainingMixList from "@/components/varsity/profile/TrainingMixList";
import { type DaysOut } from "@/lib/varsity/daysOut";
import { type CheckIns, recoveryCurves, hasRecovery } from "@/lib/varsity/checkIn";

/* A word from the data → a theme token. The data never names a colour. */
const toneClass: Record<StatTone, string> = {
  text: "text-text",
  success: "text-success",
  warn: "text-warn",
  muted: "text-muted",
};

/** "Mon 1 Sep", or "1–7 Sep" for a week — the bucket, said out loud. */
function bucketTitle(b: Bucket): string {
  if (b.span.startIso === b.span.endIso) return shortDate(b.span.startIso);
  return `${shortDate(b.span.startIso)} – ${shortDate(b.span.endIso)}`;
}

export default function StatsFullScreen({
  buckets,
  points,
  metric,
  range,
  chart,
  units,
  plan,
  today,
  onMetric,
  onRange,
  onCustomRange,
  onChart,
  onZoom,
  onZoomOut,
  zoomed,
  daysOut,
  checkIns,
  onClose,
}: {
  buckets: Bucket[];
  points: { label: string; value: number; latest: boolean }[];
  metric: StatMetric;
  range: StatRange;
  chart: ChartType;
  units: Units;
  /** The coach's plan — only so "planned / missed / extra" can be counted. */
  plan: SessionMap;
  today: string;
  onMetric: (key: string) => void;
  onRange: (key: string) => void;
  onCustomRange: () => void;
  onChart: (key: string) => void;
  /** Zoom into the dates of a dragged stretch of columns. */
  onZoom: (startIso: string, endIso: string) => void;
  /** Back to the window from before the first zoom. */
  onZoomOut: () => void;
  zoomed: boolean;
  /** The days marked sick / injured / away — shaded on the graph, counted below. */
  daysOut: DaysOut;
  /** The daily check-ins — the Recovery group under the graph. */
  checkIns: CheckIns;
  onClose: () => void;
}) {
  const vTheme = useVarsityTheme();
  const [openMenu, setOpenMenu] = useState<"metric" | "range" | "chart" | null>(null);
  /*
    THE COLUMN BEING READ. It opens on the newest one — the day you just
    trained is the day you came to look at — and any column can be tapped for
    the rest.

    null = no single column: the card reads out the WHOLE window. That is where
    a drag-to-zoom lands, so the stretch you just selected is summed up rather
    than its first day being listed.
  */
  const [selected, setSelected] = useState<number | null>(Math.max(0, buckets.length - 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* A full screen of statistics shouldn't drag the tab behind it. */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // A window that changed under us (a different range) must not leave the
  // selection pointing past the end of the new one.
  const at = selected === null ? null : Math.min(selected, buckets.length - 1);

  /*
    RECOVERY — three curves off the daily check-in rather than one height off
    the logs (owner, 2026-09-22). Built here from the very same buckets, so a
    drag-to-zoom moves the curves with everything else.
  */
  const curves: PlotCurve[] | undefined = metric.curves
    ? recoveryCurves(
        checkIns,
        buckets.map((b) => b.span),
      )
    : undefined;
  const anyData = curves ? hasRecovery(curves) : points.some((p) => p.value > 0);

  /*
    THE DASHED AVERAGE is the average of the buckets that HAVE something in
    them, the same way the card's "Avg week" tile is: padding it with the empty
    weeks before someone joined the squad would draw the line on the floor.
  */
  const active = points.map((p) => p.value).filter((v) => v > 0);
  const average = active.length >= 2 ? active.reduce((a, b) => a + b, 0) / active.length : null;

  const whole = {
    startIso: buckets[0]?.span.startIso ?? today,
    endIso: buckets[buckets.length - 1]?.span.endIso ?? today,
  };
  const allLogs = buckets.flatMap((b) => b.logs);
  const groups = rowingReport(allLogs, plan, whole, units, daysOut, checkIns);
  const shaded = buckets.map((b) =>
    Object.keys(daysOut).some((iso) => iso >= b.span.startIso && iso <= b.span.endIso),
  );
  /* What the card under the graph reads: the tapped column, or the whole window. */
  const current: Bucket | null =
    at !== null
      ? (buckets[at] ?? null)
      : buckets.length > 0
        ? { ...buckets[0], span: whole, logs: allLogs }
        : null;
  const detail = current ? bucketDetail(current.logs, units) : null;
  /*
    THE MIX OF THIS WINDOW. Same logs the graph just plotted, so the bars can
    never disagree with the columns above them, and a drag-to-zoom changes them
    with everything else. The plan is passed in only to name the intensities.
  */
  const mix = trainingMix(allLogs, plan);
  // More than one day in it → totals by kind; one day → the sessions themselves.
  const manyDays = current ? current.span.startIso !== current.span.endIso : false;

  const rangeOptions = [
    ...statRanges.map((r) => ({ key: r.key, label: r.label })),
    { key: CUSTOM_RANGE, label: "Choose dates…" },
  ];

  return createPortal(
    <ThemeProvider tokens={vTheme.dark} light={vTheme.light}>
      <div className="fixed inset-0 z-[60] flex flex-col bg-background [animation:backdrop-in_0.18s_ease-out]">
        {/*
          ── The top of the screen: the way out, and the dates. ──
          The measure's name used to be the title here ("Metres rowed"), with
          the close button beside it. CUT (owner, 2026-09-21): the measure is
          already a dropdown two lines further down, so the title was the same
          word twice and it was taking the only line that mattered. The way out
          goes top right on its own, and the line it frees says what you are
          actually looking at — 8 – 21 September, day by day.
        */}
        <div className="flex-shrink-0 border-b border-border px-3.5 pb-2.5 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <div className="flex items-center justify-end gap-2">
            {zoomed && (
              <button
                type="button"
                onClick={onZoomOut}
                className="tap44 mr-auto flex flex-shrink-0 items-center gap-1 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-[12px] font-medium text-text"
              >
                <IconArrowLeft size={13} /> Zoom out
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close statistics"
              className="tap44 press-icon flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted"
            >
              <IconX size={15} />
            </button>
          </div>
          <div className="flex items-center gap-1.5 truncate text-[13px] font-medium text-text">
            <IconCalendar size={12} />
            {/* The dates only. "· week by week" used to close this line and
                it was a caption on a picture (owner, 2026-09-22): the columns
                are right there, you can see whether they are days or weeks. */}
            {longSpan(whole.startIso, whole.endIso)}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain pb-[max(2rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto w-full max-w-screen-sm px-3.5">
            {/* ── The three choices, all in one row, all the same shape. ── */}
            <div className="flex flex-wrap items-center gap-2 py-3">
              <Dropdown
                label={metric.label}
                options={statMetrics.map((m) => ({ key: m.key, label: m.label }))}
                value={metric.key}
                open={openMenu === "metric"}
                onOpen={(v) => setOpenMenu(v ? "metric" : null)}
                onPick={onMetric}
              />
              <Dropdown
                label={range.label}
                options={rangeOptions}
                value={range.key}
                open={openMenu === "range"}
                onOpen={(v) => setOpenMenu(v ? "range" : null)}
                onPick={(key) => (key === CUSTOM_RANGE ? onCustomRange() : onRange(key))}
              />
              {/* Columns or a line is a choice about ONE series; three curves
                  are three curves. It stands down for Recovery. */}
              {!metric.curves && (
                <Dropdown
                  label={chartTypes.find((c) => c.key === chart)?.label ?? "Columns"}
                  options={chartTypes.map((c) => ({ key: c.key, label: c.label }))}
                  value={chart}
                  open={openMenu === "chart"}
                  onOpen={(v) => setOpenMenu(v ? "chart" : null)}
                  onPick={onChart}
                />
              )}
            </div>

            {/* ── The graph, the whole width of the phone. ── */}
            {anyData ? (
              <div className="rounded-2xl border border-border bg-surface px-1.5 pb-2 pt-2.5">
                <Plot
                  points={points}
                  metric={metric}
                  units={units}
                  chart={chart}
                  height={288}
                  width={360}
                  values="auto"
                  average={metric.axisMax ? null : average}
                  curves={curves}
                  selected={at}
                  onSelect={setSelected}
                  shaded={shaded}
                  onRangeSelect={(from, to) => {
                    const a = buckets[from];
                    const b = buckets[to];
                    if (!a || !b) return;
                    // One DAY is already as close as the graph goes; one week
                    // (or more) of anything opens up day by day.
                    if (from === to && range.bucket === "day") return setSelected(from);
                    onZoom(a.span.startIso, b.span.endIso);
                    setSelected(null);
                  }}
                />
                {curves && <CurveLegend curves={curves} />}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-border bg-surface-2 px-4 py-10 text-center text-[12px] leading-relaxed text-muted">
                {metric.empty}
              </p>
            )}

            {/* ── The column you tapped, read out loud. ── */}
            {current && (
              <div className="mt-2.5 rounded-2xl border border-border bg-surface px-3.5 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px] font-semibold text-text">
                    {bucketTitle(current)}
                  </span>
                  {/* HOW LONG, and on a week how many. The metres used to sit
                      here too, but this line covers the weights and the runs
                      as well as the rowing, so a distance across the top of it
                      was only ever part of the story (owner, 2026-09-13). On
                      ONE DAY the session count goes too (same day): the
                      sessions are listed right under it, so "2 sessions" was
                      counting what you can already see — the day says only
                      its total time. */}
                  <span className="flex-shrink-0 text-[11px] text-muted">
                    {detail && detail.sessions > 0
                      ? [
                          manyDays
                            ? `${detail.sessions} session${detail.sessions === 1 ? "" : "s"}`
                            : null,
                          detail.minutes > 0 ? formatDuration(Math.round(detail.minutes)) : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : "nothing logged"}
                  </span>
                </div>
                {detail && !manyDays && detail.rows.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1.5 border-t border-border pt-2">
                    {/* Each session in its workout's colour — the same dot
                        the calendar and the week totals below use. */}
                    {detail.rows.map((r) => (
                      <div key={r.key} className="flex items-baseline justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2 w-2 flex-shrink-0 rounded-full"
                            style={{ background: r.color }}
                          />
                          <span className="truncate text-[12px] font-medium text-text">{r.title}</span>
                        </span>
                        <span className="flex-shrink-0 text-[11px] text-muted">{r.sub}</span>
                      </div>
                    ))}
                  </div>
                )}
                {detail && manyDays && detail.byCategory.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1.5 border-t border-border pt-2">
                    {detail.byCategory.map((c) => (
                      <div key={c.key} className="flex items-baseline justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2 w-2 flex-shrink-0 rounded-full"
                            style={{ background: c.color }}
                          />
                          <span className="truncate text-[12px] font-medium text-text">{c.label}</span>
                        </span>
                        <span className="flex-shrink-0 text-[11px] text-muted">
                          {[
                            c.metres > 0 ? formatDistance(c.metres, units.distance) : null,
                            c.minutes > 0 ? formatDuration(Math.round(c.minutes)) : null,
                            `${c.sessions}×`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Everything the window contained: how far, how long, how
                steady. The three big tiles (Total / Avg week / Best week) that
                used to sit here are CUT (owner, 2026-09-13) — they were the
                same measure said a third time, and the groups below say it
                over every measure at once rather than only the graph's. ── */}
            {groups.map((g) => (
              <div key={g.key} className="mt-5">
                <div className="pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                  {g.title}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {g.cells.map((c) => (
                    <div
                      key={c.key}
                      className="rounded-xl border border-border bg-surface px-3 py-2.5"
                    >
                      <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">
                        {c.label}
                      </div>
                      <div
                        className={`mt-1 text-[17px] font-semibold leading-none ${toneClass[c.tone ?? "text"]}`}
                      >
                        {c.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* ── What all that training actually was — over the window the
                graph is on, and no pill of its own, because the dates are
                already up there (owner, 2026-09-22). The days that weren't
                training at all (sick, injured, away) sit up in Consistency,
                beside the missed sessions they explain. ── */}
            <div className="mt-5">
              <TrainingMixList rows={mix} heading="Training mix" />
            </div>

          </div>
        </div>
      </div>
    </ThemeProvider>,
    document.body,
  );
}

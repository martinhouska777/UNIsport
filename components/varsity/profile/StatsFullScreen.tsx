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
    • a column you can TAP: the day (or week) is then read out underneath —
      every session in it, with its metres, its time and its split
    • the plan: planned, done, MISSED, and the sessions done on top of it
    • the metres split between the water and the erg, the longest piece, the
      average split per 500 m, the best split, the longest streak
    • the training mix — what all that time actually was

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
import Plot from "@/components/varsity/profile/Plot";
import Dropdown from "@/components/varsity/profile/Dropdown";
import { IconX, IconCalendar } from "@/components/icons";
import { formatDistance, formatDuration, type Units } from "@/lib/varsity/units";
import type { SessionMap } from "@/lib/varsity/coachPlan";
import {
  chartTypes,
  statMetrics,
  statRanges,
  summarise,
  shortDate,
  CUSTOM_RANGE,
  type Bucket,
  type ChartType,
  type StatMetric,
  type StatRange,
} from "@/lib/varsity/athleteStats";
import { rowingReport, bucketDetail, type StatTone } from "@/lib/varsity/rowingStats";
import { trainingMix } from "@/lib/varsity/trainingMix";

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
  onClose: () => void;
}) {
  const vTheme = useVarsityTheme();
  const [openMenu, setOpenMenu] = useState<"metric" | "range" | "chart" | null>(null);
  /*
    THE COLUMN BEING READ. It opens on the newest one — the day you just
    trained is the day you came to look at — and any column can be tapped for
    the rest.
  */
  const [selected, setSelected] = useState<number>(Math.max(0, buckets.length - 1));

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
  const at = Math.min(selected, buckets.length - 1);
  const current = buckets[at];

  const anyData = points.some((p) => p.value > 0);
  const tiles = summarise(buckets, metric, units, range);

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
  const groups = rowingReport(allLogs, plan, whole, units);
  const mix = trainingMix(allLogs, plan);
  const detail = current ? bucketDetail(current.logs, units) : null;

  const rangeOptions = [
    ...statRanges.map((r) => ({ key: r.key, label: r.label })),
    { key: CUSTOM_RANGE, label: "Choose dates…" },
  ];

  return createPortal(
    <ThemeProvider tokens={vTheme.dark} light={vTheme.light}>
      <div className="fixed inset-0 z-[60] flex flex-col bg-background [animation:backdrop-in_0.18s_ease-out]">
        {/* ── The bar. What you are looking at, and the way out. ── */}
        <div className="flex flex-shrink-0 items-center gap-3 border-b border-border px-3 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close statistics"
            className="tap44 press-icon flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted"
          >
            <IconX size={15} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold leading-tight text-text">
              {metric.label}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-muted">
              <IconCalendar size={11} />
              {shortDate(whole.startIso)} – {shortDate(whole.endIso)} ·{" "}
              {range.bucket === "day" ? "day by day" : "week by week"}
            </div>
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
              <Dropdown
                label={chartTypes.find((c) => c.key === chart)?.label ?? "Columns"}
                options={chartTypes.map((c) => ({ key: c.key, label: c.label }))}
                value={chart}
                open={openMenu === "chart"}
                onOpen={(v) => setOpenMenu(v ? "chart" : null)}
                onPick={onChart}
              />
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
                  selected={at}
                  onSelect={setSelected}
                />
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
                  <span className="flex-shrink-0 text-[11px] text-muted">
                    {detail && detail.sessions > 0
                      ? [
                          `${detail.sessions} session${detail.sessions === 1 ? "" : "s"}`,
                          detail.metres > 0 ? formatDistance(detail.metres, units.distance) : null,
                          detail.minutes > 0 ? formatDuration(Math.round(detail.minutes)) : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : "nothing logged"}
                  </span>
                </div>
                {detail && detail.rows.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1.5 border-t border-border pt-2">
                    {detail.rows.map((r) => (
                      <div key={r.key} className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-[12px] text-text">{r.title}</span>
                        <span className="flex-shrink-0 text-[11px] text-muted">{r.sub}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 text-[10px] text-muted">
                  Tap any column to read that {range.bucket === "day" ? "day" : "week"}.
                </div>
              </div>
            )}

            {/* ── The measure's own three numbers, the card's exactly. ── */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {tiles.map((t) => (
                <div
                  key={t.label}
                  className="rounded-xl border border-border bg-surface px-2 py-3 text-center"
                >
                  <div
                    className={`${t.value.length > 6 ? "text-[15px]" : "text-[18px]"} font-semibold leading-none text-text`}
                  >
                    {t.value}
                  </div>
                  <div className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted">
                    {t.label}
                  </div>
                  <div className="mt-0.5 truncate text-[9px] text-muted">{t.sub}</div>
                </div>
              ))}
            </div>

            {/* ── Everything else the window contained. ── */}
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
                      {c.sub && <div className="mt-1 truncate text-[10px] text-muted">{c.sub}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* ── What all that training actually was. ── */}
            {mix.length > 0 && (
              <div className="mt-5">
                <div className="pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Training mix
                </div>
                <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-surface px-3.5 py-3.5">
                  {mix.map((r) => (
                    <div key={r.key}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                            style={{ background: r.color }}
                          />
                          <span className="truncate text-[13px] font-medium text-text">
                            {r.label}
                          </span>
                        </span>
                        <span className="flex-shrink-0 text-[12px] font-semibold text-text">
                          {r.share}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${r.share}%`, background: r.color }}
                        />
                      </div>
                      <div className="mt-1 text-[10px] text-muted">
                        {r.sessions} session{r.sessions === 1 ? "" : "s"}
                        {r.minutes > 0 && <> · {formatDuration(Math.round(r.minutes))}</>}
                        {r.metres > 0 && <> · {formatDistance(r.metres, units.distance)}</>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-5 text-center text-[10px] leading-relaxed text-muted">
              Everything here comes from your own logs over{" "}
              {shortDate(whole.startIso)} – {shortDate(whole.endIso)}.
            </p>
          </div>
        </div>
      </div>
    </ThemeProvider>,
    document.body,
  );
}

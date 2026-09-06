"use client";

/*
  THE GRAPH ITSELF — drawn once, used at two sizes.
  ---------------------------------------------------------------------------
  Whatever measure the athlete picked (metres, hours, consistency) over whatever
  window they picked, as columns or as a line. One point per bucket: a day each
  for the short windows, a week each for the long ones.

  Two sizes, one drawing:
    • on the profile card — small, quiet, no numbers on the columns
    • full screen        — big type, every column named that has room for it,
                           the best one called out with its number, a dashed
                           average to measure the rest against, and a column
                           you can tap to read that day out loud.

  Everything is one SVG on a viewBox, so it stretches to whatever width it is
  given and stays sharp. All colours are theme tokens (rule 1).
*/
import type { StatMetric } from "@/lib/varsity/athleteStats";
import type { Units } from "@/lib/varsity/units";
import type { ChartType } from "@/lib/varsity/athleteStats";

export type PlotPoint = { label: string; value: number; latest: boolean };

/** How much the columns are allowed to say about themselves. */
export type PlotValues = "none" | "peak" | "auto";

/*
  A TOP FOR THE Y AXIS a person would say out loud — 20 km, not 17.4.

  The steps are deliberately fine. Rounding a 20.6 km best day up to a round 50
  spent half the graph on empty sky and squashed every column into the bottom
  third; 25 keeps the same honest scale and gives the columns the card back. The
  halfway gridline is always half of these, which is why they are all numbers
  that halve cleanly.
*/
const NICE_STEPS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(v));
  const scaled = v / pow;
  const step = NICE_STEPS.find((s) => scaled <= s) ?? 10;
  return step * pow;
}

/* Zero is just "0" — "0.0 km" is three characters of nothing. */
const axisLabel = (v: number, metric: StatMetric, units: Units) =>
  v <= 0 ? "0" : metric.format(v, units);

/* SVG has no idea how wide a string is, so we estimate. The system UI font at
   weight 600 runs at roughly 0.58 of its size per character. */
const textW = (s: string, fs: number) => s.length * fs * 0.58;

/*
  A NUMBER IN A ROUNDED CHIP, sitting above a column. It carries its own
  background, so the best week's "18.4 km" stays readable over whatever it
  crosses, and it is clamped to the plot so a peak at either end doesn't push
  its own label off the edge of the graph.
*/
function ValueChip({
  x,
  y,
  text,
  fs,
  min,
  max,
}: {
  /** Where the column is; the chip centres on it, then gets clamped. */
  x: number;
  y: number;
  text: string;
  fs: number;
  min: number;
  max: number;
}) {
  const w = textW(text, fs) + 9;
  const h = fs + 7;
  const left = Math.min(Math.max(x - w / 2, min), max - w);
  const top = Math.max(y - h, 1);
  return (
    <g>
      <rect
        x={left}
        y={top}
        width={w}
        height={h}
        rx={h / 2}
        fill="var(--surface-2)"
        stroke="var(--border)"
        strokeWidth={0.75}
      />
      <text
        x={left + w / 2}
        y={top + h / 2 + fs * 0.36}
        textAnchor="middle"
        fill="var(--text)"
        fontSize={fs}
        fontWeight={700}
      >
        {text}
      </text>
    </g>
  );
}

export default function Plot({
  points,
  metric,
  units,
  chart,
  height,
  width = 320,
  values = "none",
  average = null,
  selected = null,
  onSelect,
}: {
  points: PlotPoint[];
  metric: StatMetric;
  units: Units;
  chart: ChartType;
  height: number;
  /** viewBox width — a wider box on the big screen means finer type, not bigger. */
  width?: number;
  values?: PlotValues;
  /** A dashed line to measure the columns against. Null draws none. */
  average?: number | null;
  /** Which bucket is being read out below the graph. */
  selected?: number | null;
  /** Given, every column becomes a tap target. */
  onSelect?: (index: number) => void;
}) {
  /*
    THE TOP OF THE AXIS. A percentage is always drawn against a full 100, or a
    consistent 40% week would fill the card and read like a good one. Everything
    else scales to its own best bucket, rounded UP to something a person would
    say out loud, so the top gridline is a number and not 15.7.
  */
  const peak = Math.max(1, ...points.map((p) => p.value));
  const max = metric.axisMax ?? niceCeil(peak);
  const peakIndex = points.reduce((best, p, i) => (p.value > points[best].value ? i : best), 0);
  const hasPeak = points[peakIndex]?.value > 0;

  // SVG geometry (a viewBox that stretches to whatever width it is given).
  const W = width;
  const H = height;
  const padX = 10;
  // Room over the tallest column for its own number, when numbers are shown.
  const padT = values === "none" ? 12 : 24;
  const padB = 22; // the row of dates under the floor
  // Type scales with the card, so the big one is genuinely bigger and not just
  // taller.
  const fs = H >= 240 ? 10 : H >= 200 ? 9 : 7.5;
  // Room down the left for the axis labels — they sit outside the plot so the
  // chart never starts underneath its own numbers, and "20.0 km" at the bigger
  // type needs more of it than the same words on the card.
  const padL = fs >= 9 ? 44 : 34;
  const plotW = W - padL - padX;
  const plotH = H - padT - padB;
  const baseline = padT + plotH;
  const n = points.length;
  // A bucket owns a slot and sits in the middle of it — the same x whether it
  // is drawn as a column or as a point on a line, so switching shape never
  // moves a day sideways.
  const slot = plotW / n;
  const barW = Math.min(26, slot * 0.66);
  const cx = (i: number) => padL + slot * (i + 0.5);
  const yOf = (v: number) => baseline - plotH * (Math.min(v, max) / max);

  const line = points.map((p, i) => `${cx(i)},${yOf(p.value)}`).join(" ");
  const area = `M ${cx(0)},${baseline} L ${line.replaceAll(" ", " L ")} L ${cx(n - 1)},${baseline} Z`;

  /*
    HOW MANY DATES FIT. Twenty-eight days at card size run into each other, so
    only every second (or third) one is named — but the newest bucket and the
    one being read are always named, because those are the two you are looking
    for. The maths is the label's own width against the slot it has.
  */
  const widestLabel = Math.max(...points.map((p) => textW(p.label, fs)), 0);
  const labelStep = Math.max(1, Math.ceil((widestLabel + 4) / Math.max(slot, 1)));

  /*
    WHETHER EVERY COLUMN CAN CARRY ITS OWN NUMBER. "12.4 km" over a 10-wide slot
    is four columns of overlap, so the widest number decides for all of them —
    and when they don't fit, only the best one speaks, in a chip that stays
    readable over whatever it crosses.
  */
  const widest = Math.max(
    ...points.filter((p) => p.value > 0).map((p) => textW(metric.format(p.value, units), fs)),
    0,
  );
  const allValues = values === "auto" && widest > 0 && widest + 4 <= slot;
  /*
    The chip needs room ABOVE the column it names. A best bucket that already
    reaches the ceiling — every consistency chart with one perfect day in it —
    has none, and a chip pressed against the top gridline reads as a label for
    the axis rather than for the column. So it simply doesn't speak up there:
    a column at the top of the scale is its own message.
  */
  const peakRoom = hasPeak && points[peakIndex].value < max * 0.9;
  const peakOnly = values !== "none" && !allValues && peakRoom;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      className="block text-primary"
      role="img"
      aria-label={`${metric.label} by ${n} buckets`}
    >
      {/*
        THE Y AXIS — three gridlines (top, middle, zero) and what each is worth,
        so a height is a number instead of a feeling. Only three: a ladder of
        them would out-shout the chart they exist to explain.
      */}
      {[1, 0.5, 0].map((frac) => {
        const gy = baseline - plotH * frac;
        return (
          <g key={frac}>
            <line
              x1={padL}
              y1={gy}
              x2={W - padX}
              y2={gy}
              stroke="var(--border)"
              strokeWidth={1}
              /* The zero line is the floor, the two above it are guides. */
              strokeDasharray={frac === 0 ? undefined : "2 3"}
            />
            <text x={padL - 4} y={gy + fs / 3} textAnchor="end" fill="var(--muted)" fontSize={fs}>
              {axisLabel(max * frac, metric, units)}
            </text>
          </g>
        );
      })}

      {/* THE BUCKET BEING READ — a band behind it, so the detail underneath
          the graph is visibly about THIS column. */}
      {selected != null && selected >= 0 && selected < n && (
        <rect
          x={cx(selected) - slot / 2}
          y={padT - 4}
          width={slot}
          height={plotH + 4}
          rx={3}
          fill="var(--text)"
          fillOpacity={0.07}
        />
      )}

      {/* THE LINE — one soft fill under one stroke, drawn before the labels so
          nothing it crosses is lost underneath it. */}
      {chart === "line" && (
        <>
          <path d={area} fill="var(--primary)" fillOpacity={0.12} />
          <polyline
            points={line}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </>
      )}

      {points.map((p, i) => {
        // Counted back from the newest bucket, so the one on the right — the one
        // everybody looks at first — is always named.
        const named = (n - 1 - i) % labelStep === 0 || p.latest || i === selected;
        const isSelected = i === selected;
        return (
          <g key={i}>
            {/* THE COLUMNS. An empty bucket draws nothing — the floor already
                says nothing happened, and a stub would read as a little bit of
                something. */}
            {chart === "bars" && p.value > 0 && (
              <rect
                x={cx(i) - barW / 2}
                y={yOf(p.value)}
                width={barW}
                height={Math.max(baseline - yOf(p.value), 1)}
                rx={Math.min(3, barW / 2)}
                fill="var(--primary)"
                /* The newest bucket — and the one you tapped — are the ones you
                   came to look at. */
                fillOpacity={p.latest || isSelected ? 1 : 0.45}
              />
            )}
            {chart === "line" && (
              <circle
                cx={cx(i)}
                cy={yOf(p.value)}
                r={p.latest || isSelected ? 3.5 : 2.5}
                fill={p.latest || isSelected ? "var(--primary)" : "var(--surface)"}
                stroke="currentColor"
                strokeWidth={1.5}
              />
            )}
            {allValues && p.value > 0 && (
              <text
                x={cx(i)}
                y={yOf(p.value) - 5}
                textAnchor="middle"
                fill="var(--text)"
                fontSize={fs}
                fontWeight={600}
              >
                {metric.format(p.value, units)}
              </text>
            )}
            {named && (
              <text
                x={cx(i)}
                y={baseline + fs + 6}
                textAnchor="middle"
                fill={isSelected ? "var(--text)" : "var(--muted)"}
                fontSize={fs}
                fontWeight={p.latest || isSelected ? 600 : 400}
              >
                {p.label}
              </text>
            )}
          </g>
        );
      })}

      {/* THE AVERAGE — one dashed line the whole width of the plot. Every column
          is then either above it or below it, which is the whole point. */}
      {average != null && average > 0 && (
        <>
          <line
            x1={padL}
            y1={yOf(average)}
            x2={W - padX}
            y2={yOf(average)}
            stroke="var(--accent)"
            strokeWidth={1.25}
            strokeDasharray="5 4"
          />
          <text
            x={W - padX - 2}
            y={yOf(average) - 4}
            textAnchor="end"
            fill="var(--accent)"
            fontSize={fs * 0.9}
            fontWeight={600}
          >
            avg {metric.format(average, units)}
          </text>
        </>
      )}

      {/* THE PEAK, named. When every column already carries its number this
          would be a second copy, so it only speaks when they don't. */}
      {peakOnly && (
        <ValueChip
          x={cx(peakIndex)}
          y={yOf(points[peakIndex].value) - 4}
          text={metric.format(points[peakIndex].value, units)}
          fs={fs}
          min={padL}
          max={W - padX}
        />
      )}

      {/* THE TAP TARGETS — one invisible full-height slot per bucket, drawn last
          so nothing sits on top of them. A whole column is a far easier thing to
          hit than a 6px-wide bar. */}
      {onSelect &&
        points.map((p, i) => (
          <rect
            key={`hit-${i}`}
            x={cx(i) - slot / 2}
            y={padT - 4}
            width={slot}
            height={plotH + padB}
            fill="transparent"
            className="cursor-pointer"
            onClick={() => onSelect(i)}
          />
        ))}
    </svg>
  );
}

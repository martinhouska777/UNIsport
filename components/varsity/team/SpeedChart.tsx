"use client";

/*
  SPEED CHART — how a piece was rowed, stroke-segment by segment.
  ---------------------------------------------------------------------------
  Two panels over one distance axis, drawn from a piece's segments (100 m of a
  race, 5-second bits of a burst):

    BOAT SPEED — a line, in SPLIT (the number a rower reads) with faster UP,
                 the average dashed across, the fastest segment marked green
                 and the slowest red, and the coarser bands (the 500 m splits)
                 shaded alternately with their split written along the top.
    RATE       — a shorter panel below, same x-axis, its average dashed.

  Touch or drag across either panel to SCRUB: the segment under your finger
  is highlighted in both panels and its numbers appear in the readout row
  above (which otherwise shows the summary: total, average, fastest, peak
  rate). A second piece can be laid over as a dashed line for comparison
  (`compare`) — the same race last year, the 1st against the 2nd 1500.

  Why split and not m/s on the axis: coaches and rowers say "1:26", not
  "5.81". The readout gives both. Why one distance axis for time-based
  segments too: a 5-second burst still covered metres, and metres is what the
  two panels have in common.

  Pure SVG, no library; sized to its container by viewBox. All colours are
  theme tokens (speed in the primary, rate in the accent, marks in success /
  danger).
*/
import { useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  bandsFrom,
  fmtSplit,
  segmentEnds,
  segmentSpeed,
  type PieceSegment,
  type TelemetryPiece,
} from "@/lib/varsity/telemetry";

const W = 360;
const PAD_L = 40;
const PAD_R = 12;
const TOP = 22; // room for the band labels
const H_SPEED = 150;
const GAP = 14;
const H_RATE = 78;
const H = TOP + H_SPEED + GAP + H_RATE + 20;

/** Nice split ticks (every 2 s) covering [lo, hi] seconds. */
function splitTicks(lo: number, hi: number): number[] {
  const step = hi - lo > 12 ? 4 : 2;
  const start = Math.ceil(lo / step) * step;
  const out: number[] = [];
  for (let v = start; v <= hi + 1e-6; v += step) out.push(v);
  return out;
}

export default function SpeedChart({
  piece,
  compare,
  compareLabel,
}: {
  piece: TelemetryPiece;
  compare?: TelemetryPiece | null;
  compareLabel?: string;
}) {
  const segs = useMemo(() => piece.segments ?? [], [piece]);
  const [hover, setHover] = useState<number | null>(null);

  const model = useMemo(() => {
    const ends = segmentEnds(segs);
    const total = ends[ends.length - 1] ?? 0;
    const splits = segs.map((g) => g.splitSec);
    const rates = segs.map((g) => g.rating);
    const known = splits.filter((v): v is number => v != null);
    const knownR = rates.filter((v): v is number => v != null);
    // y-range for split: pad a little; the compare piece widens it if needed
    const cmp = compare?.segments ?? [];
    const cmpSplits = cmp.map((g) => g.splitSec).filter((v): v is number => v != null);
    const all = [...known, ...cmpSplits];
    const lo = all.length ? Math.min(...all) : 80;
    const hi = all.length ? Math.max(...all) : 100;
    const padS = Math.max(1, (hi - lo) * 0.15);
    const sMin = lo - padS;
    const sMax = hi + padS;
    const rLo = knownR.length ? Math.min(...knownR) : 20;
    const rHi = knownR.length ? Math.max(...knownR) : 40;
    const padR = Math.max(1, (rHi - rLo) * 0.2);
    const rMin = rLo - padR;
    const rMax = rHi + padR;

    // The piece's own stated averages when it has them (the source computed
    // those from the full trace); else time-weighted over the segments.
    const totalSec = segs.reduce((t, g) => t + g.durationSec, 0);
    const avgSplit =
      piece.splitSec ?? (total > 0 && totalSec > 0 ? (totalSec / total) * 500 : null);
    const avgRate =
      piece.rating ??
      (knownR.length ? segs.reduce((t, g) => t + (g.rating ?? 0) * g.durationSec, 0) / totalSec : null);

    let fastest = -1;
    let slowest = -1;
    splits.forEach((v, i) => {
      if (v == null) return;
      if (fastest < 0 || v < (splits[fastest] as number)) fastest = i;
      if (slowest < 0 || v > (splits[slowest] as number)) slowest = i;
    });
    let peakRate = -1;
    rates.forEach((v, i) => {
      if (v == null) return;
      if (peakRate < 0 || v > (rates[peakRate] as number)) peakRate = i;
    });

    // bands: the source's coarser splits, else 500 m — but only when a band
    // groups several segments; on a short burst they would just repeat the
    // segments and are left out.
    const derived = piece.splits?.length ? piece.splits : bandsFrom(segs, 500);
    const bands: PieceSegment[] = derived.length >= 2 && segs.length >= derived.length * 2 ? derived : [];
    const bandEnds = segmentEnds(bands);

    const x = (m: number) => PAD_L + (total > 0 ? (m / total) * (W - PAD_L - PAD_R) : 0);
    // faster (smaller split) is UP
    const ySplit = (s: number) => TOP + ((s - sMin) / (sMax - sMin)) * H_SPEED;
    const yRate = (r: number) => TOP + H_SPEED + GAP + (1 - (r - rMin) / (rMax - rMin)) * H_RATE;

    // points at the segment MIDPOINTS
    const mids = ends.map((e, i) => e - segs[i].metres / 2);
    const pathOf = (list: PieceSegment[], key: "splitSec" | "rating") => {
      const e2 = segmentEnds(list);
      let d = "";
      list.forEach((g, i) => {
        const v = g[key];
        if (v == null) return;
        const px = x(e2[i] - g.metres / 2);
        const py = key === "splitSec" ? ySplit(v) : yRate(v);
        d += `${d ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`;
      });
      return d;
    };

    return {
      ends,
      total,
      mids,
      splits,
      rates,
      sMin,
      sMax,
      rMin,
      rMax,
      avgSplit,
      avgRate,
      fastest,
      slowest,
      peakRate,
      bands,
      bandEnds,
      x,
      ySplit,
      yRate,
      speedPath: pathOf(segs, "splitSec"),
      ratePath: pathOf(segs, "rating"),
      cmpSpeedPath: cmp.length ? pathOf(cmp, "splitSec") : "",
      cmpRatePath: cmp.length ? pathOf(cmp, "rating") : "",
      cmpTotal: cmp.length ? segmentEnds(cmp)[cmp.length - 1] : 0,
    };
  }, [segs, compare, piece.splits, piece.splitSec, piece.rating]);

  if (segs.length < 2) return null;

  const m = model;
  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const metres = ((px - PAD_L) / (W - PAD_L - PAD_R)) * m.total;
    if (metres < 0 || metres > m.total) return setHover(null);
    const i = m.ends.findIndex((end) => metres <= end);
    setHover(i < 0 ? segs.length - 1 : i);
  };

  const h = hover;
  const seg = h != null ? segs[h] : null;
  const segStart = h != null ? m.ends[h] - segs[h].metres : 0;
  const speedOf = (g: PieceSegment | null) => (g ? segmentSpeed(g) : null);

  return (
    <div>
      {/* the readout: the segment under your finger, else the summary */}
      <div className="mb-1.5 flex min-h-[34px] items-center justify-between gap-2 px-0.5 text-[11px] tabular-nums">
        {seg && h != null ? (
          <>
            <span className="text-muted">
              <span className="font-semibold text-text">
                {Math.round(segStart)}–{Math.round(m.ends[h])} m
              </span>
              {" · "}
              {seg.durationSec.toFixed(1)}s
            </span>
            <span className="flex items-center gap-2.5">
              <span className="font-semibold text-primary">
                {fmtSplit(seg.splitSec)}
                <span className="ml-1 font-normal text-muted">
                  {speedOf(seg) != null ? `${speedOf(seg)!.toFixed(2)} m/s` : ""}
                </span>
              </span>
              {seg.rating != null && <span className="font-semibold text-accent">r{seg.rating.toFixed(1)}</span>}
            </span>
          </>
        ) : (
          <>
            <span className="text-muted">
              avg <span className="font-semibold text-text">{fmtSplit(m.avgSplit)}</span>
              {m.avgRate != null && (
                <>
                  {" · "}r<span className="font-semibold text-text">{m.avgRate.toFixed(1)}</span>
                </>
              )}
            </span>
            <span className="text-muted">
              {m.fastest >= 0 && (
                <>
                  fastest <span className="font-semibold text-success">{fmtSplit(m.splits[m.fastest])}</span> @{" "}
                  {Math.round(m.ends[m.fastest])} m
                </>
              )}
              {m.peakRate >= 0 && (
                <>
                  {" · "}peak <span className="font-semibold text-accent">r{m.rates[m.peakRate]!.toFixed(1)}</span>
                </>
              )}
            </span>
          </>
        )}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full touch-none select-none"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`Boat speed and rate through ${piece.name}`}
      >
        {/* bands: the coarser splits, alternately shaded, labelled along the top */}
        {m.bands.map((b, i) => {
          const x0 = m.x(m.bandEnds[i] - b.metres);
          const x1 = m.x(m.bandEnds[i]);
          return (
            <g key={i}>
              {i % 2 === 1 && (
                <rect x={x0} y={TOP} width={x1 - x0} height={H_SPEED + GAP + H_RATE} className="fill-surface-2" />
              )}
              <text
                x={(x0 + x1) / 2}
                y={TOP - 8}
                textAnchor="middle"
                className="fill-muted"
                style={{ fontSize: 10, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}
              >
                {fmtSplit(b.splitSec)}
              </text>
            </g>
          );
        })}

        {/* speed panel: grid + split ticks (faster up) */}
        {splitTicks(m.sMin, m.sMax).map((t) => (
          <g key={`s${t}`}>
            <line x1={PAD_L} x2={W - PAD_R} y1={m.ySplit(t)} y2={m.ySplit(t)} className="stroke-border" strokeWidth={1} strokeDasharray="2 3" />
            <text x={PAD_L - 5} y={m.ySplit(t) + 3} textAnchor="end" className="fill-muted" style={{ fontSize: 9, fontVariantNumeric: "tabular-nums" }}>
              {fmtSplit(t).replace(/\.\d$/, "")}
            </text>
          </g>
        ))}
        {m.avgSplit != null && (
          <line x1={PAD_L} x2={W - PAD_R} y1={m.ySplit(m.avgSplit)} y2={m.ySplit(m.avgSplit)} className="stroke-primary" strokeWidth={1} strokeDasharray="4 3" opacity={0.6} />
        )}
        {/* the hovered segment, in both panels */}
        {h != null && (
          <rect
            x={m.x(segStart)}
            y={TOP}
            width={m.x(m.ends[h]) - m.x(segStart)}
            height={H_SPEED + GAP + H_RATE}
            className="fill-primary"
            opacity={0.12}
          />
        )}
        {m.cmpSpeedPath && (
          <path d={m.cmpSpeedPath} fill="none" className="stroke-text" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.45} />
        )}
        <path d={m.speedPath} fill="none" className="stroke-primary" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {segs.map((g, i) =>
          g.splitSec == null ? null : (
            <circle
              key={i}
              cx={m.x(m.mids[i])}
              cy={m.ySplit(g.splitSec)}
              r={i === m.fastest || i === m.slowest ? 3.5 : i === h ? 3 : 1.8}
              className={i === m.fastest ? "fill-success" : i === m.slowest ? "fill-danger" : "fill-primary"}
            />
          ),
        )}

        {/* rate panel */}
        <text x={PAD_L - 5} y={TOP + H_SPEED + GAP + 3} textAnchor="end" className="fill-muted" style={{ fontSize: 9 }}>
          {Math.round(m.rMax)}
        </text>
        <text x={PAD_L - 5} y={TOP + H_SPEED + GAP + H_RATE + 3} textAnchor="end" className="fill-muted" style={{ fontSize: 9 }}>
          {Math.round(m.rMin)}
        </text>
        <line x1={PAD_L} x2={W - PAD_R} y1={TOP + H_SPEED + GAP} y2={TOP + H_SPEED + GAP} className="stroke-border" strokeWidth={1} />
        {m.avgRate != null && (
          <line x1={PAD_L} x2={W - PAD_R} y1={m.yRate(m.avgRate)} y2={m.yRate(m.avgRate)} className="stroke-accent" strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />
        )}
        {m.cmpRatePath && (
          <path d={m.cmpRatePath} fill="none" className="stroke-text" strokeWidth={1.2} strokeDasharray="4 3" opacity={0.45} />
        )}
        <path d={m.ratePath} fill="none" className="stroke-accent" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
        {h != null && segs[h].rating != null && (
          <circle cx={m.x(m.mids[h])} cy={m.yRate(segs[h].rating!)} r={3} className="fill-accent" />
        )}

        {/* x axis: metres — at the band edges, or just the end */}
        {(m.bandEnds.length ? m.bandEnds : [m.total]).map((e, i, arr) => (
          <text key={i} x={m.x(e)} y={H - 6} textAnchor={i === arr.length - 1 ? "end" : "middle"} className="fill-muted" style={{ fontSize: 9, fontVariantNumeric: "tabular-nums" }}>
            {Math.round(e)} m
          </text>
        ))}
        <text x={PAD_L} y={H - 6} textAnchor="start" className="fill-muted" style={{ fontSize: 9 }}>
          0
        </text>
      </svg>

      <div className="mt-1 flex items-center gap-3 px-0.5 text-[10px] text-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block h-[2px] w-3 rounded bg-primary" /> split, faster up
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-[2px] w-3 rounded bg-accent" /> rate
        </span>
        {compare && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-0 w-3 border-t border-dashed border-text opacity-60" /> {compareLabel ?? compare.name}
          </span>
        )}
        <span className="ml-auto">touch to read a segment</span>
      </div>
    </div>
  );
}

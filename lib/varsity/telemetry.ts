/*
  BOAT TELEMETRY — what an outing measured, as the app holds it.
  ---------------------------------------------------------------------------
  The squad rows with Peach PowerLine (gate force + angle at every seat, boat
  speed) and NK SpeedCoach (boat speed, rate, distance). Whatever the source,
  an OUTING lands here as one record: which session it belongs to, which crew,
  and its PIECES — the same pieces PowerLine's left-hand panel lists (a paddle,
  a burst, a 1500) — each with the boat's numbers and, when the source knows
  seats, every seat's numbers.

  Only SUMMARY numbers live here — the ones the coach reads off the PowerLine
  "Average" panel. Raw traces (force at 50 Hz) stay in the exported file, which
  the import keeps in storage; the app never re-derives what PowerLine already
  computed. Nothing in this file talks to a server: see telemetryStore.ts.

  Units are the source's: speed m/s, rating strokes/min, power W, angles in
  degrees (gate angle: negative at the catch, positive at the finish), split
  as seconds per 500 m.
*/

export type TelemetrySource = "peach" | "speedcoach";

/* One seat, averaged over a piece — the row of PowerLine's "Average" table
   plus its bar in the "Average power" panel. */
export type SeatStats = {
  seat: number; // 1 = bow … 8 = stroke
  side: "S" | "P"; // starboard / port, as rigged
  name: string | null; // the crew name PowerLine carried, if any
  watts: number | null;
  catchAngle: number | null; // min gate angle, e.g. −59.3
  finishAngle: number | null; // max gate angle, e.g. +32.6
  length: number | null; // total arc, degrees
  effective: number | null; // effective length, degrees
  slip: number | null; // "catch" in the table: degrees lost at the catch
  wash: number | null; // "finish": degrees lost at the finish
};

/* A stretch inside a piece — PowerLine's 5-second bursts, or 400 m chunks. */
export type PieceSegment = {
  durationSec: number;
  metres: number;
  rating: number | null;
  splitSec: number | null;
};

export type TelemetryPiece = {
  id: string;
  name: string; // as named in the source: "paddle", "burst_1", "1st 1500"
  durationSec: number;
  metres: number;
  rating: number | null; // strokes per minute
  splitSec: number | null; // seconds per 500 m
  boat?: {
    speed: number | null; // m/s
    rating: number | null;
    power: number | null; // average W across the crew
    distPerStroke: number | null; // m
  };
  seats?: SeatStats[];
  /* The finest breakdown the source listed — 100 m of a race, 5-second bits
     of a burst — in order. This is what the speed chart is drawn from. */
  segments?: PieceSegment[];
  /* A coarser breakdown listed alongside (the 500 m splits of a 2K), used to
     band and label the chart. Optional; the chart derives bands from the
     segments when it is missing. */
  splits?: PieceSegment[];
};

/* ── Derived from segments ──────────────────────────────────────────────── */

/** Boat speed in m/s for a segment: from its split when it has one (what the
    coach reads), else metres over time. */
export function segmentSpeed(g: PieceSegment): number | null {
  if (g.splitSec != null && g.splitSec > 0) return 500 / g.splitSec;
  if (g.durationSec > 0 && g.metres > 0) return g.metres / g.durationSec;
  return null;
}

/** Cumulative metres at the END of each segment. */
export function segmentEnds(segments: PieceSegment[]): number[] {
  let m = 0;
  return segments.map((g) => (m += g.metres));
}

/** Group segments into bands of ~`every` metres and average each band's
    split by time over distance — the 500 m splits when the source did not
    list them itself. */
export function bandsFrom(segments: PieceSegment[], every: number): PieceSegment[] {
  const out: PieceSegment[] = [];
  let acc = { durationSec: 0, metres: 0, rateNum: 0, rateN: 0 };
  const flush = () => {
    if (acc.metres <= 0) return;
    out.push({
      durationSec: acc.durationSec,
      metres: acc.metres,
      rating: acc.rateN ? acc.rateNum / acc.rateN : null,
      splitSec: (acc.durationSec / acc.metres) * 500,
    });
    acc = { durationSec: 0, metres: 0, rateNum: 0, rateN: 0 };
  };
  for (const g of segments) {
    acc.durationSec += g.durationSec;
    acc.metres += g.metres;
    if (g.rating != null) {
      acc.rateNum += g.rating;
      acc.rateN += 1;
    }
    if (acc.metres >= every - 1e-6) flush();
  }
  flush();
  return out;
}

export type TelemetryOuting = {
  id: string;
  /* The plan session it belongs to (coachPlan sessionKey: "2026-4-15-AM"). */
  dayKey: string;
  source: TelemetrySource;
  crew: string; // "1V", "2V", "the eight" — how the coach names the boat
  /* The source's own identifiers, so a coach can find the file again. */
  box?: string;
  sessionNo?: string;
  file?: string;
  pieces: TelemetryPiece[];
};

/* ── Formatting ─────────────────────────────────────────────────────────── */

export function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}

export function fmtSplit(sec: number | null): string {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}

/** "+5.7" / "−59.3" — a signed degree figure the way PowerLine prints it. */
export function fmtDeg(v: number | null, signed = true): string {
  if (v == null) return "—";
  const s = Math.abs(v).toFixed(1);
  if (!signed) return s;
  return v < 0 ? `−${s}` : `+${s}`;
}

/** The outing's total distance and time over its pieces. */
export function outingTotals(o: TelemetryOuting): { metres: number; sec: number } {
  return o.pieces.reduce(
    (t, p) => ({ metres: t.metres + p.metres, sec: t.sec + p.durationSec }),
    { metres: 0, sec: 0 },
  );
}

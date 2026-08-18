/*
  EXAMPLE OUTING — transcribed from the owner's own PowerLine screen.
  ---------------------------------------------------------------------------
  Until a real Peach export is imported there is nothing for the water side of
  the Workouts list to show, so it shows THIS: one outing, session 604 on box
  5423, 15 May 2026, read off six photographs of the PowerLine analysis window
  (file row005423-000604D.peach-data). Every number here was on that screen —
  the piece list, and for three of the pieces the "Average" panel: power per
  seat and the technique table (min/max angle, length, effective, catch/finish).
  Nothing is invented; where the photos did not show a piece's seat panel, the
  piece has no seat data. Transcribed by hand, so a digit may be off — it is an
  example, labelled as one, and it vanishes when a real import exists.

  Why not make numbers up like the erg example does: a fake force picture would
  teach a coach's eye the wrong shape. Real ones, even a few, do not.
*/
import { sessionKey } from "./coachPlan";
import type { TelemetryOuting, TelemetryPiece, SeatStats } from "./telemetry";

const CREW: { seat: number; side: "S" | "P"; name: string }[] = [
  { seat: 1, side: "S", name: "Sam D" },
  { seat: 2, side: "P", name: "George B" },
  { seat: 3, side: "S", name: "Teddy P" },
  { seat: 4, side: "P", name: "Ryan C" },
  { seat: 5, side: "S", name: "Marcus C" },
  { seat: 6, side: "P", name: "Adam C" },
  { seat: 7, side: "S", name: "Louis S" },
  { seat: 8, side: "P", name: "Pierce L" },
];

/* [watts, catch, finish, length, effective, slip, wash] per seat, 1 → 8, as
   read off the "Average power" bars and the "Average" table. */
type Row = [number, number, number, number, number, number, number];
function seats(rows: Row[]): SeatStats[] {
  return rows.map((r, i) => ({
    ...CREW[i],
    watts: r[0],
    catchAngle: r[1],
    finishAngle: r[2],
    length: r[3],
    effective: r[4],
    slip: r[5],
    wash: r[6],
  }));
}

const secs = (m: number, s: number) => m * 60 + s;
const split = (m: number, s: number) => m * 60 + s;

const pieces: TelemetryPiece[] = [
  {
    id: "604-paddle-1",
    name: "paddle",
    durationSec: secs(1, 55.5),
    metres: 551,
    rating: 18.7,
    splitSec: split(1, 44.9),
    boat: { speed: 4.77, rating: 18.6, power: 211, distPerStroke: 15.29 },
    seats: seats([
      [214, -59.0, 33.9, 92.9, 74.5, 7.4, 11.0],
      [202, -59.1, 33.5, 92.5, 70.6, 12.3, 9.7],
      [210, -57.7, 32.0, 89.7, 68.8, 12.2, 8.7],
      [213, -61.8, 35.1, 96.9, 72.1, 14.3, 10.4],
      [211, -55.8, 33.4, 89.2, 65.4, 12.4, 11.5],
      [217, -59.9, 34.5, 94.4, 76.6, 12.7, 5.1],
      [217, -57.5, 35.9, 93.4, 69.2, 14.5, 9.7],
      [209, -60.1, 31.8, 91.9, 69.0, 11.1, 11.8],
    ]),
  },
  { id: "604-paddle-2", name: "paddle", durationSec: secs(2, 7.9), metres: 606, rating: 19.3, splitSec: split(1, 45.6) },
  { id: "604-paddle-3", name: "paddle", durationSec: secs(2, 23.8), metres: 667, rating: 19.2, splitSec: split(1, 47.7) },
  {
    id: "604-burst-1",
    name: "burst_1",
    durationSec: 18.5,
    metres: 90,
    rating: 29.2,
    splitSec: split(1, 43.4),
    boat: { speed: 4.81, rating: 29.1, power: 341, distPerStroke: 9.87 },
    seats: seats([
      [322, -59.3, 32.6, 91.9, 75.6, 5.7, 10.6],
      [297, -58.9, 32.4, 91.2, 68.1, 10.1, 13.1],
      [350, -56.4, 32.6, 89.0, 71.7, 8.2, 9.1],
      [360, -60.8, 35.1, 95.9, 73.4, 12.0, 10.4],
      [336, -56.0, 33.2, 89.2, 66.5, 11.5, 11.2],
      [341, -58.6, 36.0, 94.0, 77.7, 10.1, 6.2],
      [335, -57.0, 34.4, 91.4, 67.8, 15.4, 8.1],
      [360, -60.0, 30.6, 90.7, 73.0, 6.0, 11.7],
    ]),
  },
  {
    id: "604-burst-2",
    name: "burst_2",
    durationSec: 20.1,
    metres: 114,
    rating: 32.9,
    splitSec: split(1, 28.2),
    segments: [
      { durationSec: 5.0, metres: 27, rating: 32.7, splitSec: split(1, 31.2) },
      { durationSec: 5.0, metres: 29, rating: 33.3, splitSec: split(1, 27.1) },
      { durationSec: 5.0, metres: 28, rating: 33.3, splitSec: split(1, 28.1) },
      { durationSec: 5.0, metres: 29, rating: 32.2, splitSec: split(1, 26.6) },
      { durationSec: 0.1, metres: 1, rating: 31.3, splitSec: split(1, 30.4) },
    ],
  },
  {
    id: "604-5high",
    name: "5 high",
    durationSec: 17.4,
    metres: 99,
    rating: 41.4,
    splitSec: split(1, 27.7),
    segments: [
      { durationSec: 5.0, metres: 27, rating: 42.2, splitSec: split(1, 32.4) },
      { durationSec: 5.0, metres: 29, rating: 42.2, splitSec: split(1, 26.8) },
      { durationSec: 5.0, metres: 29, rating: 41.3, splitSec: split(1, 25.2) },
      { durationSec: 2.4, metres: 14, rating: 38.7, splitSec: split(1, 25.9) },
    ],
  },
  {
    id: "604-burst-3",
    name: "burst_3",
    durationSec: 17.3,
    metres: 103,
    rating: 34.9,
    splitSec: split(1, 24.1),
    boat: { speed: 5.94, rating: 34.8, power: 427, distPerStroke: 10.19 },
    seats: seats([
      [377, -55.9, 32.7, 88.5, 74.0, 4.1, 10.4],
      [386, -56.0, 31.6, 87.6, 69.7, 7.0, 10.8],
      [433, -56.1, 32.2, 88.3, 74.1, 6.2, 8.0],
      [452, -60.2, 33.8, 94.0, 74.2, 9.2, 10.6],
      [445, -54.7, 31.9, 86.6, 68.3, 8.2, 10.0],
      [430, -58.5, 34.0, 92.5, 79.9, 7.9, 4.8],
      [435, -57.1, 32.6, 89.7, 69.9, 11.7, 8.0],
      [458, -59.4, 30.4, 89.8, 71.8, 6.0, 12.0],
    ]),
    segments: [
      { durationSec: 5.0, metres: 30, rating: 35.2, splitSec: split(1, 24.8) },
      { durationSec: 5.0, metres: 30, rating: 35.0, splitSec: split(1, 24.6) },
      { durationSec: 5.0, metres: 30, rating: 35.0, splitSec: split(1, 23.1) },
      { durationSec: 2.3, metres: 14, rating: 33.7, splitSec: split(1, 24.1) },
    ],
  },
];

/* 15 May 2026, morning (the PowerLine clock read 10:01 AM). */
export const demoOutings: TelemetryOuting[] = [
  {
    id: "example-peach-604",
    dayKey: sessionKey(new Date(2026, 4, 15), "AM"),
    source: "peach",
    crew: "1V",
    box: "5423",
    sessionNo: "604",
    file: "row005423-000604D.peach-data",
    pieces,
  },
];

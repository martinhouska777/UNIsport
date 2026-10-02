/*
  ERG LOG — reading one logged erg session: what the scanner added to its note,
  and which PIECE it was, so it is only ever compared with the same piece.
  ---------------------------------------------------------------------------
  A scan writes the exact time, rate and watts to the front of the note
  ("18:42 · r24 · 250W", LogScreen → applyScan), because the form has no field
  for them. `ergNote` takes those back out and hands over what the rower wrote
  themselves.

  THE SAME PIECE (owner, 2026-10-02: "compare with past erg sessions that were
  the same as this one, because there is no point otherwise"). A piece fixes
  either the distance or the time — the same idea as the team board's
  pieceSignature (teamBoard.ts), worked out from one log instead of a squad:
    • the exact time on the monitor is whole minutes  → a TIME piece (30:00)
    • otherwise                                       → a DISTANCE piece (5,000 m)
  A typed-in session has no exact time, so there a distance that is a multiple
  of 500 m (2k, 5k, 6k) says distance and anything else says time. Distances
  round to 50 m, so a monitor's 1,998 m still matches the 2,000 m tests.
  Reps are not kept on a log, so 8×500m and a straight 4k both read 4,000 m.
*/
import type { LogEntry } from "./logStore";

const TIME = /^\d{1,3}:\d{2}$/;
const RATE = /^r(\d{1,2})$/i;
const WATTS = /^(\d{2,4})W$/;

/* The scanner's numbers at the front of the note, and the rower's own words. */
export function ergNote(note: string): {
  time: string | null;
  rate: string | null;
  watts: string | null;
  own: string;
} {
  const parts = note.split(" · ");
  let time: string | null = null;
  let rate: string | null = null;
  let watts: string | null = null;
  let i = 0;
  for (; i < parts.length; i++) {
    const p = parts[i].trim();
    if (TIME.test(p)) time ??= p;
    else if (RATE.test(p)) rate ??= p.match(RATE)![1];
    else if (WATTS.test(p)) watts ??= p.match(WATTS)![1];
    else break;
  }
  return { time, rate, watts, own: parts.slice(i).join(" · ").trim() };
}

const clockToSec = (clock: string) => {
  const [m, s] = clock.split(":").map(Number);
  return m * 60 + s;
};

export type ErgPiece = { key: string; label: string; kind: "distance" | "time" };

/* Which piece this session was; null when it has neither distance nor time. */
export function ergPiece(log: LogEntry): ErgPiece | null {
  const exact = ergNote(log.note).time;
  const sec = exact ? clockToSec(exact) : log.minutes != null && log.minutes > 0 ? log.minutes * 60 : null;
  const metres = log.metres != null && log.metres > 0 ? log.metres : null;

  let kind: "distance" | "time" | null = null;
  if (metres && sec) {
    // A tie (both round) falls to distance, as on the team board.
    const roundMetres = metres % 500 === 0;
    kind = exact ? (sec % 60 === 0 && !roundMetres ? "time" : "distance") : roundMetres ? "distance" : "time";
  } else if (metres) kind = "distance";
  else if (sec) kind = "time";

  if (kind === "distance" && metres) {
    const m = Math.round(metres / 50) * 50;
    return { key: `d${m}`, label: `${m.toLocaleString("en-US")} m`, kind };
  }
  if (kind === "time" && sec) {
    const min = Math.round(sec / 60);
    return { key: `t${min}`, label: `${min} min`, kind };
  }
  return null;
}

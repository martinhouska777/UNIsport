/*
  DEMO TEAM WORKOUTS — a worked example, for a board nobody has filled yet.
  ---------------------------------------------------------------------------
  A brand-new squad sees an empty Workouts tab until the coach flags a session
  AND people log it, which makes the screen impossible to review or show anyone.
  So when there is nothing real, the tab shows this instead: five past workouts
  with the squad's results on them, clearly labelled as an example.

  It is DERIVED, not stored — same trick teamProfiles.ts and teamTraining.ts
  already use for the roster. Every number comes from each rower's 2K PB, so a
  fast rower is fast on every piece and the boards agree with their profile.
  Deterministic per (athlete, workout): it looks the same on every render and
  on every phone.

  IT NEVER MASKS REAL DATA. The screen falls back to this only when the plan
  holds no team workouts at all; the moment a coach flags one, this disappears
  entirely — including its results. That is deliberate: half real, half example
  would be worse than either.

  Everything about the five pieces is DATA in the list below (rule 7). To change
  what the example shows, edit that list — not the screen.
*/
import { roster } from "./coachLineup";
import { teamProfile, clockToSec } from "./teamProfiles";
import { rngFor } from "./teamProfiles";
import { sessionKey, type Session, type SessionMap, type BoardKind, type Intensity } from "./coachPlan";
import type { TeamResult, ResultInterval } from "./resultsStore";
import { secToSplit, secToClock } from "./ergMath";

type DemoPiece = {
  daysAgo: number;
  period: "AM" | "PM";
  description: string;
  intensity: Intensity;
  board: BoardKind;
  /* A piece is measured one way or the other: a fixed distance (a 2K, or the
     4,000 m total of an 8×500m) or a fixed time (a 30' piece). Whichever it is,
     the other number falls out of the athlete's pace. */
  metres?: number;
  minutes?: number;
  // Seconds per 500 m off the athlete's own 2K pace. Short reps with rest come
  // in UNDER 2K pace; long steady work sits well above it.
  offsetSec: number;
  rate: number; // strokes per minute the piece is rowed at
  turnout: number; // roughly what fraction of the squad logged it
  /* A piece rowed as reps has an interval screen behind it. `repOffsets` is the
     shape of the effort: seconds per 500 m off the athlete's average for the
     piece, one per rep. They sum to zero, so the reps and the summary agree —
     the pattern (settle, fade, sprint the last one) is what a rower reads. */
  reps?: { metres: number; offsets: number[] };
};

export const demoPieces: DemoPiece[] = [
  { daysAgo: 2, period: "AM", description: "2k test", intensity: "hard", board: "ranked",
    metres: 2000, offsetSec: 0, rate: 34, turnout: 0.94 },
  { daysAgo: 5, period: "PM", description: "8×500m, 1:30 rest", intensity: "hard", board: "ranked",
    metres: 4000, offsetSec: -2.5, rate: 32, turnout: 0.83,
    reps: { metres: 500, offsets: [-1.5, -0.5, 0, 0.4, 0.8, 1.0, 0.6, -0.8] } },
  { daysAgo: 9, period: "AM", description: "4×2000m, 5' rest", intensity: "hard", board: "ranked",
    metres: 8000, offsetSec: 7, rate: 28, turnout: 0.78,
    reps: { metres: 2000, offsets: [-1.0, -0.2, 0.5, 0.7] } },
  { daysAgo: 13, period: "AM", description: "30' r20", intensity: "UT1", board: "ranked",
    minutes: 30, offsetSec: 13, rate: 20, turnout: 0.72 },
  { daysAgo: 16, period: "AM", description: "3×25' UT2", intensity: "UT2", board: "average",
    minutes: 75, offsetSec: 21, rate: 20, turnout: 0.89 },
];

// Rowers only — a coxswain doesn't sit on an erg board.
const rowers = () => roster.filter((a) => !a.cox);

// How many people the example board counts against, so it can say "37 of 44
// logged" like the real thing rather than a bare count.
export const demoSquadSize = rowers().length;

// Each rower's own 2K pace per 500 m, the number every piece is built from.
const base500 = (athleteId: string) => clockToSec(teamProfile(athleteId).prs["2K"]) / 4;

/*
  Who stands in for the person looking at the screen, so they can see their own
  row highlighted where it would really sit. The MEDIAN rower by 2K — a demo
  that always puts you on top teaches you nothing about the board.
*/
function medianRowerId(): string {
  const sorted = [...rowers()].sort((a, b) => base500(a.id) - base500(b.id));
  return sorted[Math.floor(sorted.length / 2)]?.id ?? "";
}

/* The rep-by-rep rows for one athlete's piece, from the shape in `reps`. */
function demoIntervals(piece: DemoPiece, splitSec: number, rate: number): ResultInterval[] | null {
  if (!piece.reps) return null;
  return piece.reps.offsets.map((off, i) => {
    const repSplit = Math.round((splitSec + off) * 10) / 10;
    return {
      label: String(i + 1),
      metres: piece.reps!.metres,
      timeSec: Math.round(((repSplit * piece.reps!.metres) / 500) * 10) / 10,
      splitSec: repSplit,
      // Rate creeps up as people chase a fading split.
      strokeRate: rate + (i >= piece.reps!.offsets.length - 2 ? 1 : 0),
    };
  });
}

/*
  A DRAWN stand-in for the monitor photo — not a photograph, and it says so on
  its face. It exists so the photo viewer can be reviewed before anyone has
  taken a real one; a real result carries a storage path here instead.
*/
function demoMonitorImage(
  name: string,
  totalSec: number,
  metres: number,
  splitSec: number,
  rate: number,
  intervals: ResultInterval[] | null,
): string {
  const rows = (intervals ?? []).slice(0, 8);
  const h = 150 + rows.length * 22;
  const line = (y: number, cells: string[], weight = "400", fill = "#cfe8d8") =>
    cells
      .map(
        (c, i) =>
          `<text x="${[18, 96, 176, 250][i]}" y="${y}" font-family="ui-monospace,monospace" font-size="13" font-weight="${weight}" fill="${fill}">${c}</text>`,
      )
      .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="${h}" viewBox="0 0 320 ${h}">
<rect width="320" height="${h}" rx="10" fill="#0d1a12"/>
<rect x="6" y="6" width="308" height="${h - 12}" rx="7" fill="none" stroke="#2c4a37"/>
<text x="18" y="30" font-family="ui-monospace,monospace" font-size="11" fill="#6f9a80">${name}</text>
${line(56, ["time", "meter", "/500m", "s/m"], "700", "#6f9a80")}
${line(78, [secToClock(totalSec), String(metres), secToSplit(splitSec, true), String(rate)], "700", "#e8fff0")}
<line x1="18" y1="90" x2="302" y2="90" stroke="#2c4a37"/>
${rows
  .map((r, i) =>
    line(
      112 + i * 22,
      [
        r.timeSec != null ? secToClock(r.timeSec) : "—",
        r.metres != null ? String(r.metres) : "—",
        r.splitSec != null ? secToSplit(r.splitSec, true) : "—",
        r.strokeRate != null ? String(r.strokeRate) : "—",
      ],
    ),
  )
  .join("")}
<text x="160" y="${h - 16}" text-anchor="middle" font-family="ui-sans-serif,system-ui" font-size="10" letter-spacing="1.5" fill="#7d5a3c">EXAMPLE — NOT A REAL PHOTO</text>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function demoTeamPlan(
  today = new Date(),
  me?: { id: string; name: string } | null,
): { sessions: SessionMap; results: TeamResult[] } {
  const sessions: SessionMap = {};
  const results: TeamResult[] = [];
  const standIn = me?.id ? medianRowerId() : "";

  for (const piece of demoPieces) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - piece.daysAgo);
    const dayKey = sessionKey(date, piece.period);

    const session: Session = {
      category: "erg",
      intensity: piece.intensity,
      description: piece.description,
      time: piece.period === "AM" ? "7:00 AM" : "4:30 PM",
      teamWorkout: true,
      board: piece.board,
    };
    sessions[dayKey] = session;

    for (const a of rowers()) {
      const r = rngFor(a.id, dayKey);
      // Not everybody logs everything — that gap is half the point of the
      // "9 of 24 logged" line, so the example has to show it.
      if (r() > piece.turnout) continue;

      const splitSec = base500(a.id) + piece.offsetSec + (r() * 4 - 1.5);
      const totalSec = piece.metres != null
        ? (splitSec * piece.metres) / 500
        : (piece.minutes ?? 0) * 60;
      const metres = piece.metres ?? Math.round((totalSec / splitSec) * 500 / 10) * 10;
      const mine = !!standIn && a.id === standIn;
      const intervals = demoIntervals(piece, splitSec, piece.rate);

      results.push({
        id: `demo-${dayKey}-${a.id}`,
        dayKey,
        athleteId: mine ? me!.id : a.id,
        athleteName: mine ? me!.name || "You" : a.name,
        minutes: totalSec / 60,
        metres,
        split: null,
        splitSec: Math.round(splitSec * 10) / 10,
        strokeRate: piece.rate,
        watts: null, // derived from the split, exactly as a hand-typed result is
        weightKg: teamProfile(a.id).weightKg,
        photoPath: demoMonitorImage(
          mine ? me!.name || "You" : a.name,
          totalSec,
          metres,
          splitSec,
          piece.rate,
          intervals,
        ),
        intervals,
        note: "",
      });
    }
  }

  return { sessions, results };
}

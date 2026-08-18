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
import type { TeamResult } from "./resultsStore";

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
};

export const demoPieces: DemoPiece[] = [
  { daysAgo: 2, period: "AM", description: "2k test", intensity: "hard", board: "ranked",
    metres: 2000, offsetSec: 0, rate: 34, turnout: 0.94 },
  { daysAgo: 5, period: "PM", description: "8×500m, 1:30 rest", intensity: "hard", board: "ranked",
    metres: 4000, offsetSec: -2.5, rate: 32, turnout: 0.83 },
  { daysAgo: 9, period: "AM", description: "4×2000m, 5' rest", intensity: "hard", board: "ranked",
    metres: 8000, offsetSec: 7, rate: 28, turnout: 0.78 },
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
        note: "",
      });
    }
  }

  return { sessions, results };
}

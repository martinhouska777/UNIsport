/*
  ERG RANKINGS — the last erg workout, ranked, with improvement vs last time.
  ------------------------------------------------------------------------
  Real results will come from logged/uploaded erg tests once that data exists.
  For now we DERIVE a stable demo board from each rower's 2K PB (teamProfiles)
  plus a seeded "previous result", so the ranking + green/red deltas look real.

  Mock DATA in lib (rule 7) — the screen never invents numbers itself. Coxswains
  are excluded (they don't sit on this board). Sorted fastest → slowest.
*/
import { roster } from "./coachLineup";
import { teamProfile, rngFor, clockToSec, secToClock } from "./teamProfiles";

export type ErgResult = {
  athleteId: string;
  name: string;
  initials: string;
  currentSec: number;
  previousSec: number;
  currentLabel: string;
  deltaSec: number; // previous - current → positive = improved (faster now)
};

export type ErgWorkout = {
  piece: string; // e.g. "2K"
  dateLabel: string;
  results: ErgResult[]; // fastest first
};

// The most recent erg test (a 2K), ranked.
export function lastErgWorkout(): ErgWorkout {
  const results: ErgResult[] = roster
    .filter((a) => !a.cox)
    .map((a) => {
      const currentSec = clockToSec(teamProfile(a.id).prs["2K"]);
      const r = rngFor(a.id, "erg2k");
      // Most rowers came down (improved) vs their last test; a few went up.
      const deltaSec = Math.round((r() * 8 - 2.5) * 10) / 10; // ~ -2.5s … +5.5s
      return {
        athleteId: a.id,
        name: a.name,
        initials: a.initials,
        currentSec,
        previousSec: Math.round((currentSec + deltaSec) * 10) / 10,
        currentLabel: secToClock(currentSec),
        deltaSec,
      };
    })
    .sort((x, y) => x.currentSec - y.currentSec);

  return { piece: "2K", dateLabel: "Last 2K test", results };
}

// "−2.3s" / "+1.1s" for a delta (positive delta = faster now).
export function deltaLabel(deltaSec: number): string {
  if (Math.abs(deltaSec) < 0.05) return "0.0s";
  return `${deltaSec > 0 ? "−" : "+"}${Math.abs(deltaSec).toFixed(1)}s`;
}

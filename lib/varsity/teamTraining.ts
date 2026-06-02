/*
  TEAM TRAINING — a teammate's month of training, for their profile view.
  ------------------------------------------------------------------------
  Real data will come from their logs once accounts link to the squad. For now
  we DERIVE a stable month (which days they trained, what they did, minutes,
  which sessions were extra/off-plan) from the athlete id, so the calendar +
  consistency + minutes read like the real thing. Deterministic per id.

  Mock DATA in lib (rule 7). Category keys match lib/varsity/athleteProfile's
  logCategoryColor/Label so the calendar dots and legend stay consistent.
*/
import { rngFor } from "./teamProfiles";

export type TrainSession = { cat: string; minutes: number; extra: boolean };
export type TrainDay = { day: number; future: boolean; sessions: TrainSession[] };

export type TeamMonth = {
  monthLabel: string;
  year: number;
  leadingEmpty: number;
  todayDay: number;
  days: TrainDay[]; // one per day of the month (sessions empty = rest / future)
  consistency: number; // % of expected (non-Sunday) days trained, capped at 100
  minutes: number; // total minutes this month
  sessionsCount: number;
  extraCount: number;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pickCategory(r: number): string {
  if (r < 0.42) return "erg";
  if (r < 0.66) return "water";
  if (r < 0.82) return "weights";
  if (r < 0.93) return "run";
  return "bike";
}
function minutesFor(cat: string, r: number): number {
  switch (cat) {
    case "water": return 60 + Math.round(r * 30);
    case "erg": return 55 + Math.round(r * 20);
    case "weights": return 45 + Math.round(r * 15);
    case "run": return 30 + Math.round(r * 20);
    case "bike": return 40 + Math.round(r * 20);
    default: return 45;
  }
}

// Build (and memoise) this month's training for one athlete id.
const cache: Record<string, TeamMonth> = {};
export function teamTrainingMonth(athleteId: string): TeamMonth {
  if (cache[athleteId]) return cache[athleteId];

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const todayDay = now.getDate();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const leadingEmpty = (new Date(y, m, 1).getDay() + 6) % 7; // Monday-first

  const r = rngFor(athleteId, "train");
  const days: TrainDay[] = [];
  let minutes = 0;
  let sessionsCount = 0;
  let extraCount = 0;
  let trainedDays = 0;
  let expectedDays = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(y, m, d).getDay(); // 0 = Sun
    const future = d > todayDay;
    if (future) {
      days.push({ day: d, future: true, sessions: [] });
      continue;
    }
    if (dow !== 0) expectedDays++; // Sundays aren't expected training days

    // Sundays mostly rest; other days mostly trained.
    const trains = dow === 0 ? r() > 0.8 : r() > 0.16;
    const sessions: TrainSession[] = [];
    if (trains) {
      const cat = pickCategory(r());
      sessions.push({ cat, minutes: minutesFor(cat, r()), extra: r() > 0.85 });
      // ~30% of days have a second session (often a lift).
      if (r() > 0.7) {
        const cat2 = r() > 0.5 ? "weights" : pickCategory(r());
        sessions.push({ cat: cat2, minutes: minutesFor(cat2, r()), extra: r() > 0.8 });
      }
      if (dow !== 0) trainedDays++;
      for (const s of sessions) {
        minutes += s.minutes;
        sessionsCount++;
        if (s.extra) extraCount++;
      }
    }
    days.push({ day: d, future: false, sessions });
  }

  const consistency = expectedDays ? Math.min(100, Math.round((trainedDays / expectedDays) * 100)) : 0;

  const month: TeamMonth = {
    monthLabel: MONTHS[m],
    year: y,
    leadingEmpty,
    todayDay,
    days,
    consistency,
    minutes,
    sessionsCount,
    extraCount,
  };
  cache[athleteId] = month;
  return month;
}

// minutes → "14h 30m" / "45m"
export function formatDuration(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

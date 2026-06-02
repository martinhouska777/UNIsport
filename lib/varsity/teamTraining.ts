/*
  TEAM TRAINING — a teammate's training, month by month, for their profile.
  ------------------------------------------------------------------------
  Real data will come from their logs once accounts link to the squad. For now
  we DERIVE a stable month (which days they trained, what they did + minutes /
  metres / split, which were extra) from the athlete id + year + month, so the
  calendar, consistency, time and per-category breakdowns read like the real
  thing. Deterministic per (id, year, month) — navigate to any past month and
  it stays the same.

  Mock DATA in lib (rule 7). Category keys match athleteProfile's
  logCategoryColor/Label so dots, legend and breakdowns stay consistent.
*/
import { rngFor } from "./teamProfiles";

export type TrainSession = {
  cat: string;
  minutes: number;
  metres: number | null; // erg / water / run / bike
  split: string | null; // erg / water ("1:55")
  extra: boolean;
};
export type TrainDay = { day: number; future: boolean; sessions: TrainSession[] };
export type CatTotal = { cat: string; minutes: number; sessions: number };

export type TeamMonth = {
  y: number;
  m: number; // 0-based
  monthLabel: string;
  leadingEmpty: number;
  todayDay: number | null; // set only when this IS the current month
  days: TrainDay[];
  consistency: number; // % of expected (non-Sunday) days trained, capped 100
  minutes: number; // total minutes
  sessionsCount: number;
  extraCount: number;
  byCategory: CatTotal[]; // all sessions, biggest first
  extraByCategory: CatTotal[]; // extra sessions only, biggest first
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
function splitClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec - m * 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
// Build the metres + split for a session from its minutes (erg/water rowed,
// run/bike covered distance, weights none).
function metricsFor(cat: string, minutes: number, r: number): { metres: number | null; split: string | null } {
  if (cat === "erg" || cat === "water") {
    const splitSec = 108 + r * 24; // 1:48–2:12 /500m
    const metres = Math.round((minutes * 60 * 500) / splitSec / 100) * 100;
    return { metres, split: splitClock(splitSec) };
  }
  if (cat === "run") return { metres: Math.round((minutes * (150 + r * 70)) / 100) * 100, split: null };
  if (cat === "bike") return { metres: Math.round((minutes * (300 + r * 120)) / 100) * 100, split: null };
  return { metres: null, split: null };
}

function tally(sessions: TrainSession[]): CatTotal[] {
  const map: Record<string, CatTotal> = {};
  for (const s of sessions) {
    (map[s.cat] ??= { cat: s.cat, minutes: 0, sessions: 0 });
    map[s.cat].minutes += s.minutes;
    map[s.cat].sessions += 1;
  }
  return Object.values(map).sort((a, b) => b.minutes - a.minutes);
}

const cache: Record<string, TeamMonth> = {};
export function teamTrainingMonth(athleteId: string, y: number, m: number): TeamMonth {
  const key = `${athleteId}:${y}:${m}`;
  if (cache[key]) return cache[key];

  const now = new Date();
  const isCurrentMonth = y === now.getFullYear() && m === now.getMonth();
  const isFutureMonth = y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth());
  const todayDay = isCurrentMonth ? now.getDate() : null;

  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const leadingEmpty = (new Date(y, m, 1).getDay() + 6) % 7; // Monday-first

  const r = rngFor(athleteId, `train${y}-${m}`);
  const days: TrainDay[] = [];
  const all: TrainSession[] = [];
  let trainedDays = 0;
  let expectedDays = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(y, m, d).getDay();
    const future = isFutureMonth || (isCurrentMonth && d > now.getDate());
    if (future) {
      days.push({ day: d, future: true, sessions: [] });
      continue;
    }
    if (dow !== 0) expectedDays++;

    const trains = dow === 0 ? r() > 0.8 : r() > 0.16;
    const sessions: TrainSession[] = [];
    if (trains) {
      const cat = pickCategory(r());
      const mins = minutesFor(cat, r());
      sessions.push({ cat, minutes: mins, ...metricsFor(cat, mins, r()), extra: r() > 0.85 });
      if (r() > 0.7) {
        const cat2 = r() > 0.5 ? "weights" : pickCategory(r());
        const mins2 = minutesFor(cat2, r());
        sessions.push({ cat: cat2, minutes: mins2, ...metricsFor(cat2, mins2, r()), extra: r() > 0.8 });
      }
      if (dow !== 0) trainedDays++;
      all.push(...sessions);
    }
    days.push({ day: d, future: false, sessions });
  }

  const minutes = all.reduce((s, x) => s + x.minutes, 0);
  const extras = all.filter((s) => s.extra);
  const month: TeamMonth = {
    y,
    m,
    monthLabel: MONTHS[m],
    leadingEmpty,
    todayDay,
    days,
    consistency: expectedDays ? Math.min(100, Math.round((trainedDays / expectedDays) * 100)) : 0,
    minutes,
    sessionsCount: all.length,
    extraCount: extras.length,
    byCategory: tally(all),
    extraByCategory: tally(extras),
  };
  cache[key] = month;
  return month;
}

// minutes → "14h 30m" / "45m"
export function formatDuration(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

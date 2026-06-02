/*
  TEAM PROFILES — what you see when you open another athlete's profile.
  ------------------------------------------------------------------------
  Real per-athlete records (height, weight, status, erg PRs) will come from the
  database once accounts are linked to the squad. Until then we DERIVE plausible,
  STABLE demo values from each athlete's id, so every rower in the roster has a
  profile to view. Deterministic (same id → same numbers every render), so the
  screens look real while we wait for the backend.

  This is mock DATA in lib (rule 7); the screens never invent values themselves.
*/
import { rosterById, type Athlete } from "./coachLineup";
import { defaultTeamYear } from "./athleteProfile";
import { classYears } from "@/lib/onboarding";

export type TeamProfile = {
  classYear: string;
  teamYear: string;
  heightCm: number;
  weightKg: number;
  status: string; // a statusOptions title
  prs: Record<string, string>; // "2K" -> "6:08.4", etc.
};

/* tiny seeded RNG so derived values are stable per athlete id */
function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A stable seeded RNG for an athlete id (optionally salted for a second stream).
export function rngFor(id: string, salt = ""): () => number {
  return mulberry32(hashSeed(id + salt));
}

// "m:ss.s" → seconds (e.g. "6:08.4" → 368.4)
export function clockToSec(clock: string): number {
  const [m, s] = clock.split(":");
  return Number(m) * 60 + Number(s);
}

// seconds → "m:ss.s"
export function secToClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}

function statusFor(a: Athlete, r: () => number): string {
  if (a.out === "INJ") return "Injured";
  if (a.out === "SICK") return "Light training";
  const x = r();
  if (x > 0.92) return "Away";
  return "Active";
}

// Build (and memoise) the demo profile for one athlete id.
const cache: Record<string, TeamProfile> = {};
export function teamProfile(athleteId: string): TeamProfile {
  if (cache[athleteId]) return cache[athleteId];
  const a = rosterById[athleteId];
  const r = mulberry32(hashSeed(athleteId));

  const classYear = classYears[Math.floor(r() * classYears.length)] ?? "";
  const isCox = !!a?.cox;

  // Coxes are lighter/shorter; rowers tall and heavy.
  const heightCm = isCox ? 160 + Math.floor(r() * 14) : 183 + Math.floor(r() * 13);
  const weightKg = isCox ? 52 + Math.floor(r() * 8) : 80 + Math.floor(r() * 16);

  // A 2K base (seconds) drives the other erg pieces so they stay consistent.
  const twoK = isCox ? 408 + Math.floor(r() * 30) : 366 + Math.floor(r() * 28); // ~6:06–6:34
  const prs: Record<string, string> = {
    "2K": secToClock(twoK),
    "5K": secToClock(Math.round(twoK * 2.64)),
    "6K": secToClock(Math.round(twoK * 3.21)),
    "30′ r20": `${(7600 + Math.floor(r() * 1100)).toLocaleString("en-US")} m`,
  };

  const profile: TeamProfile = {
    classYear,
    teamYear: defaultTeamYear(classYear),
    heightCm,
    weightKg,
    status: a ? statusFor(a, r) : "Active",
    prs,
  };
  cache[athleteId] = profile;
  return profile;
}

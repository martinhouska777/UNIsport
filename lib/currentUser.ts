/*
  FAKE "current user" — the logged-in person's own profile (Profile tab).
  Shape intentionally mirrors what onboarding produces (see OnboardingProfile),
  plus a few profile-only fields, so the two line up when Supabase is wired later.
  This is DATA: the screen reads/loops from here and never hardcodes values.
*/
import type { OnboardingProfile } from "./onboarding";

export type PersonalRecord = { lift: string; value: string };

// A logged training session (used by the calendar + detail overlay).
export type Session = {
  day: number; // day-of-month in the currently shown month
  activity: string;
  gym: string;
  partner: string;
  exercises: string[];
  photos: string[];
};

export type CurrentUser = OnboardingProfile & {
  badges: { varsity: boolean; mentor: boolean };
  stats: { sessions: number; partners: number; following: number };
  // Human-readable, editable Training rows shown on the profile. These mirror the
  // matching fields above (experienceLevel, gymSplit, topGyms…) and will be unified
  // with them once the database is wired up.
  trainingDisplay: { level: string; type: string; split: string; schedule: string; gym: string };
  personalRecords: PersonalRecord[];
  photos: string[];
  sessions: Session[];
};

export const currentUser: CurrentUser = {
  // --- onboarding-shaped fields ---
  name: "Jake Morrison",
  classYear: "'27",
  sex: "Male",
  residence: "Adams",
  primaryActivity: "gym",
  activityOther: "",
  experienceLevel: "advanced",
  gymSplit: "Push-Pull-Legs",
  runningDistance: "",
  runningPace: "",
  cardioType: "",
  topGyms: ["Malkin Athletic Center", "Murr Center"],
  trainingSchedule: { mon: ["PM"], wed: ["PM"], fri: ["AM"] },
  concentration: "Economics",
  hometownCountry: "United States",
  languages: ["English"],
  interests: ["Powerlifting", "Chess", "Jazz"],
  trainingType: "partner",
  partnerPreference: "any",
  mentorFreshmen: true,
  beMentored: false,
  helpOthers: true,
  getHelp: false,
  bio: "Rowing team, powerlifting nerd. Chess, jazz, terrible movies.",
  photo: null,

  // --- profile-only fields ---
  badges: { varsity: true, mentor: true },
  stats: { sessions: 142, partners: 18, following: 24 },
  trainingDisplay: {
    level: "Advanced",
    type: "Powerlifting",
    split: "Push-Pull-Legs",
    schedule: "Mon · Wed · Fri",
    gym: "Malkin Athletic Center",
  },
  personalRecords: [
    { lift: "Squat", value: "180 kg × 1" },
    { lift: "Bench", value: "120 kg × 3" },
    { lift: "Deadlift", value: "220 kg × 1" },
  ],
  photos: [],
  sessions: [
    { day: 3, activity: "Push day", gym: "Malkin Athletic Center", partner: "Alex Chen", exercises: ["Bench 5×5", "OHP 4×8", "Triceps"], photos: [] },
    { day: 6, activity: "Pull day", gym: "Malkin Athletic Center", partner: "Solo", exercises: ["Deadlift 5×3", "Rows 4×10", "Curls"], photos: [] },
    { day: 9, activity: "Leg day", gym: "Murr Center", partner: "Sam Patel", exercises: ["Squat 5×5", "RDL 4×8", "Calves"], photos: [] },
    { day: 13, activity: "Push day", gym: "Malkin Athletic Center", partner: "Alex Chen", exercises: ["Incline 4×8", "Dips", "Laterals"], photos: [] },
    { day: 16, activity: "Pull day", gym: "Malkin Athletic Center", partner: "Solo", exercises: ["Pull-ups", "Rows", "Face pulls"], photos: [] },
    { day: 20, activity: "Leg day", gym: "Murr Center", partner: "Sam Patel", exercises: ["Front squat", "Lunges", "Leg curls"], photos: [] },
  ],
};

// "'27" -> "Class of 2027"; leaves non-year values (e.g. "Grad") as-is.
export function classOfLabel(classYear: string): string {
  return classYear.startsWith("'") ? `Class of 20${classYear.slice(1)}` : classYear;
}

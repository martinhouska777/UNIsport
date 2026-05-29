/*
  ONBOARDING DATA (white-label / data-driven).
  Every list of options the onboarding flow offers lives HERE, never hardcoded in a
  component. Editing this file changes the choices users see — no component changes.

  Screens are added to this file as they are built.
*/

// ---- Screen 1: Basics --------------------------------------------------------

// Editable list of class-year pills. (Set the real years here.)
export const classYears: string[] = ["'27", "'28", "'29", "'30"];

// The SINGLE source of truth for "which class year is currently the freshman class".
// Screen 2 compares the chosen class year to THIS value to decide Yard dorms vs
// the 12 houses. When the freshman class rolls over each year, change ONLY this.
export const freshmanClassYear: string = "'30";

// Sex options (editable).
export const sexOptions: string[] = ["Male", "Female"];

// ---- Screen 2: Where you live ------------------------------------------------

// Freshman Yard dorms (shown when the chosen class year === freshmanClassYear).
export const yardDorms: string[] = [
  "Apley Court",
  "Canaday",
  "Grays",
  "Greenough",
  "Hollis",
  "Holworthy",
  "Hurlbut",
  "Lionel",
  "Matthews",
  "Mower",
  "Pennypacker",
  "Stoughton",
  "Straus",
  "Thayer",
  "Weld",
  "Wigglesworth",
];

// The 12 upperclassman houses (shown for everyone who isn't the freshman class).
export const houses: string[] = [
  "Adams",
  "Cabot",
  "Currier",
  "Dunster",
  "Eliot",
  "Kirkland",
  "Leverett",
  "Lowell",
  "Mather",
  "Pforzheimer",
  "Quincy",
  "Winthrop",
];

// Decoupled from any hardcoded year: freshmen see Yard dorms, everyone else houses.
export function residenceOptions(classYear: string): string[] {
  return classYear === freshmanClassYear ? yardDorms : houses;
}

// ---- The collected profile (one object for the whole flow) -------------------
// Clean field names — matching will read these later. Optional fields fill in as
// the user moves through the screens (or are left empty on skippable screens).
export type OnboardingProfile = {
  // Screen 1 — Basics
  name: string;
  classYear: string;
  sex: string;

  // Screen 2 — Where you live
  residence: string;

  // Screen 3 — Primary activity + experience (matching inputs)
  primaryActivity: "" | "gym" | "running" | "cardio" | "other";
  activityOther: string;
  experienceLevel: "" | "beginner" | "intermediate" | "advanced";
  gymSplit: string[];
  runningDistance: string;
  runningPace: string;
  cardioType: string;

  // Screen 4 — Top gyms (ranked, matching input)
  topGyms: string[];

  // Screen 5 — When you train (matching input): day -> selected time blocks
  trainingSchedule: Record<string, string[]>;

  // Screen 6 — Background (all optional)
  concentration: string;
  hometownCountry: string;
  languages: string[];
  interests: string[];

  // Screen 7 — Preferences (matching inputs + mentorship)
  trainingType: "" | "solo" | "partner" | "either";
  partnerPreference: "" | "any" | "male" | "female";
  mentorFreshmen: boolean;
  beMentored: boolean;
  helpOthers: boolean;
  getHelp: boolean;

  // Screen 8 — Finish profile (all optional)
  bio: string;
  photo: string | null;
};

export const emptyProfile: OnboardingProfile = {
  name: "",
  classYear: "",
  sex: "",
  residence: "",
  primaryActivity: "",
  activityOther: "",
  experienceLevel: "",
  gymSplit: [],
  runningDistance: "",
  runningPace: "",
  cardioType: "",
  topGyms: [],
  trainingSchedule: {},
  concentration: "",
  hometownCountry: "",
  languages: [],
  interests: [],
  trainingType: "",
  partnerPreference: "",
  mentorFreshmen: false,
  beMentored: false,
  helpOthers: false,
  getHelp: false,
  bio: "",
  photo: null,
};

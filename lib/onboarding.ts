/*
  ONBOARDING DATA (white-label / data-driven).
  Every list of options the onboarding flow offers lives HERE, never hardcoded in a
  component. Editing this file changes the choices users see — no component changes.

  Screens are added to this file as they are built.
*/

import { gyms } from "./gyms";

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

// Display label for a residence. The 12 upperclassman Houses read as "Adams
// House"; freshman Yard dorms (Canaday, Thayer, …) are NOT Houses, so they show
// as-is. Returns "" for an empty value.
export function residenceLabel(residence: string): string {
  if (!residence) return "";
  return houses.includes(residence) ? `${residence} House` : residence;
}

// ---- Screen 3: Primary activity + experience + conditional -------------------

export type PrimaryActivity = "gym" | "running" | "cardio" | "other";
export type ActivityOption = { key: PrimaryActivity; label: string; icon: string };

export const primaryActivities: ActivityOption[] = [
  { key: "gym", label: "Gym", icon: "barbell" },
  { key: "running", label: "Running", icon: "run" },
  { key: "cardio", label: "Cardio", icon: "activity" },
  { key: "other", label: "Other", icon: "plus" },
];

export type ExperienceLevel = { key: "beginner" | "intermediate" | "advanced"; name: string; desc: string };

export const experienceLevels: ExperienceLevel[] = [
  { key: "beginner", name: "Beginner", desc: "New to it, learning the basics." },
  { key: "intermediate", name: "Intermediate", desc: "Consistent for 1–3 years, know your numbers." },
  { key: "advanced", name: "Advanced", desc: "3+ years, structured programming." },
];

// Conditional sub-options (data-driven, editable).
export const gymSplits: string[] = ["Push-Pull-Legs", "Upper-Lower", "Full body", "Bro split", "Custom"];
export const cardioTypes: string[] = ["Cycling", "Rowing", "Swimming", "Elliptical", "Stair climber", "HIIT"];

// ---- Screen 4: Top gyms ------------------------------------------------------
// The verified gym list comes straight from the gym data the app already uses.
export const verifiedGyms: string[] = gyms.map((g) => g.name);
export const MAX_TOP_GYMS = 3;

// ---- Screen 5: When you train ------------------------------------------------
export type WeekDay = { key: string; label: string; letter: string };
export const weekDays: WeekDay[] = [
  { key: "mon", label: "Monday", letter: "M" },
  { key: "tue", label: "Tuesday", letter: "T" },
  { key: "wed", label: "Wednesday", letter: "W" },
  { key: "thu", label: "Thursday", letter: "T" },
  { key: "fri", label: "Friday", letter: "F" },
  { key: "sat", label: "Saturday", letter: "S" },
  { key: "sun", label: "Sunday", letter: "S" },
];

// Free-time blocks shown when a day is expanded (editable).
export const timeBlocks: string[] = ["Early AM", "AM", "Midday", "PM", "Late PM"];

// ---- Match → Session Search: precise time picker -----------------------------
// In Session Search you pick the hour you actually want to train (24h clock,
// 30-min steps). Matching then finds people free within SESSION_WINDOW_HOURS of
// it. NOTE: profiles today only store the coarse `timeBlocks` above; the precise
// hour is bridged onto those blocks in db/matching.sql (see `block_range`) until
// onboarding collects exact hours. Change the range/step here to widen choices.
export const SESSION_WINDOW_HOURS = 2;

export type TimeSlot = { value: number; label: string };

export const sessionTimeSlots: TimeSlot[] = (() => {
  const slots: TimeSlot[] = [];
  for (let h = 6; h <= 22; h++) {
    for (const m of [0, 30]) {
      if (h === 22 && m === 30) break; // stop at 10:00 PM
      const hour12 = ((h + 11) % 12) + 1;
      const ampm = h < 12 ? "AM" : "PM";
      slots.push({ value: h + m / 60, label: `${hour12}:${m === 0 ? "00" : "30"} ${ampm}` });
    }
  }
  return slots;
})();

// Pretty label for a chosen session hour value (e.g. 15.5 → "3:30 PM").
export function sessionTimeLabel(value: number): string {
  return sessionTimeSlots.find((s) => s.value === value)?.label ?? "";
}

// ---- Screen 6: Background (all optional) -------------------------------------

export const concentrations: string[] = [
  "Economics",
  "Computer Science",
  "Mathematics",
  "Applied Mathematics",
  "Statistics",
  "Government",
  "Social Studies",
  "History",
  "English",
  "Philosophy",
  "Psychology",
  "Sociology",
  "Anthropology",
  "Molecular & Cellular Biology",
  "Human Dev. & Regenerative Biology",
  "Neuroscience",
  "Integrative Biology",
  "Chemistry",
  "Chemistry & Physics",
  "Physics",
  "Astrophysics",
  "Earth & Planetary Sciences",
  "Environmental Sci. & Engineering",
  "Biomedical Engineering",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Engineering Sciences",
  "History & Literature",
  "History of Art & Architecture",
  "History of Science",
  "Linguistics",
  "Comparative Literature",
  "Classics",
  "East Asian Studies",
  "Near Eastern Languages & Civ.",
  "Romance Languages & Literatures",
  "Slavic Languages & Literatures",
  "Germanic Languages & Literatures",
  "Religion",
  "Music",
  "Theater, Dance & Media",
  "Art, Film & Visual Studies",
  "African & African American Studies",
  "Women, Gender & Sexuality",
  "Public Policy",
  "Undecided",
];

export const languageOptions: string[] = [
  "English",
  "Mandarin",
  "Spanish",
  "Hindi",
  "Arabic",
  "French",
  "Bengali",
  "Portuguese",
  "Russian",
  "German",
  "Japanese",
  "Korean",
  "Italian",
  "Czech",
  "Slovak",
  "Polish",
  "Turkish",
  "Dutch",
  "Greek",
  "Hebrew",
  "Vietnamese",
  "Thai",
  "Swedish",
  "Norwegian",
  "Danish",
  "Finnish",
  "Ukrainian",
  "Romanian",
  "Hungarian",
  "Persian",
  "Urdu",
  "Tagalog",
  "Swahili",
  "Other",
];

// ~32 fixed interest pills (multi-select).
export const interestOptions: string[] = [
  "Business",
  "Startups",
  "Finance",
  "Tech",
  "Music",
  "Art",
  "Film",
  "Photography",
  "Travel",
  "Reading",
  "Writing",
  "Gaming",
  "Cooking",
  "Coffee",
  "Outdoors",
  "Hiking",
  "Climbing",
  "Cycling",
  "Running",
  "Yoga",
  "Martial Arts",
  "Dance",
  "Fashion",
  "Volunteering",
  "Politics",
  "Science",
  "Sustainability",
  "Languages",
  "Chess",
  "Investing",
  "Podcasts",
  "Foodie",
];

// ---- Screen 7: Preferences ---------------------------------------------------
export const trainingTypes: { key: "solo" | "partner" | "either"; label: string }[] = [
  { key: "solo", label: "Solo" },
  { key: "partner", label: "Partner" },
  { key: "either", label: "Either" },
];

export const partnerPreferences: { key: "any" | "male" | "female"; label: string }[] = [
  { key: "any", label: "Any" },
  { key: "male", label: "Male" },
  { key: "female", label: "Female" },
];

// Toggle keys map directly to boolean fields on the profile.
export type ToggleKey = "mentorFreshmen" | "beMentored" | "helpOthers" | "getHelp";

export const peerAdvising: { key: ToggleKey; label: string; sub: string }[] = [
  { key: "mentorFreshmen", label: "Mentor freshmen", sub: "Help newcomers navigate Harvard." },
  { key: "beMentored", label: "Be mentored as a freshman", sub: "Get guidance from an upperclassman." },
];

export const gymMentorship: { key: ToggleKey; label: string; sub: string }[] = [
  { key: "helpOthers", label: "Help less experienced lifters", sub: "Form check, programming basics." },
  { key: "getHelp", label: "Get help from someone advanced", sub: "Learn from someone further along." },
];

// ---- Screen 9: Notifications -------------------------------------------------
// What users get notified about (NO streaks). Icons map to the icon set.
export const notificationItems: { icon: string; label: string }[] = [
  { icon: "heart", label: "Someone matches with you" },
  { icon: "message", label: "New messages" },
  { icon: "calendar", label: "Session invites" },
  { icon: "clock", label: "Session reminders" },
];

export const countries: string[] = [
  "United States", "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina",
  "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh",
  "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia",
  "Bosnia & Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso",
  "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Republic",
  "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia",
  "Cuba", "Cyprus", "Czechia", "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland",
  "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada",
  "Guatemala", "Guinea", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India",
  "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon",
  "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar",
  "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Mauritania", "Mauritius", "Mexico",
  "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
  "Namibia", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria",
  "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Panama",
  "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar",
  "Romania", "Russia", "Rwanda", "Saudi Arabia", "Senegal", "Serbia", "Singapore",
  "Slovakia", "Slovenia", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain",
  "Sri Lanka", "Sudan", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan",
  "Tanzania", "Thailand", "Togo", "Trinidad & Tobago", "Tunisia", "Turkey",
  "Turkmenistan", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "Uruguay",
  "Uzbekistan", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe",
];

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
  gymSplit: string;
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
  gymSplit: "",
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

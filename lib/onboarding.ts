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

/*
  "'27" is a fact you have to do arithmetic on: you subtract it from the year
  to learn that this person is a senior. Fr / So / Jr / Sr is what students
  actually say out loud, so it is what the app says.

  Derived from freshmanClassYear rather than written down, so when the first-year
  class rolls over each August every label in the app moves with it — one line of
  DATA changes and nothing else does.
*/
export function classYearLabel(classYear: string): string {
  const i = classYears.indexOf(classYear);
  const first = classYears.indexOf(freshmanClassYear);
  if (i < 0 || first < 0) return classYear;
  return ["Fr", "So", "Jr", "Sr"][first - i] ?? classYear;
}

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
  "Massachusetts Hall",
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

/*
  Not everyone lives in a dorm or a House. These sit at the BOTTOM of the list,
  under their own heading:
    • Dudley Co-op       — Harvard's cooperative house (Mass Ave / Sacramento St).
    • Dudley Community   — the non-residential community for off-campus students.
    • Living off campus  — an apartment, at home, commuting.
  `freshmen: false` means the option is only offered to upperclassmen: a
  first-year can't be in Dudley, but a first-year CAN live off campus.
*/
export const otherResidences: { name: string; freshmen: boolean }[] = [
  { name: "Dudley Co-op", freshmen: false },
  { name: "Dudley Community", freshmen: false },
  { name: "Living off campus", freshmen: true },
];

// Decoupled from any hardcoded year: freshmen see Yard dorms, everyone else
// houses — and both then see the "somewhere else" options underneath.
export function residenceOptions(classYear: string): string[] {
  const isFreshman = classYear === freshmanClassYear;
  const main = isFreshman ? yardDorms : houses;
  const rest = otherResidences
    .filter((o) => (isFreshman ? o.freshmen : true))
    .map((o) => o.name);
  return [...main, ...rest];
}

/*
  Which KIND of place a residence is. Drives the little emblem in the picker: a
  House gets its own two-colour sigil (those colours are gym data), a Yard dorm
  gets the neutral shield, anything else gets a pin.
*/
export type ResidenceKind = "house" | "dorm" | "other";

export function residenceKind(residence: string): ResidenceKind {
  if (houses.includes(residence)) return "house";
  if (yardDorms.includes(residence)) return "dorm";
  return "other";
}

// The heading a residence sits under in the picker.
export function residenceGroup(residence: string): string {
  switch (residenceKind(residence)) {
    case "house":
      return "Houses";
    case "dorm":
      return "First-year dorms";
    default:
      return "Somewhere else";
  }
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

/*
  Experience level is asked ONLY of people whose main thing is the gym — a
  runner is asked how long they've run instead (`runningExperience`), and
  someone doing cardio isn't asked at all. "Advanced" means nothing on a
  cross-trainer, and a wrong answer would feed matching.
*/
export type ExperienceLevel = { key: "beginner" | "intermediate" | "advanced"; name: string; desc: string };

export const experienceLevels: ExperienceLevel[] = [
  { key: "beginner", name: "Beginner", desc: "New to it, learning the basics." },
  { key: "intermediate", name: "Intermediate", desc: "Consistent for 1–3 years, know your numbers." },
  { key: "advanced", name: "Advanced", desc: "3+ years, structured programming." },
];

/*
  Conditional sub-options (data-driven, editable).

  GYM asks two things, in plain-English-first order:
    1. "How do you train?" — `gymStyles`, what you're actually chasing. Anyone
       can answer this, including someone who has never heard the word "split".
    2. "Your split" — `gymSplits`, optional, for people who program properly.
*/
export const gymStyles: string[] = [
  "Strength",
  "Muscle building",
  "General fitness",
  "Powerlifting",
  "CrossFit / functional",
  "Sport-specific",
];

export const gymSplits: string[] = ["Push-Pull-Legs", "Upper-Lower", "Full body", "Bro split", "Custom"];
export const cardioTypes: string[] = ["Cycling", "Rowing", "Swimming", "Elliptical", "Stair climber", "HIIT"];

/*
  RUNNING. Distance and pace are typed rather than picked, because "8 km at
  4:40" is a real answer and no list of buttons contains it. The unit switch
  only changes the EXAMPLES shown in the two fields — whatever is typed is
  stored exactly as typed, plus the unit it was typed in (`runningUnit`), so a
  mile-runner's "8:00" is never read as a kilometre pace.
*/
export type RunningUnit = "km" | "mi";

export const runningUnits: { key: RunningUnit; label: string }[] = [
  { key: "km", label: "Kilometres" },
  { key: "mi", label: "Miles" },
];

export const runningHints: Record<RunningUnit, { distance: string; pace: string }> = {
  km: { distance: "e.g. 8 km", pace: "e.g. 5:00 /km" },
  mi: { distance: "e.g. 5 mi", pace: "e.g. 8:00 /mi" },
};

// The runner's answer to "experience level" — how long they've been at it.
export const runningExperiences: string[] = [
  "Just started",
  "Under a year",
  "1–3 years",
  "3+ years",
];

// ---- Screen 3b: Anything else you do? ---------------------------------------
/*
  Your MAIN activity is asked about in full on screen 3. Everything ELSE you do
  is asked about as lightly as it possibly can be, on purpose.

  A gym session is an appointment: you and a partner have to be in the same
  building at the same hour, which is why screen 5 pins training to days and
  times. A run is not. You can run at any hour, from anywhere, so demanding a
  time for it would only put a fiction into the database. All matching actually
  needs is that you do it, roughly how often, and — ONLY if you happen to have
  one — a usual day. Leaving the days blank is the normal answer here, not a
  skipped question.

  This is the screen that fixes the person who lifts AND runs: until now they
  had to pick one, and were invisible to everyone looking for the other.
*/
export type OtherActivity = {
  key: PrimaryActivity;
  perWeek: string; // one of activityFrequencies; "" until they pick one
  days: string[]; // weekDay keys — empty is normal and fine
  note: string; // only "other" uses this: what the activity actually is
};

// How often, per week. Deliberately coarse — nobody knows their true average,
// and matching only needs to tell "now and then" apart from "most days".
export const activityFrequencies: string[] = ["1×", "2×", "3×", "4×", "5+"];

// Read a frequency back as a number, for matching. "5+" counts as 5.
export function frequencyPerWeek(value: string): number {
  return parseInt(value, 10) || 0;
}

/*
  The label each activity is offered under on this screen. Worded as the
  question it really is — "do you run too?" — rather than as a bare noun, so
  the screen reads as a follow-up to what you already answered.
*/
export const otherActivityLabels: Record<PrimaryActivity, string> = {
  gym: "I lift too",
  running: "I run too",
  cardio: "I do cardio too",
  other: "Something else",
};

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

/*
  The ready-made times on the "when do you train" screen. Each one is a REAL
  hour range, stored exactly as written ("17:00-19:00"), because that is what
  matching compares — db/matching.sql overlaps ranges, so 17:00–19:00 and
  17:30–19:30 score as the near-miss they really are.

  This replaced five named blocks ("AM", "PM", …). Those still exist in older
  profiles and are still understood everywhere — lib/schedule.ts widens them to
  the hours they always meant, and block_range() does the same in the database
  — but nothing writes them any more.
*/
export const trainingTimePresets: { label: string; slot: string }[] = [
  { label: "Early 6–8", slot: "06:00-08:00" },
  { label: "Morning 8–11", slot: "08:00-11:00" },
  { label: "Lunch 11–2", slot: "11:00-14:00" },
  { label: "Afternoon 2–5", slot: "14:00-17:00" },
  { label: "After class 5–7", slot: "17:00-19:00" },
  { label: "Evening 7–10", slot: "19:00-22:00" },
];

// Where a day starts when someone picks a day before picking a time.
export const DEFAULT_TRAINING_SLOT = "17:00-19:00";

// ---- Match → Session Search: precise time picker -----------------------------
// In Session Search you pick the hour you actually want to train (24h clock,
// 30-min steps). Matching then finds people free within SESSION_WINDOW_HOURS of
// it. Onboarding now collects real hours too, so the two sides finally speak the
// same language. Change the range/step here to widen choices.
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

/*
  The language everybody here already shares. It is switched on for everyone and
  can't be removed — you can't study at Harvard without it, so asking is noise,
  and letting someone un-tick it would only put a wrong answer into matching.
  White-label: a campus that teaches in another language changes THIS line.
*/
export const campusLanguage = "English";

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

/*
  ~32 ready-made interest pills (multi-select) — plus anything people type
  themselves. A typed interest is stored in the same `interests` list as the
  ready-made ones; "is it one of ours?" is just "is it in this array?", so
  matching, profiles and the leaderboards need to know nothing about it.
*/
export const MAX_INTEREST_LENGTH = 22;
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
/*
  TRAINING TYPE. Onboarding no longer asks this as three buttons — it asks one
  question, "Do you prefer to train alone?", and stores the answer here:
    ON  → "solo"   — you are left out of the Match tab entirely (db/matching.sql
                     drops `solo` candidates). Everything else keeps working:
                     you still browse Match yourself, and messages come and go
                     as normal.
    OFF → "either" — the normal, matchable state.
  The three-way list stays because the Profile tab's preferences sheet still
  offers it, and "partner" remains a valid stored value.
*/
export const TRAIN_ALONE_NOTE = "You won't appear on the Match tab. You can still browse it, and messages keep working.";

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
/*
  DISPLAY NAME CHECK — the one field everyone else sees.

  A profile in the audit was called ";plokjh" because the field accepted any
  keystroke at all (#24). This stays deliberately permissive: names come in
  every alphabet, so it doesn't demand a surname, capital letters, or Latin
  characters — it only rejects what can't be part of a name in any of them.
  Returns the message to show, or null when the name is fine.
*/
const NOT_IN_A_NAME = /[0-9;:,/\\|<>[\]{}()!@#$%^&*_=+~`"?]/;

export function nameError(value: string): string | null {
  const v = value.trim();
  if (v.length < 2) return "Please use at least 2 characters.";
  if (NOT_IN_A_NAME.test(v)) return "A name can’t contain numbers or symbols.";
  return null;
}

export type OnboardingProfile = {
  // Screen 1 — Basics
  name: string;
  classYear: string;
  sex: string;

  // Screen 2 — Where you live
  residence: string;

  /*
    Screen 3 — Primary activity + what that activity actually asks. Each sport
    asks its OWN follow-ups, so only some of these are ever filled in:
      gym     → experienceLevel, gymStyle, gymSplit (split optional)
      running → runningUnit, runningDistance, runningPace, runningExperience
      cardio  → cardioType
      other   → activityOther
  */
  primaryActivity: "" | "gym" | "running" | "cardio" | "other";
  activityOther: string;
  experienceLevel: "" | "beginner" | "intermediate" | "advanced";
  gymStyle: string;
  gymSplit: string;
  runningUnit: RunningUnit;
  runningDistance: string;
  runningPace: string;
  runningExperience: string;
  cardioType: string;

  /*
    Screen 3b — everything else you do, lightly (see OtherActivity above).
    This is what lets a gym-first person be found by someone hunting a runner.
  */
  otherActivities: OtherActivity[];

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
  gymStyle: "",
  gymSplit: "",
  runningUnit: "km",
  runningDistance: "",
  runningPace: "",
  runningExperience: "",
  cardioType: "",
  otherActivities: [],
  topGyms: [],
  trainingSchedule: {},
  concentration: "",
  hometownCountry: "",
  languages: [campusLanguage],
  interests: [],
  trainingType: "either",
  partnerPreference: "",
  mentorFreshmen: false,
  beMentored: false,
  helpOthers: false,
  getHelp: false,
  bio: "",
  photo: null,
};

/* ---- The half-finished answers ---------------------------------------------
  Onboarding is nine screens long and used to live only in React state, so
  anything that unmounted the flow — a refresh, a tab, the phone reclaiming the
  page — threw every answer away and put you back on screen 1.

  So the flow writes its progress here after every keystroke and reads it back
  on the way in. It is a DRAFT, not the profile: the real save still happens
  once, at the end, into the database (AppState.saveOnboarding). The draft is
  stamped with the account it belongs to, so signing in as someone else on the
  same phone never resumes a stranger's answers, and it is thrown away the
  moment the flow is finished or replayed.
*/
const DRAFT_KEY = "unisport.onboarding.draft";

type StoredDraft = { userId: string; step: number; profile: OnboardingProfile };

export function readOnboardingDraft(
  userId: string | null,
): { step: number; profile: OnboardingProfile } | null {
  if (!userId || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as StoredDraft;
    if (draft.userId !== userId) return null;
    // Spread over the empty profile so a draft written before a field existed
    // still loads, with the new field at its default rather than undefined.
    return { step: draft.step, profile: { ...emptyProfile, ...draft.profile } };
  } catch {
    return null; // unreadable draft is not worth an error — just start fresh
  }
}

export function writeOnboardingDraft(
  userId: string | null,
  step: number,
  profile: OnboardingProfile,
): void {
  if (!userId || typeof window === "undefined") return;
  try {
    const draft: StoredDraft = { userId, step, profile };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // A full or blocked localStorage must never break onboarding.
  }
}

export function clearOnboardingDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // nothing to do
  }
}

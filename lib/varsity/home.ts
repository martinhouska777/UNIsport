/*
  VARSITY HOME — DATA (source of truth for the Home screen)
  ------------------------------------------------------------------
  Everything the Home screen shows lives here as data, so the screen is just a
  renderer. Later this comes from the database (coach's plan, the athlete's
  logged sessions, the day's lineup). For now it's the mock day from the
  mockup so the layout can be reviewed.

  Session "kind" is the CALENDAR's colour axis — the thing a month of squares
  is read by. It answers "how hard was that day", which is why the three
  intensities the coach actually plans in each get their own colour.
*/

import type { Boat, Side } from "./coachLineup";

export type SessionKind = "ut2" | "ut1" | "hard" | "weights" | "flex" | "race" | "off";

/*
  kind -> one colour, applied by INLINE STYLE.

  These are per-entity content colours living in a data file, which is the
  documented exception to rule 1 — the same exception lib/varsity/coachPlan.ts
  already uses, and deliberately the same VALUES: UT1's amber and the purple of
  a weights day are copied from the plan builder's own palette, so one session
  cannot be two colours depending on which screen you are looking at. Flex —
  the coach's "train how you like" day — is the one that does NOT take the plan
  builder's colour: pink, because every other clear hue was already spoken for and
  a grey flex day would be mistaken for a rest day.

  Green / amber / red are the coach's spreadsheet order — steady, rate work,
  flat out — and Race gets blue because it is not an intensity at all, it is the
  day the training was for.
*/
export const kindColor: Record<SessionKind, string> = {
  ut2: "var(--success)",
  ut1: "#eab308",
  hard: "var(--danger)",
  weights: "#c084fc",
  flex: "#ec4899",
  race: "#3b82f6",
  // Not in the legend (see below) — a rest day still needs SOMETHING to draw.
  off: "var(--muted)",
};

/** Solid edge — the 3px bar down the side of a session row. */
export const kindBar = (k: SessionKind) => ({ background: kindColor[k] });

/** Tinted fill — the block a calendar cell is painted with. */
export const kindBlock = (k: SessionKind) => ({
  background: `color-mix(in oklab, ${kindColor[k]} 28%, transparent)`,
});

/*
  What the colours mean, in the order they are shown. Lives here rather than in
  a screen because BOTH month calendars print it — the plan's (Home) and the
  athlete's own training history (Calendar) — and two copies would drift the
  first time a kind is renamed (rule 7).

  OFF IS DELIBERATELY ABSENT. A legend is for reading the training; a rest day
  is the absence of it, and it was spending a slot to say "grey means nothing
  happened". Off days still draw in grey, they just aren't explained.
*/
export const kindLegend: { kind: SessionKind; label: string }[] = [
  { kind: "ut2", label: "UT2" },
  { kind: "ut1", label: "UT1" },
  { kind: "hard", label: "Hard" },
  { kind: "weights", label: "Weights" },
  { kind: "flex", label: "Flex" },
  { kind: "race", label: "Race" },
];

export type SessionStatus = "verified" | "upcoming" | "flagged" | "missed";

export type DaySession = {
  time: string; // period: "AM" | "PM" | "ALL"
  clock?: string; // start time, e.g. "7:00 AM"
  label: string; // workout description ("3×25' UT2") or category name — shown in cells
  type?: string; // category · intensity, e.g. "Water · UT2" — shown in the day detail
  kind: SessionKind;
  note?: string; // coach note for this session
};
export type WeekDay = {
  letter: string;
  num: number;
  iso: string; // yyyy-mm-dd — lets the month calendar place the day in a grid
  dateLabel?: string; // e.g. "Wed · May 20" — header for the day detail
  today?: boolean;
  dimmed?: boolean;
  sessions: DaySession[];
};

export type VerifyStat = { label: string; value: string; ok: boolean };
export type CoachNote = { coach: string; text: string };
export type TodaySession = {
  period: string; // what's SHOWN, e.g. "AM · 6:00"
  /* Which half of the day this is, as a key rather than a label. The card uses
     it to find its own boat among the day's lineups — reading "AM" back out of
     the display string would break the first time the label changes. */
  periodKey: "AM" | "PM";
  location: string;
  status: SessionStatus;
  kind: SessionKind;
  title: string;
  detail: string;
  coachNote?: CoachNote;
  verify?: VerifyStat[];
};

/*
  ONE SEAT IN A PUBLISHED BOAT. `side` is the ATHLETE'S side, not the seat's —
  the seats themselves stopped carrying a side on the owner's call (a rig is
  the coach's business), but which way a person rows is a fact about them, and
  it is the only marker beside a name in the boat.
*/
export type Seat = { num: string; init: string; name: string; mine?: boolean; side?: Side };
export type Lineup = {
  period: string; // shown: "AM · Resolute · 7:15am"
  periodKey: "AM" | "PM"; // matched on: which session this boat belongs to
  type: string; // "Eight" | "Four" etc.
  seats: Seat[];
  cox?: { init: string; name: string; mine?: boolean }; // coxless boats (4-/2-) have none
  oars?: string; // which set to take off the rack, when the coach named one
  /** The shell's name, on its own — "Resolute", or a crew name like "1V". */
  name?: string;
  /** When this crew pushes off, e.g. "7:15am". */
  dock?: string;
  /** The coach's note to this crew, if they wrote one. */
  note?: string;
  /*
    WHICH BOAT THIS IS, in the terms the rest of the app stores it in: the
    practice it belongs to, and the coach's own Boat record. Only a lineup read
    from the database carries them (the demo day has no boat to attach anything
    to), which is exactly the test for whether video can hang off it — footage
    is filed by crew, and a made-up crew has none.
  */
  dayKey?: string;
  boat?: Boat;
};

/*
  WHAT TO CALL A BOAT on a page listing several of them.

  A crew answers to a name before it answers to a rig: the coach's own name for
  it first ("Resolute", or a crew name like "1V"), and when they haven't named
  it, the person the crew is known by — the cox, who is the voice of the boat,
  and failing that the stroke, who sets it. Only when the boat is empty of both
  does it fall back to what kind of boat it is, because "Eight" tells you
  nothing about WHICH eight.

  `tag` says which of those answered, so a name alone is never mistaken for a
  shell's name. Null when the title is the coach's own.
*/
export function boatTitle(l: Lineup): { title: string; tag: string | null } {
  const named = l.name?.trim();
  if (named) return { title: named, tag: null };
  const cox = l.cox?.name;
  if (cox && cox !== "—") return { title: cox, tag: "Cox" };
  // The stroke sits LAST in the array — the seats run bow → stroke.
  const stroke = [...l.seats].reverse().find((s) => s.name && s.name !== "—");
  if (stroke) return { title: stroke.name, tag: "Stroke" };
  return { title: l.type, tag: null };
}

export type Greeting = { date: string; name: string; block: string; week: string };
// `big` is the headline (e.g. "Today", "Tomorrow", or a number like "12");
// `small` is the optional caption under a number ("Days"/"Day"). When the race
// has already passed, the Home screen drops the race entirely (race = null).
export type Race = { name: string; location: string; big: string; small?: string };
export type Focus = { coach: string; when: string; text: string; tags: string[] };

// One Mon–Sun week of the plan, with a short range label ("May 18 – 24").
export type WeekView = { label: string; days: WeekDay[] };

// The full shape the Home screen renders. The athlete view builds this from the
// published plan (lib/varsity/athleteHome.ts); the object below is demo data.
// `weeks` is every week of the current block (so the strip can swipe / show the
// month); `weekIndex` is the one containing today.
export type HomeData = {
  greeting: Greeting;
  race: Race | null;
  weeks: WeekView[];
  weekIndex: number;
  today: TodaySession[];
  lineups: Lineup[];
  focus: Focus;
};

export const home: HomeData = {
  greeting: {
    date: "Friday · May 22",
    name: "Martin",
    block: "SPRING BLOCK 3",
    week: "Week 8 of 12",
  },
  race: {
    name: "Harvard vs Yale Regatta",
    location: "Thames River, CT · 8:00 AM start",
    big: "Tomorrow",
  },
  weekIndex: 0,
  weeks: [
    {
      label: "May 18 – 24",
      days: [
        { letter: "M", num: 18, iso: "2026-05-18", sessions: [
          { time: "AM", label: "UT2 erg", kind: "ut2" },
          { time: "PM", label: "Weights", kind: "weights" },
        ] },
        { letter: "T", num: 19, iso: "2026-05-19", sessions: [{ time: "AM", label: "UT2 run", kind: "ut2" }] },
        { letter: "W", num: 20, iso: "2026-05-20", sessions: [{ time: "ALL", label: "OFF", kind: "off" }] },
        { letter: "T", num: 21, iso: "2026-05-21", sessions: [
          { time: "AM", label: "UT2 erg", kind: "ut2" },
          { time: "PM", label: "RP3", kind: "hard" },
        ] },
        { letter: "F", num: 22, iso: "2026-05-22", today: true, sessions: [
          { time: "AM", label: "UT2 run", kind: "ut2" },
          { time: "PM", label: "RP3 4x5'", kind: "hard" },
        ] },
        { letter: "S", num: 23, iso: "2026-05-23", sessions: [{ time: "AM", label: "RACE", kind: "race" }] },
        { letter: "S", num: 24, iso: "2026-05-24", dimmed: true, sessions: [{ time: "ALL", label: "Flex", kind: "flex" }] },
      ] as WeekDay[],
    },
  ],
  today: [
    {
      period: "AM · 7:00",
      periodKey: "AM" as const,
      location: "In house",
      status: "verified",
      kind: "ut2",
      title: "UT2 · 6 mile run",
      detail: "Easy aerobic · keep HR under 155",
      coachNote: {
        coach: "COACH DORNEY",
        text: "Save the legs. Tomorrow is race day — stay easy, stay fresh.",
      },
      verify: [
        { label: "Duration", value: "52:18", ok: true },
        { label: "HR avg", value: "148", ok: true },
        { label: "Zone", value: "UT2 ✓", ok: true },
      ],
    },
    {
      period: "PM · 4:30",
      periodKey: "PM" as const,
      location: "Palmer Dixon",
      status: "upcoming",
      kind: "hard",
      title: "RP3 · 4x5' (1:30 at r32, 2k+2)",
      detail: "Target: 1:28.5 avg · hold rate",
      coachNote: {
        coach: "COACH DORNEY",
        text: "Last hard piece before race. Hit splits, don't bury yourself. Get out clean.",
      },
    },
  ] as TodaySession[],
  // The real Home builds lineups from the published DB lineup (see
  // lib/varsity/lineupStore.ts → fetchTodayLineups); this demo object only
  // still feeds `focus`, so the lineup sample is left empty.
  lineups: [] as Lineup[],
  focus: {
    coach: "COACH DORNEY · FOCUS THIS WEEK",
    when: "Updated Monday",
    text: "Finish the stroke. You're all rushing at the catch and leaving the drive unfinished. Drive through to the hips before you extract.",
    tags: ["Finish", "Drive", "Ratio"],
  },
};

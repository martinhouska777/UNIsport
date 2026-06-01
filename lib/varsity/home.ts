/*
  VARSITY HOME — DATA (source of truth for the Home screen)
  ------------------------------------------------------------------
  Everything the Home screen shows lives here as data, so the screen is just a
  renderer. Later this comes from the database (coach's plan, the athlete's
  logged sessions, the day's lineup). For now it's the mock day from the
  mockup so the layout can be reviewed.

  Session "kind" maps to a THEME TOKEN (not a hardcoded color), so the colored
  blocks/bars re-skin with the theme. See `kindStyles` for the literal Tailwind
  classes (literals so Tailwind can see them).
*/

export type SessionKind = "ut2" | "hard" | "weights" | "off" | "recovery" | "race";

// kind -> token-based classes. `bar` = solid edge, `block` = tinted strip.
export const kindStyles: Record<SessionKind, { bar: string; block: string }> = {
  ut2: { bar: "bg-success", block: "bg-success/25" },
  hard: { bar: "bg-danger", block: "bg-danger/30" },
  weights: { bar: "bg-warn", block: "bg-warn/30" },
  off: { bar: "bg-muted", block: "bg-muted/20" },
  recovery: { bar: "bg-accent", block: "bg-accent/25" },
  race: { bar: "bg-primary", block: "bg-primary/40" },
};

export type SessionStatus = "verified" | "upcoming" | "flagged" | "missed";

export type DaySession = { time: string; label: string; kind: SessionKind };
export type WeekDay = {
  letter: string;
  num: number;
  today?: boolean;
  dimmed?: boolean;
  sessions: DaySession[];
};

export type VerifyStat = { label: string; value: string; ok: boolean };
export type CoachNote = { coach: string; text: string };
export type TodaySession = {
  period: string;
  location: string;
  status: SessionStatus;
  kind: SessionKind;
  title: string;
  detail: string;
  coachNote?: CoachNote;
  verify?: VerifyStat[];
};

export type Seat = { num: string; init: string; mine?: boolean };
export type Lineup = {
  period: string;
  type: string; // "Eight" | "Four" etc.
  seats: Seat[];
  cox?: { init: string }; // coxless boats (4-/2-) have none
};

export type Greeting = { date: string; name: string; block: string; week: string };
export type Race = { name: string; location: string; count: number; unit: string };
export type Focus = { coach: string; when: string; text: string; tags: string[] };

// The full shape the Home screen renders. The athlete view builds this from the
// published plan (lib/varsity/athleteHome.ts); the object below is demo data.
export type HomeData = {
  greeting: Greeting;
  race: Race | null;
  week: WeekDay[];
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
    count: 1,
    unit: "Day",
  },
  week: [
    { letter: "M", num: 18, sessions: [
      { time: "AM", label: "UT2 erg", kind: "ut2" },
      { time: "PM", label: "Weights", kind: "weights" },
    ] },
    { letter: "T", num: 19, sessions: [{ time: "AM", label: "UT2 run", kind: "ut2" }] },
    { letter: "W", num: 20, sessions: [{ time: "ALL", label: "OFF", kind: "off" }] },
    { letter: "T", num: 21, sessions: [
      { time: "AM", label: "UT2 erg", kind: "ut2" },
      { time: "PM", label: "RP3", kind: "hard" },
    ] },
    { letter: "F", num: 22, today: true, sessions: [
      { time: "AM", label: "UT2 run", kind: "ut2" },
      { time: "PM", label: "RP3 4x5'", kind: "hard" },
    ] },
    { letter: "S", num: 23, sessions: [{ time: "AM", label: "RACE", kind: "race" }] },
    { letter: "S", num: 24, dimmed: true, sessions: [{ time: "ALL", label: "Recov", kind: "recovery" }] },
  ] as WeekDay[],
  today: [
    {
      period: "AM · 7:00",
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
  lineups: [
    {
      period: "AM · 2V Eight · Dock 7:00",
      type: "Eight",
      seats: [
        { num: "1", init: "JB" },
        { num: "2", init: "SR" },
        { num: "3", init: "TK" },
        { num: "4", init: "ME", mine: true },
        { num: "5", init: "AC" },
        { num: "6", init: "PL" },
        { num: "7", init: "JD" },
        { num: "8", init: "EH" },
      ],
      cox: { init: "DO" },
    },
    {
      period: "PM · 2V Four · Palmer Dixon 4:30",
      type: "Four",
      seats: [
        { num: "1", init: "JB" },
        { num: "2", init: "ME", mine: true },
        { num: "3", init: "TK" },
        { num: "4", init: "AC" },
      ],
      cox: { init: "DO" },
    },
  ] as Lineup[],
  focus: {
    coach: "COACH DORNEY · FOCUS THIS WEEK",
    when: "Updated Monday",
    text: "Finish the stroke. You're all rushing at the catch and leaving the drive unfinished. Drive through to the hips before you extract.",
    tags: ["Finish", "Drive", "Ratio"],
  },
};

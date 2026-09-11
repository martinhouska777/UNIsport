/*
  VARSITY HOME — DATA (source of truth for the Home screen)
  ------------------------------------------------------------------
  The TYPES the Home screen renders and the colour axis they share, so the
  screen is just a renderer. The data itself is built in lib/varsity/
  athleteHome.ts from the coach's published plan, the athlete's own log and
  the day's published boats.

  Session "kind" is the CALENDAR's colour axis — the thing a month of squares
  is read by. It answers "how hard was that day", which is why the three
  intensities the coach actually plans in each get their own colour.
*/

import { defaultBoatName, type Boat, type Side } from "./coachLineup";

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
  PLANNED, NOT YET DONE — the same colour, but a fainter fill with the colour
  drawn round the edge. The Calendar tab paints one month from two sources
  (the coach's plan ahead of today, your own log behind it), and today is the
  one day both can appear in a single cell, so a prescribed session that has not
  been logged must not look like one that has.
*/
export const kindPlanned = (k: SessionKind) => ({
  background: `color-mix(in oklab, ${kindColor[k]} 12%, transparent)`,
  boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${kindColor[k]} 55%, transparent)`,
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

/*
  WHERE A SESSION STANDS, read off the athlete's own log (lib/varsity/logStore):

    upcoming  — not logged, and the day is today or later
    done      — a log exists for this plan slot
    missed    — not logged, and the day has gone

  Three states, all derived. There used to be five, and only "upcoming" was
  ever reachable — Home did not read the log at all, so this morning's erg said
  UPCOMING in grey at nine at night.
*/
export type SessionStatus = "upcoming" | "done" | "missed";

/** The logged result, as one line: "75 min · 18,000 m · 1:52". */
export type LoggedSummary = { summary: string };

export type DaySession = {
  time: string; // period: "AM" | "PM" | "ALL"
  clock?: string; // start time, e.g. "7:00 AM"
  location?: string; // where to be, when the coach said
  label: string; // workout description ("3×25' UT2") or category name — shown in cells
  type?: string; // category · intensity, e.g. "Water · UT2" — shown in the day detail
  kind: SessionKind;
  note?: string; // coach note for this session
  dayKey: string; // the plan slot (coachPlan → sessionKey) this session lives in
  status: SessionStatus;
  log?: LoggedSummary;
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

export type CoachNote = { coach: string; text: string };
export type TodaySession = {
  period: string; // what's SHOWN, e.g. "AM · 6:00"
  /* Which half of the day this is, as a key rather than a label. The card uses
     it to find its own boat among the day's lineups — reading "AM" back out of
     the display string would break the first time the label changes. */
  periodKey: "AM" | "PM";
  /* The plan slot and the calendar day, so a Log button on the card can open
     exactly this session's editor (/varsity/log?day=…&open=…). */
  dayKey: string;
  iso: string; // yyyy-mm-dd
  location: string;
  status: SessionStatus;
  log?: LoggedSummary;
  kind: SessionKind;
  title: string;
  detail: string;
  coachNote?: CoachNote;
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
  /** The rig, as a crew says it: "8+", "4-", "2-". Heads the card. */
  badge?: string;
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
  WHAT HEADS A BOAT'S CARD: which half of the day, and what rig — "AM 2-".

  The owner's call, and it is how a crew says it out loud. `type` ("Pair",
  "Eight") is the fallback for a lineup old enough not to have stored its rig.
*/
export const boatHeading = (l: Lineup) => `${l.periodKey} ${l.badge ?? l.type}`;

/*
  IS THIS A PUSH-OFF TIME?

  `boat.dock` is the time the crew pushes off, and the coach's builder only ever
  offers times. Lineups written before that — the demo squad included — used the
  same field for the BOATHOUSE ("Newell", "Weld"), and a card that prints
  whatever it finds put a boathouse where the athlete looks for a time. So the
  time slot on a card asks first, and shows nothing rather than something that
  is not a time.
*/
const PUSH_OFF_TIME = /^\d{1,2}[:.]\d{2}\s*(am|pm)?$/i;
export const isPushOffTime = (s?: string | null): boolean =>
  !!s && PUSH_OFF_TIME.test(s.trim());

/** When the boat pushes off, or null when nobody set a time. */
export const dockTime = (l: Lineup): string | null =>
  isPushOffTime(l.dock) ? l.dock!.trim() : null;

/*
  WHICH SHELL TO CARRY DOWN — "Hosea", "Mississippi". The coach types it in the
  builder's BOAT field; a boat still called "New 8+" has not been named, so
  there is nothing to write on the BOAT line.
*/
export function shellName(l: Lineup): string | null {
  const named = l.name?.trim();
  if (!named || named === defaultBoatName(l.badge ?? "")) return null;
  return named;
}

/** "Cate Frerichs" → "Frerichs". A crew is known by a surname, not a full name. */
const surname = (full: string) => full.trim().split(/\s+/).pop() || full;

/*
  WHICH BOAT THIS IS, when the day has three of them.

  "AM 8+" alone is true of every eight that went out that morning, so the
  heading carries a second word: the coach's own name for the boat when they
  gave it one, and when they didn't — a boat straight out of the builder is
  still called "New 8+", which is a placeholder and not a name — the person the
  crew is known by. The COX first, who is the voice of the boat, then the
  STROKE, who sets it, by surname either way.

  Null when the boat is empty of all three, which is the only case where the
  rig really is all there is to say.
*/
export function crewName(l: Lineup): string | null {
  const named = shellName(l);
  if (named) return named;
  const cox = l.cox?.name;
  if (cox && cox !== "—") return surname(cox);
  // The stroke sits LAST in the array — the seats run bow → stroke.
  const stroke = [...l.seats].reverse().find((s) => s.name && s.name !== "—");
  return stroke ? surname(stroke.name) : null;
}

/** Every name aboard, for the All-boats search. Lowercased, cox included. */
export const crewNames = (l: Lineup): string[] =>
  [...l.seats.map((s) => s.name), l.cox?.name ?? ""]
    .filter((n) => n && n !== "—")
    .map((n) => n.toLowerCase());

export type Greeting = { date: string; name: string; block: string; week: string };
// `big` is the headline (e.g. "Today", "Tomorrow", or a number like "12");
// `small` is the optional caption under a number ("Days"/"Day"). When the race
// has already passed, the Home screen drops the race entirely (race = null).
export type Race = { name: string; location: string; big: string; small?: string };

// One Mon–Sun week of the plan, with a short range label ("May 18 – 24").
export type WeekView = { label: string; days: WeekDay[] };

/*
  The full shape the Home screen renders. Built from the published plan AND the
  athlete's own log by lib/varsity/athleteHome.ts. `weeks` is every week of the
  current block (so the strip can swipe / show the month); `weekIndex` is the
  one containing today.

  A demo copy of this object used to live here, from the original mockup. It
  fed exactly one field — a "coach's focus" paragraph the screen no longer
  rendered — and carried the statuses that were never reachable, so it went.
*/
export type HomeData = {
  greeting: Greeting;
  race: Race | null;
  weeks: WeekView[];
  weekIndex: number;
  today: TodaySession[];
  lineups: Lineup[];
};


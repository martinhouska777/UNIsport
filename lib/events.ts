/*
  EVENTS — the short races that run alongside the boards, as DATA.
  ---------------------------------------------------------------------------
  A board is a standing. An EVENT is the opposite of that on purpose: it opens
  on a Monday or the 1st, it is gone when the window closes, and finishing it
  pays BONUS POINTS on top of whatever the sessions were already worth. That is
  the reason to open the app on a Monday rather than at the end of term.

  TWO KINDS, and they are not the same thing:

    PERSONAL — yours. One weekly and two monthly running at once.
    THE INTERHOUSE RACE — one a month, run by every eligible house at once and
               ranked. It pays into the HOUSE's points, not yours.

  THE RACE IS GATED, AND THE GATE IS THE POINT. A house has to have earned
  `HOUSE_ENTRY_PER_MEMBER` points per member, all time, before it can enter.
  That turns "we need more people using this" from a wish into a door with a
  number on it — and because it is per member, a big house cannot open it on
  size and three keen people cannot carry a house of forty.

  NO ADMIN, EVER. Which event runs is decided by the WEEK or MONTH NUMBER, so
  the whole campus sees the same one, it changes on its own, and nobody has to
  remember to set anything. Adding an event later is an entry in one of the
  lists below — data, not code (rule 7).

  WHY EVENTS HAVE PARTS. Most ask one thing ("train five days"). One asks two
  at once — three lifts AND two runs in a week — and a single metric with a
  single number cannot express that. So every event carries a LIST of
  conditions and is finished when all of them are met. A one-condition event is
  just a list of one, so there is no special case anywhere downstream.
*/

/* ─────────────────────────────  the gate  ───────────────────────────── */

/**
 * Points per member, all time, that a house needs before it can enter the
 * interhouse race.
 *
 * Sixty is roughly four to six sessions from every single person who lives
 * there — reachable in a first term by a house that is actually using the app,
 * and out of reach for one where three people are. It is a guess until there
 * is real data to tune it against, which is exactly why it is one number in
 * one file.
 */
export const HOUSE_ENTRY_PER_MEMBER = 60;

/* ══════════════════════  distance, and what it's worth  ══════════════════════ */

/*
  A kilometre is not a kilometre. Running and rowing count 1:1; cycling counts a
  third, because three kilometres on a bike is roughly one on your feet and
  without that a single long ride would win any distance event outright.

  ANYTHING NOT NAMED HERE COUNTS 1:1. That is the safe default rather than the
  correct one, and swimming is the case worth knowing about: it is the most
  logged cardio on this campus by a distance, and a swum kilometre is far harder
  than a run one, so at 1:1 swimmers have the easiest route to a distance event.
  Left at 1 deliberately — it is one number here to change once somebody
  decides what a swum kilometre is worth.
*/
export const distanceWeight: Record<string, number> = {
  running: 1,
  rowing: 1,
  cycling: 1 / 3,
};

/*
  Logged distances are not even in the same unit: rowing goes in as metres,
  running and swimming in kilometres. Everything is normalised to kilometres
  before it is weighted, or a 2,000 m row would read as two thousand.
*/
export const unitToKm: Record<string, number> = {
  km: 1,
  m: 0.001,
  mi: 1.60934,
};

/**
 * What one logged session's distance is worth, in weighted kilometres.
 *
 * `kind` is the activity for a run and the cardio type otherwise ("Rowing",
 * "Cycling", "Swimming"), lowercased by the caller — the stored values are
 * capitalised and the weights above are not.
 */
export function weightedKm(distance: number, unit: string, kind: string): number {
  if (!Number.isFinite(distance) || distance <= 0) return 0;
  const km = distance * (unitToKm[unit?.toLowerCase()] ?? 1);
  return km * (distanceWeight[kind?.toLowerCase()] ?? 1);
}

/* ─────────────────────────────  types  ───────────────────────────── */

/**
 * Everything an event can be measured on. Each one is countable from the
 * workout_logs a person already has — nothing here needs a new question asked
 * at logging time.
 */
export type EventMetric =
  | "days" // separate days trained on
  | "newPartners" // people trained with for the first time ever
  | "gymSessions" // sessions logged as a gym session
  | "runSessions" // sessions logged as a run
  | "distance" // weighted kilometres (see above)
  | "actives"; // house only: how many members trained at all

export type EventWindow = "week" | "month";

/** One condition. An event is finished when every part of it is met. */
export type EventPart = {
  metric: EventMetric;
  target: number;
  /** How this part reads on a progress bar: "days", "runs", "km". */
  unit: string;
};

export type SportEvent = {
  key: string;
  title: string;
  /** One line, plain English, saying what finishing it takes. */
  blurb: string;
  parts: EventPart[];
  /** Bonus points on finishing. A house event pays the house. */
  points: number;
  window: EventWindow;
  /**
   * House events only: the target is per member, so a house of forty is asked
   * for forty times as much as a house of one. Without this the biggest house
   * wins every race by existing.
   */
  perMember?: boolean;
};

/* ═════════════════════════  personal · weekly  ═════════════════════════ */

/*
  One of these runs each week, chosen by the week number. Two shapes only, on
  purpose: TURN UP (three days, five days) and MEET SOMEBODY (one, three), plus
  the hybrid that asks for both kinds of training in the same week. Nothing in
  here is "log more sessions", which is only the boards again in a smaller font.
*/
export const weeklyEvents: SportEvent[] = [
  {
    key: "w-three-days",
    title: "Three days",
    blurb: "Train on three separate days before Sunday night.",
    parts: [{ metric: "days", target: 3, unit: "days" }],
    points: 60,
    window: "week",
  },
  {
    key: "w-five-days",
    title: "Five days",
    blurb: "Turn up on five separate days this week.",
    parts: [{ metric: "days", target: 5, unit: "days" }],
    points: 100,
    window: "week",
  },
  {
    key: "w-one-new",
    title: "Meet somebody new",
    blurb: "Train with one person you have never trained with before.",
    parts: [{ metric: "newPartners", target: 1, unit: "people" }],
    points: 70,
    window: "week",
  },
  {
    key: "w-three-new",
    title: "Three new people",
    blurb: "Three people you had never trained with before, in one week.",
    parts: [{ metric: "newPartners", target: 3, unit: "people" }],
    points: 140,
    window: "week",
  },
  {
    key: "w-hybrid",
    title: "Three lifts, two runs",
    blurb: "Five sessions this week — but three of them in a gym and two on your feet.",
    parts: [
      { metric: "gymSessions", target: 3, unit: "lifts" },
      { metric: "runSessions", target: 2, unit: "runs" },
    ],
    points: 120,
    window: "week",
  },
];

/* ═════════════════════════  personal · monthly  ═════════════════════════ */

/*
  The same challenges at a month's scale, plus the distance one — a month is
  long enough for kilometres to be worth asking for, where a week is not (the
  app has no watch and no Strava import, so a weekly distance event would sit
  at 12% all week and teach people the events are decoration).

  TWO of these run at once, chosen by the month number, so a month always has
  a long target and a second one alongside it.
*/
export const monthlyEvents: SportEvent[] = [
  {
    key: "m-hundred",
    title: "The Hundred",
    blurb: "A hundred kilometres this month. Running and rowing count in full, cycling a third.",
    parts: [{ metric: "distance", target: 100, unit: "km" }],
    points: 300,
    window: "month",
  },
  {
    key: "m-thirteen-days",
    title: "Thirteen days",
    blurb: "Train on thirteen separate days — three a week, near enough.",
    parts: [{ metric: "days", target: 13, unit: "days" }],
    points: 250,
    window: "month",
  },
  {
    key: "m-twenty-days",
    title: "Twenty days",
    blurb: "Twenty separate days in one month. Five a week, all month.",
    parts: [{ metric: "days", target: 20, unit: "days" }],
    points: 400,
    window: "month",
  },
  {
    key: "m-four-new",
    title: "Four new people",
    blurb: "Four people you had never trained with before.",
    parts: [{ metric: "newPartners", target: 4, unit: "people" }],
    points: 280,
    window: "month",
  },
  {
    key: "m-ten-new",
    title: "Ten new people",
    blurb: "Ten people you had never trained with before, in one month.",
    parts: [{ metric: "newPartners", target: 10, unit: "people" }],
    points: 500,
    window: "month",
  },
  {
    key: "m-hybrid",
    title: "Twelve lifts, eight runs",
    blurb: "Both kinds of training, all month: twelve in a gym and eight on your feet.",
    parts: [
      { metric: "gymSessions", target: 12, unit: "lifts" },
      { metric: "runSessions", target: 8, unit: "runs" },
    ],
    points: 450,
    window: "month",
  },
];

/* ═══════════════════════  the interhouse race  ═══════════════════════ */

/*
  NOT SETTLED YET — the owner is deciding these, and this list is a placeholder
  so the gate below has something to gate. What IS settled is the shape: one a
  month, every house past the gate running the same one, targets PER MEMBER so
  a race is about how much of a house turns out rather than how big it is.
*/
export const houseEvents: SportEvent[] = [
  {
    key: "h-everyone-in",
    title: "Everyone in",
    blurb: "Get every single member to log at least one session this month.",
    parts: [{ metric: "actives", target: 1, unit: "members" }],
    perMember: true,
    points: 1200,
    window: "month",
  },
];

/* ─────────────────  which ones are running right now  ───────────────── */

/**
 * Which week it is. Used only to pick an event, so it needs to agree with
 * itself week to week rather than match anybody's calendar exactly.
 */
export function weekNumber(now = new Date()): number {
  const start = Date.UTC(now.getUTCFullYear(), 0, 1);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((today - start) / (7 * 24 * 60 * 60 * 1000));
}

/** Months since year zero, so the choice keeps moving across a year boundary. */
export function monthNumber(now = new Date()): number {
  return now.getUTCFullYear() * 12 + now.getUTCMonth();
}

/** The one personal weekly event everybody on campus is running. */
export function weeklyEventNow(now = new Date()): SportEvent {
  return weeklyEvents[weekNumber(now) % weeklyEvents.length];
}

/**
 * The two personal monthly events. Stepping the second one by a different
 * amount stops the same pair coming up together every time.
 */
export function monthlyEventsNow(now = new Date()): SportEvent[] {
  const n = monthNumber(now);
  const first = monthlyEvents[n % monthlyEvents.length];
  const second = monthlyEvents[(n * 2 + 1) % monthlyEvents.length];
  // The two can still land on the same entry; take the next one along rather
  // than showing the same event twice.
  if (second.key !== first.key) return [first, second];
  return [first, monthlyEvents[(n + 1) % monthlyEvents.length]];
}

/** The interhouse race for this month. */
export function houseEventNow(now = new Date()): SportEvent {
  return houseEvents[monthNumber(now) % houseEvents.length];
}

/* ─────────────────────────────  progress  ───────────────────────────── */

/**
 * What one part of an event actually asks for. A house target is multiplied by
 * how many people live there.
 */
export function partTarget(event: SportEvent, part: EventPart, members = 1): number {
  return event.perMember ? part.target * Math.max(members, 1) : part.target;
}

/** Finished only when every condition is met — see "WHY EVENTS HAVE PARTS". */
export function eventDone(
  event: SportEvent,
  counts: Partial<Record<EventMetric, number>>,
  members = 1,
): boolean {
  return event.parts.every(
    (p) => (counts[p.metric] ?? 0) >= partTarget(event, p, members),
  );
}

/** 0–1 across the whole event: the least-finished condition decides it. */
export function eventProgress(
  event: SportEvent,
  counts: Partial<Record<EventMetric, number>>,
  members = 1,
): number {
  if (event.parts.length === 0) return 0;
  return Math.min(
    ...event.parts.map((p) => {
      const target = partTarget(event, p, members);
      if (target <= 0) return 1;
      return Math.min((counts[p.metric] ?? 0) / target, 1);
    }),
  );
}

/* ─────────────────────────────  the gate  ───────────────────────────── */

/** Whether a house has earned its way into the race. */
export function houseCanEnter(points: number, members: number): boolean {
  if (members <= 0) return false;
  return points / members >= HOUSE_ENTRY_PER_MEMBER;
}

/** How many more points a house needs before the race opens to it. */
export function pointsToEntry(points: number, members: number): number {
  return Math.max(HOUSE_ENTRY_PER_MEMBER * Math.max(members, 0) - points, 0);
}

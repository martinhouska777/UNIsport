/*
  EVENTS — the short races that run alongside the boards, as DATA.
  ---------------------------------------------------------------------------
  A board is a standing. An EVENT is a TASK with a deadline: it opens on a
  Monday or the 1st, it is gone when the window closes, and finishing it pays
  BONUS POINTS on top of whatever the sessions were already worth. That is the
  reason to open the app on a Monday rather than at the end of term.

  FIVE TASKS, at two scales. The weekly and monthly lists are the same five
  things asked at a week's scale and a month's scale, plus one distance event
  that only makes sense over a month:

    Train 3 days          turn up
    Train 5 days          turn up more
    Meet somebody new     the whole point of the app
    Train with 3 partners not necessarily new ones — just don't train alone
    Hybrid athlete        both kinds of training in the same window

  ONE WEEKLY AND TWO MONTHLY RUN AT ONCE.

  WHY EVENTS HAVE ROUTES. "Hybrid athlete" is finished by three lifts and two
  cardio sessions, OR by two lifts and three cardio — a runner who lifts twice
  has done the same work as a lifter who runs twice, and one list of conditions
  cannot say that. So an event carries several ROUTES, each route a list of
  conditions, and the event is finished when ANY ONE route is complete. Ordinary
  events are one route of one condition, so nothing downstream needs a special
  case.

  THE INTERHOUSE RACE is one a month, run by every eligible house at once and
  ranked, and it pays into the HOUSE's points. It is GATED: a house has to have
  earned `HOUSE_ENTRY_PER_MEMBER` points per member, all time, before it can
  enter. That turns "we need more people using this" from a wish into a door
  with a number on it — and because it is per member, a big house cannot open
  it on size and three keen people cannot carry a house of forty.

  NO ADMIN, EVER. Which event runs is decided by the WEEK or MONTH NUMBER, so
  the whole campus sees the same one, it changes on its own, and nobody has to
  remember to set anything. Adding one later is an entry in a list below — data,
  not code (rule 7). Counting them is db/events.sql, which knows the metrics
  but not the targets.
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
  correct one, and swimming is the case worth knowing about: it is logged nearly
  as often as running on this campus, and a swum kilometre is far harder than a
  run one. It matters less than it sounds — the swims that get logged average
  1.5 km against running's 6.0 — so it is left at 1 deliberately, as one number
  to change once somebody decides what a swum kilometre is worth.

  These weights are mirrored in db/events.sql, which does the summing. This file
  stays the place they are DECIDED.
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
 * "Cycling", "Swimming") — the stored values are capitalised and the weights
 * above are not, so both sides are lowercased here.
 */
export function weightedKm(distance: number, unit: string, kind: string): number {
  if (!Number.isFinite(distance) || distance <= 0) return 0;
  const km = distance * (unitToKm[unit?.toLowerCase()] ?? 1);
  return km * (distanceWeight[kind?.toLowerCase()] ?? 1);
}

/* ─────────────────────────────  types  ───────────────────────────── */

/**
 * Everything an event can be measured on. Every one is countable from the
 * workout_logs a person already has — nothing here needs a new question asked
 * at logging time. Counted by db/events.sql.
 */
export type EventMetric =
  | "days" // separate days trained on
  | "newPartners" // people trained with for the FIRST time ever
  | "partners" // different people trained with, new or not
  | "gymSessions" // sessions logged as a gym session
  | "cardioSessions" // sessions logged as a run or as cardio
  | "distance" // weighted kilometres (see above)
  | "actives"; // house only: how many members trained at all

export type EventWindow = "week" | "month";

/** One condition. */
export type EventPart = {
  metric: EventMetric;
  target: number;
  /** How this part reads on a progress bar: "days", "lifts", "km". */
  unit: string;
};

/**
 * One way to finish an event: every condition in it must be met. An event with
 * several routes is finished by whichever one you complete first.
 */
export type EventRoute = EventPart[];

export type SportEvent = {
  key: string;
  title: string;
  /** One line, plain English, saying what finishing it takes. */
  blurb: string;
  routes: EventRoute[];
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

/** Shorthand for the ordinary case: one route, one condition. */
const one = (metric: EventMetric, target: number, unit: string): EventRoute[] => [
  [{ metric, target, unit }],
];

/* ═════════════════════════  personal · weekly  ═════════════════════════ */

export const weeklyEvents: SportEvent[] = [
  {
    key: "w-three-days",
    title: "Train 3 days",
    blurb: "Train on three separate days before Sunday night.",
    routes: one("days", 3, "days"),
    points: 60,
    window: "week",
  },
  {
    key: "w-five-days",
    title: "Train 5 days",
    blurb: "Turn up on five separate days this week.",
    routes: one("days", 5, "days"),
    points: 100,
    window: "week",
  },
  {
    key: "w-somebody-new",
    title: "Meet somebody new",
    blurb: "Train with one person you have never trained with before.",
    routes: one("newPartners", 1, "people"),
    points: 70,
    window: "week",
  },
  {
    key: "w-three-partners",
    title: "Train with 3 partners",
    blurb: "Three different people this week. They don't have to be new — just don't train alone.",
    routes: one("partners", 3, "people"),
    points: 120,
    window: "week",
  },
  {
    key: "w-hybrid",
    title: "Hybrid athlete",
    blurb: "Five sessions, both kinds: three lifts and two cardio, or two lifts and three cardio.",
    routes: [
      [
        { metric: "gymSessions", target: 3, unit: "lifts" },
        { metric: "cardioSessions", target: 2, unit: "cardio" },
      ],
      [
        { metric: "gymSessions", target: 2, unit: "lifts" },
        { metric: "cardioSessions", target: 3, unit: "cardio" },
      ],
    ],
    points: 130,
    window: "week",
  },
];

/* ═════════════════════════  personal · monthly  ═════════════════════════ */

/*
  The same five tasks at a month's scale — a week times four, near enough,
  rounded to numbers a person would actually say out loud — plus the distance
  one. Distance is MONTHLY ONLY: the app has no watch and no Strava import, so
  kilometres exist only if somebody typed them in, and a weekly distance event
  would sit at 12% all week and teach people the events are decoration. A month
  is long enough for the people who do log their runs to finish it.
*/
export const monthlyEvents: SportEvent[] = [
  {
    key: "m-thirteen-days",
    title: "Train 13 days",
    blurb: "Thirteen separate days this month — three a week, near enough.",
    routes: one("days", 13, "days"),
    points: 250,
    window: "month",
  },
  {
    key: "m-twenty-days",
    title: "Train 20 days",
    blurb: "Twenty separate days in one month. Five a week, all month.",
    routes: one("days", 20, "days"),
    points: 400,
    window: "month",
  },
  {
    key: "m-four-new",
    title: "Meet 4 new people",
    blurb: "Four people you had never trained with before.",
    routes: one("newPartners", 4, "people"),
    points: 300,
    window: "month",
  },
  {
    /*
      SIX, not the twelve a straight week-times-four would give. Partners are
      the one task that does not scale with the calendar — you run out of
      people you know long before you run out of days, and a target that can
      only be hit by treating training as networking is a target people ignore.
    */
    key: "m-six-partners",
    title: "Train with 6 partners",
    blurb: "Six different people over the month. New or not — just not alone.",
    routes: one("partners", 6, "people"),
    points: 350,
    window: "month",
  },
  {
    /*
      Sixteen sessions, not the twenty that four times the weekly one would
      ask. Twenty is five a week every week, which is a serious athlete's
      month, and this task is meant to be about the MIX rather than the volume.
    */
    key: "m-hybrid",
    title: "Hybrid athlete",
    blurb: "Both kinds, all month: ten lifts and six cardio, or six lifts and ten cardio.",
    routes: [
      [
        { metric: "gymSessions", target: 10, unit: "lifts" },
        { metric: "cardioSessions", target: 6, unit: "cardio" },
      ],
      [
        { metric: "gymSessions", target: 6, unit: "lifts" },
        { metric: "cardioSessions", target: 10, unit: "cardio" },
      ],
    ],
    points: 420,
    window: "month",
  },
  {
    key: "m-hundred",
    title: "The Hundred",
    blurb: "A hundred kilometres this month. Running and rowing count in full, cycling a third.",
    routes: one("distance", 100, "km"),
    points: 300,
    window: "month",
  },
];

/* ═══════════════════════  the interhouse race  ═══════════════════════ */

/*
  NOT SETTLED YET — the owner is deciding these, and this list is a placeholder
  so the gate has something to gate. What IS settled is the shape: one a month,
  every house past the gate running the same one, targets PER MEMBER so a race
  is about how much of a house turns out rather than how big it is.
*/
export const houseEvents: SportEvent[] = [
  {
    key: "h-everyone-in",
    title: "Everyone in",
    blurb: "Get every single member to log at least one session this month.",
    routes: one("actives", 1, "members"),
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

/** What one condition asks for. A house target is multiplied by its members. */
export function partTarget(event: SportEvent, part: EventPart, members = 1): number {
  return event.perMember ? part.target * Math.max(members, 1) : part.target;
}

export type EventCounts = Partial<Record<EventMetric, number>>;

/** 0–1 for one route: its least-finished condition decides it. */
function routeProgress(
  event: SportEvent,
  route: EventRoute,
  counts: EventCounts,
  members: number,
): number {
  if (route.length === 0) return 0;
  return Math.min(
    ...route.map((p) => {
      const target = partTarget(event, p, members);
      if (target <= 0) return 1;
      return Math.min((counts[p.metric] ?? 0) / target, 1);
    }),
  );
}

/**
 * How far along the event is, 0–1 — measured on whichever route you are
 * closest to finishing. A lifter who has run twice is judged by the route that
 * suits them, not by the one they were never going to take.
 */
export function eventProgress(
  event: SportEvent,
  counts: EventCounts,
  members = 1,
): number {
  if (event.routes.length === 0) return 0;
  return Math.max(...event.routes.map((r) => routeProgress(event, r, counts, members)));
}

/** Finished when any one route is complete. */
export function eventDone(event: SportEvent, counts: EventCounts, members = 1): boolean {
  return event.routes.some((r) =>
    r.every((p) => (counts[p.metric] ?? 0) >= partTarget(event, p, members)),
  );
}

/**
 * The route you are closest to finishing — the one worth putting on screen,
 * so the bars say "1 of 2 cardio to go" rather than offering both ways at once.
 */
export function bestRoute(
  event: SportEvent,
  counts: EventCounts,
  members = 1,
): EventRoute {
  let best = event.routes[0] ?? [];
  let bestAt = -1;
  for (const route of event.routes) {
    const at = routeProgress(event, route, counts, members);
    if (at > bestAt) {
      bestAt = at;
      best = route;
    }
  }
  return best;
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

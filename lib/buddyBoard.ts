/*
  GYM BUDDY BOARD — option lists for the "find a partner by workout focus" board
  (Match tab → Buddy Board sub-tab). Data is the source of truth (rule 7): the
  focus list + time-of-day buckets live here, never hardcoded in the component.
  Days reuse `weekDays`, the time picker reuses `sessionTimeSlots` and the
  optional gym picker reuses `verifiedGyms` — all from lib/onboarding.ts, so the
  board and the session search offer the same hours and can be compared.
*/
import { primaryActivities, sessionTimeLabel, sessionTimeSlots, type TimeSlot } from "@/lib/onboarding";
import { clockLabel, dateLabel, dayKeyOf, nextDays } from "@/lib/schedule";

// The simple workout-focus options the owner chose (legs / arms / chest…).
export type BuddyFocus = {
  key: string;
  label: string;
};

export const buddyFocuses: BuddyFocus[] = [
  { key: "legs", label: "Legs" },
  { key: "push", label: "Push" },
  { key: "pull", label: "Pull" },
  { key: "arms", label: "Arms" },
  { key: "chest", label: "Chest" },
  { key: "back", label: "Back" },
  { key: "core", label: "Core" },
  { key: "full", label: "Full body" },
  { key: "cardio", label: "Cardio" },
  // Not a gym focus at all, and that is the point: you can put your hand up for
  // a run the same way you put it up for legs.
  { key: "run", label: "Run" },
];

/*
  WHAT, THEN WHICH (owner, 2026-09-22: "first you choose not the focus from
  everything, but gym or running or stuff like that").

  The post form used to open with all ten focuses at once, which asked a runner
  to read eight gym answers before finding theirs. It now asks the ACTIVITY
  first — the same three words the rest of the app uses — and only a gym
  session is then asked which muscles. Running and cardio each have exactly one
  focus, so choosing the activity has already answered it.

  NOTHING CHANGED IN THE DATABASE: a post still stores one `focus` key. This is
  the same list, asked in two steps.
*/
export const boardActivities: { key: string; label: string }[] = [
  { key: "gym", label: "Gym" },
  { key: "running", label: "Running" },
  { key: "cardio", label: "Cardio" },
];

/** The focuses one activity offers — eight for the gym, one each for the rest. */
export function focusesFor(activity: string): BuddyFocus[] {
  return buddyFocuses.filter((f) => focusActivity(f.key) === activity);
}

/*
  Which of the app's ACTIVITIES a focus belongs to. The board speaks in workouts
  (legs, push, run); the session search speaks in activities (gym, running,
  cardio). This is the one place the two languages meet — db/buddy_board.sql has
  the same mapping in SQL for the search itself, and both must be changed
  together if the focus list ever grows a new kind of thing.
*/
export function focusActivity(focus: string): string {
  if (focus === "run") return "running";
  if (focus === "cardio") return "cardio";
  return "gym";
}

/*
  KEPT, but no longer asked. A post now carries the real hour someone means to
  go, because "afternoon" cannot answer "who trains around 9?". The bucket is
  still derived from that hour in the database, so old posts and the coarse
  board filter both keep working.
*/
export const buddyTimesOfDay: { key: string; label: string }[] = [
  { key: "morning", label: "Morning" },
  { key: "afternoon", label: "Afternoon" },
  { key: "evening", label: "Evening" },
];

export function focusLabel(key: string): string {
  return buddyFocuses.find((f) => f.key === key)?.label ?? key;
}

export function timeOfDayLabel(key: string): string {
  return buddyTimesOfDay.find((t) => t.key === key)?.label ?? key;
}

/*
  How a post says WHEN. The exact hour when it has one ("10:00 AM"); the old
  coarse bucket for posts written before hours existed. Never both.
*/
export function postWhenLabel(hour: number | null, timeOfDay: string): string {
  return hour == null ? timeOfDayLabel(timeOfDay) : sessionTimeLabel(hour);
}

/*
  ── SEARCH BY TIME, ANSWERED FROM THE BOARD ─────────────────────────────────
  Owner, 2026-09-28: the search returns POSTED SESSIONS only — no people. It
  used to answer from everyone's general schedule, which says somebody is
  usually free; a post says they are going, then, and want company.

  Matched here rather than in the database: the board is a few dozen rows and
  already on the phone, and the answer is the same cards the board shows.
*/
export type TimeSearch = {
  /** gym | running | cardio, or "other" — the search's "Any". */
  activity: string;
  date: string; // yyyy-mm-dd
  /** null = any time that day. */
  hour: number | null;
  gym: string | null;
};

type SearchablePost = {
  focus: string;
  date: string | null;
  day: string;
  hour: number | null;
  gym: string | null;
};

const byHour = <P extends SearchablePost>(a: P, b: P) => (a.hour ?? 99) - (b.hour ?? 99);

/*
  The posts that answer a search, and whether the hour had to be let go. With
  an hour, posts within `windowHours` of it, closest first; if none are, the
  rest of that day in time order (`widened`), so the answer is never an empty
  screen while people are going that day.
*/
export function postsForSearch<P extends SearchablePost>(
  posts: P[],
  s: TimeSearch,
  windowHours: number,
): { posts: P[]; widened: boolean } {
  const dayKey = dayKeyOf(s.date);
  const onDay = posts.filter(
    (p) =>
      // Posts from before dates existed only know their weekday.
      (p.date ? p.date === s.date : p.day === dayKey) &&
      (s.activity === "other" || focusActivity(p.focus) === s.activity) &&
      (!s.gym || p.gym === s.gym),
  );
  if (s.hour === null) return { posts: [...onDay].sort(byHour), widened: false };
  const target = s.hour;
  const near = onDay
    .filter((p) => p.hour != null && Math.abs(p.hour - target) <= windowHours)
    .sort((a, b) => Math.abs(a.hour! - target) - Math.abs(b.hour! - target));
  if (near.length > 0 || onDay.length === 0) return { posts: near, widened: false };
  return { posts: [...onDay].sort(byHour), widened: true };
}

/** "Gym · Tue 29 Sep · 7:00 AM · Malkin" — a search said back in one line. */
export function timeSearchLabel(s: TimeSearch): string {
  const activity =
    s.activity === "other" ? null : primaryActivities.find((a) => a.key === s.activity)?.label;
  return [activity, dateLabel(s.date), s.hour === null ? null : sessionTimeLabel(s.hour), s.gym]
    .filter(Boolean)
    .join(" · ");
}

/*
  ── WHERE PEOPLE ARE GOING ──────────────────────────────────────────────────
  The board is the one place someone has already put their hand up, and until
  now the Gyms tab didn't know it existed. These helpers turn a gym's open posts
  into the line a gym card can carry: "3 going tonight · 5:00 PM, 7:00 PM".
*/

/** "5:00 PM" / "8:30 PM" / "7:00 AM" — the app's one way of writing a time. */
export function compactHour(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return clockLabel(`${h}:${String(m).padStart(2, "0")}`);
}

/** The smallest thing a "going" line needs to know about one post. */
export type GoingPost = {
  id: string;
  date: string | null; // yyyy-mm-dd
  hour: number | null;
  timeOfDay: string;
  focus: string;
  authorId: string;
  authorName: string;
  authorPhoto: string | null;
  mine: boolean;
};

// From this hour on, "today" reads as "tonight" — the word people use.
export const EVENING_FROM_HOUR = 17;

export type GoingSummary = {
  /** "3 going tonight" / "2 going tomorrow" / "1 going Thu" */
  headline: string;
  /** "5:00 PM, 7:00 PM" — the hours on the nearest day, in order. */
  times: string;
  /** Posts on later days than the one the headline is about. */
  more: number;
  /** Every post at this gym, nearest first. */
  posts: GoingPost[];
};

/*
  Fold a gym's open posts into one line. The headline is about the NEAREST day
  with posts, because "3 going tonight" is a reason to go and "5 going this
  week" is a statistic; anything later is folded into "+2 more".
*/
export function goingSummary(posts: GoingPost[], today = new Date()): GoingSummary | null {
  if (posts.length === 0) return null;
  const [t0, t1] = nextDays(2, today);
  const sorted = [...posts].sort((a, b) => {
    const da = a.date ?? "9999", db = b.date ?? "9999";
    if (da !== db) return da < db ? -1 : 1;
    return (a.hour ?? 99) - (b.hour ?? 99);
  });
  const nearest = sorted[0].date;
  const onDay = sorted.filter((p) => p.date === nearest);
  const hours = onDay.map((p) => p.hour).filter((h): h is number => h != null);

  let when: string;
  if (nearest === t0.iso) {
    when = hours.length > 0 && hours.every((h) => h >= EVENING_FROM_HOUR) ? "tonight" : "today";
  } else if (nearest === t1.iso) {
    when = "tomorrow";
  } else if (nearest) {
    /* A bare weekday only inside the coming week. The board reaches a month
       ahead, and "1 going Thu" for a Thursday four weeks off reads as this
       Thursday — so anything further out carries its date: "Thu 22 Oct". */
    const [y, m, d] = nearest.split("-").map(Number);
    const at = new Date(y, m - 1, d);
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const ahead = Math.round((at.getTime() - from.getTime()) / 86400000);
    when =
      ahead <= 6
        ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][at.getDay()]
        : dateLabel(nearest);
  } else {
    when = "this week";
  }

  return {
    headline: `${onDay.length} going ${when}`,
    times: hours.map(compactHour).join(", "),
    more: sorted.length - onDay.length,
    posts: sorted,
  };
}

/*
  ── "POST THAT YOU'RE GOING" from a gym page — two taps: a time, then confirm.
  A post needs a focus, so one is pre-picked from what the person mainly does
  (they can change it, but they don't have to). DATA, so a new activity is a
  line here.
*/
export const defaultFocusForActivity: Record<string, string> = {
  gym: "full",
  running: "run",
  cardio: "cardio",
  other: "full",
};

export function defaultFocusFor(primaryActivity: string | null | undefined): string {
  return defaultFocusForActivity[primaryActivity ?? ""] ?? "full";
}

/*
  The hours still ahead today (from the next half-hour on). Late at night,
  when nothing is left, it rolls to tomorrow's full list — so the sheet always
  has real times to offer and says which day they belong to.
*/
export function upcomingSlots(now = new Date()): { date: string; isToday: boolean; slots: TimeSlot[] } {
  const [t0, t1] = nextDays(2, now);
  const nowValue = now.getHours() + now.getMinutes() / 60;
  const today = sessionTimeSlots.filter((s) => s.value >= nowValue);
  if (today.length > 0) return { date: t0.iso, isToday: true, slots: today };
  return { date: t1.iso, isToday: false, slots: sessionTimeSlots };
}

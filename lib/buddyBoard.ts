/*
  GYM BUDDY BOARD — option lists for the "find a partner by workout focus" board
  (Match tab → Buddy Board sub-tab). Data is the source of truth (rule 7): the
  focus list + time-of-day buckets live here, never hardcoded in the component.
  Days reuse `weekDays`, the time picker reuses `sessionTimeSlots` and the
  optional gym picker reuses `verifiedGyms` — all from lib/onboarding.ts, so the
  board and the session search offer the same hours and can be compared.
*/
import { sessionTimeLabel, sessionTimeSlots, type TimeSlot } from "@/lib/onboarding";
import { nextDays } from "@/lib/schedule";

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
  ── WHERE PEOPLE ARE GOING ──────────────────────────────────────────────────
  The board is the one place someone has already put their hand up, and until
  now the Gyms tab didn't know it existed. These helpers turn a gym's open posts
  into the line a gym card can carry: "3 going tonight · 5pm, 7pm, 8:30".
*/

/** "5pm" / "8:30pm" / "7am" — the short clock a card has room for. */
export function compactHour(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const suffix = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, "0")}${suffix}`;
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
  /** "5pm, 7pm, 8:30pm" — the hours on the nearest day, in order. */
  times: string;
  /** Posts on later days than the one the headline is about. */
  more: number;
  /** Every post at this gym, nearest first. */
  posts: GoingPost[];
};

/*
  Fold a gym's open posts into one line. The headline is about the NEAREST day
  with posts, because "3 going tonight" is a reason to go and "5 going this
  week" is a statistic; anything later is folded into "+2 more this week".
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
    const [y, m, d] = nearest.split("-").map(Number);
    when = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(y, m - 1, d).getDay()];
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

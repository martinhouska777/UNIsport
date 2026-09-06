/*
  GYM BUDDY BOARD — option lists for the "find a partner by workout focus" board
  (Match tab → Buddy Board sub-tab). Data is the source of truth (rule 7): the
  focus list + time-of-day buckets live here, never hardcoded in the component.
  Days reuse `weekDays`, the time picker reuses `sessionTimeSlots` and the
  optional gym picker reuses `verifiedGyms` — all from lib/onboarding.ts, so the
  board and the session search offer the same hours and can be compared.
*/
import { sessionTimeLabel } from "@/lib/onboarding";

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

/*
  GYM BUDDY BOARD — option lists for the "find a partner by workout focus" board
  (Match tab → Buddy Board sub-tab). Data is the source of truth (rule 7): the
  focus list + time-of-day buckets live here, never hardcoded in the component.
  Days reuse `weekDays` and the optional gym picker reuses `verifiedGyms`, both
  from lib/onboarding.ts.
*/

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
];

// Three coarse time-of-day buckets ("Thursday afternoon").
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

/*
  WHY THIS PERSON IS ON YOUR LIST

  db/matching.sql hands back the real overlaps between two students (same
  concentration, same country, shared interests, a shared gym...). This file is
  the ONE place that turns those overlaps into the words a student reads —
  short chips on a result card, fuller lines on their profile.

  Two rules it exists to enforce:
    1. Nothing is invented. Every reason quotes a value that came out of the
       database. If two people share nothing, they get no reasons — not a vague
       compliment.
    2. The card and the profile always agree, because both call this.

  ORDERING is by how much the overlap actually moved the score, so the first
  chip on the card is genuinely the biggest reason they ranked where they did.
  `weight` breaks ties in favour of the concrete, human facts (a shared country
  beats "similar level"), which is what a person scanning a grid wants to see.
*/
import type { Match } from "@/lib/supabase/matching";

export type MatchReason = {
  key: string;
  /** Card-sized: a bare fact, 1–3 words where possible ("Economics"). */
  short: string;
  /** Profile-sized: a full sentence fragment ("Both studying Economics"). */
  full: string;
};

// Joins a list the way a person would say it: "Climbing, Coffee and Chess".
function listWords(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/*
  The words for each activity. Kept as data, in one place, because "gym" is a
  noun and "run" is a verb and no clever template survives both.
*/
const activityWording: Record<string, { both: string; they: string; short: string }> = {
  gym: { both: "You both lift", they: "They lift too", short: "Both lift" },
  running: { both: "You both run", they: "They run too", short: "Both run" },
  cardio: { both: "You both do cardio", they: "They do cardio too", short: "Both do cardio" },
  other: { both: "You do the same sport", they: "They do it too", short: "Same sport" },
};

const levelWording: Record<
  NonNullable<Match["facts"]["levelNote"]>,
  { short: string; full: string }
> = {
  same: { short: "Same level", full: "You train at the same experience level" },
  close: { short: "Close level", full: "You're one step apart in experience" },
  mentor: { short: "Mentor fit", full: "One of you offers to mentor, the other wants it" },
};

/**
 * Every real reason these two match, strongest first.
 *
 * Pass the whole Match — the points decide the order, the facts decide the
 * words. Returns an empty array when there is genuinely nothing in common.
 */
export function matchReasons(m: Match): MatchReason[] {
  const f = m.facts;
  const b = m.breakdown;

  // pts = what it contributed to the score; weight = tie-break toward concrete
  // facts. Entries with no fact behind them are simply left out.
  const candidates: (MatchReason & { pts: number; weight: number })[] = [];

  if (f.gym) {
    candidates.push({
      key: "gym",
      short: f.gym,
      full: `You both train at ${f.gym}`,
      pts: b.gym,
      weight: 3,
    });
  }

  /*
    WHAT YOU ACTUALLY DO TOGETHER. Worded from the shape the database reports,
    never from the points: it is one thing to both live in the gym and quite
    another to be somebody's side activity, and a student can tell the
    difference at a glance. The frequency is quoted only when it exists — a
    main activity is never asked how often, so there is nothing to quote.
  */
  if (f.activity && f.activityNote) {
    const w = activityWording[f.activity] ?? activityWording.other;
    const often = f.activityFreq ? ` — ${f.activityFreq} a week` : "";
    const full =
      f.activityNote === "both_main"
        ? w.both
        : f.activityNote === "their_main"
          ? `${w.both} — it's their main thing`
          : f.activityNote === "they_also"
            ? `${w.they}${often}`
            : `${w.both} on the side${often}`;
    candidates.push({
      key: "activity",
      short: f.activityNote === "they_also" ? w.they : w.short,
      full,
      pts: b.activity,
      // Above every other tie at the same points: what you do together is the
      // most concrete thing on the card.
      weight: 4,
    });
  }

  if (f.interests.length > 0) {
    const shown = f.interests.slice(0, 2);
    const extra = f.interests.length - shown.length;
    candidates.push({
      key: "interests",
      short: shown.join(", ") + (extra > 0 ? ` +${extra}` : ""),
      full:
        f.interests.length === 1
          ? `You're both into ${f.interests[0]}`
          : `${f.interests.length} shared interests — ${listWords(f.interests)}`,
      pts: b.interests,
      weight: 3,
    });
  }

  if (f.concentration) {
    candidates.push({
      key: "concentration",
      short: f.concentration,
      full: `You're both concentrating in ${f.concentration}`,
      pts: b.concentration,
      weight: 3,
    });
  }

  // Country and region are mutually exclusive by construction: the database
  // only fills in a region when the countries differ.
  if (f.country) {
    candidates.push({
      key: "origin",
      short: f.country,
      full: `You're both from ${f.country}`,
      pts: b.origin,
      weight: 3,
    });
  } else if (f.region) {
    candidates.push({
      key: "origin",
      short: f.region,
      full: `You're both from ${f.region}`,
      pts: b.origin,
      weight: 2,
    });
  }

  if (f.languages.length > 0) {
    candidates.push({
      key: "languages",
      short: f.languages.join(", "),
      full:
        f.languages.length === 1
          ? `You both speak ${f.languages[0]}`
          : `You both speak ${listWords(f.languages)}`,
      pts: b.languages,
      weight: 2,
    });
  }

  // Schedule is only scored on Browse — a session search has already pinned the
  // time, so there's nothing to point out.
  if (b.schedule != null && b.schedule > 0) {
    candidates.push({
      key: "schedule",
      short: "Free when you are",
      full: "Your free time in the week overlaps",
      pts: b.schedule,
      weight: 1,
    });
  }

  if (f.levelNote) {
    candidates.push({
      key: "level",
      ...levelWording[f.levelNote],
      pts: b.level,
      weight: 1,
    });
  }

  if (b.training >= 6) {
    candidates.push({
      key: "training",
      short: "Wants a partner",
      full: "You're both looking for a training partner",
      pts: b.training,
      weight: 0,
    });
  }

  return candidates
    .filter((r) => r.pts > 0)
    .sort((a, c) => c.pts - a.pts || c.weight - a.weight)
    .map(({ key, short, full }) => ({ key, short, full }));
}

/**
 * The handful that fit on a result card. Three is what a two-column grid holds
 * without the card growing taller than the ones beside it.
 */
export function topMatchReasons(m: Match, count = 3): MatchReason[] {
  return matchReasons(m).slice(0, count);
}

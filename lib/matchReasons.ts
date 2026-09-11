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
import { campusLanguage } from "@/lib/onboarding";

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
      /*
        Two DIFFERENT keys on purpose. "You both run" is what a list of runners
        all say and deserves to be dropped as filler; "they run too" is the one
        person on that list who ALSO does your thing, which is the rarest and
        most useful line on the page. Sharing one key would have thrown the
        second away with the first.
      */
      key: f.activityNote === "both_main" ? "activity" : "activity-also",
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

  /*
    Onboarding switches the campus language on for everyone and won't let you
    turn it off — you can't study here without it. So "you both speak English"
    is a fact about the university, not about the two of you, and it never earns
    a line. A SECOND shared language is a real thing and still does.

    Only the wording is filtered, not the score: everybody shares English, so it
    adds the same points to every single candidate and moves nobody.
  */
  const languages = f.languages.filter((l) => l !== campusLanguage);
  if (languages.length > 0) {
    candidates.push({
      key: "languages",
      short: languages.join(", "),
      full:
        languages.length === 1
          ? `You both speak ${languages[0]}`
          : `You both speak ${listWords(languages)}`,
      pts: b.languages,
      weight: 2,
    });
  }

  // Schedule is only scored on Browse — a session search has already pinned the
  // time, so there's nothing to point out.
  if (b.schedule != null && b.schedule > 0) {
    candidates.push({
      key: "schedule",
      short: "Similar times",
      full: "You train at similar times of day",
      pts: b.schedule,
      weight: 1,
    });
  }

  if (f.levelNote) {
    candidates.push({
      /*
        A DIFFERENT KEY for the mentor case, on purpose. "Same level" is what
        nine cards in ten say and is filler; "one of you offers to mentor, the
        other wants it" is rare and is the most useful thing on the page. One
        key would have thrown the second away with the first — the same trick
        the activity reason above uses.
      */
      key: f.levelNote === "mentor" ? "mentor" : "level",
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

/*
  HOW RARE EACH KIND OF REASON IS, ACROSS ONE LIST OF RESULTS.

  Points answer "how much did this move the score?". A card has to answer a
  different question: "why THIS person rather than the other nineteen?" Those
  are not the same, and ordering chips by points answered the wrong one.

  Measured on the real seeded campus, a shared level appears on 90% of cards and
  a shared concentration on 14%. Sorting by points therefore spent the top slot
  on the fact every card repeats and pushed the one distinguishing fact down.

  So: count how many people in the SAME list share each kind of reason, and show
  the rarest first. Nothing is hardcoded — on a list of runners, "you both run"
  goes quiet on its own, and on a list of strangers from everywhere, a shared
  country becomes the headline. It re-tunes itself to whatever you're looking at.
*/
export type ReasonRarity = { total: number; counts: Map<string, number> };

export function reasonRarity(list: Match[]): ReasonRarity {
  const counts = new Map<string, number>();
  for (const m of list) {
    for (const r of matchReasons(m)) counts.set(r.key, (counts.get(r.key) ?? 0) + 1);
  }
  return { total: list.length, counts };
}

/*
  A reason that nearly EVERYONE on screen also has is not a reason — it is a
  description of the list. Above this share it is dropped from the cards
  entirely rather than just sorted last, because a tail of "Both lift · Wants a
  partner · Same level" repeating down twenty cards is the same noise we set out
  to remove, only lower on the card.

  What survives is self-tuning: on a lifter's list of lifters, "both lift" goes;
  on that same list, the one person who ALSO runs keeps their line, because
  hardly anyone else has it.
*/
const TOO_COMMON = 0.7;

// Below this many results, "everyone has it" isn't a meaningful statement yet.
const ENOUGH_TO_JUDGE = 5;

/**
 * The handful that fit on a result card, rarest-first when given the list they
 * came from. Without a list it falls back to strongest-first, which is right
 * for a single profile where there is nothing to be rare against.
 */
export function topMatchReasons(
  m: Match,
  count = 3,
  rarity?: ReasonRarity,
): MatchReason[] {
  const all = matchReasons(m);
  if (!rarity || rarity.total < ENOUGH_TO_JUDGE) return all.slice(0, count);

  const share = (k: string) => (rarity.counts.get(k) ?? 0) / rarity.total;
  // Sort is stable, so reasons that are equally rare keep their points order.
  const ranked = [...all].sort((x, y) => share(x.key) - share(y.key));
  const worthSaying = ranked.filter((r) => share(r.key) <= TOO_COMMON);

  // Never leave a card with nothing: if this person genuinely shares only the
  // universal things, say the strongest one rather than showing an empty row.
  return (worthSaying.length > 0 ? worthSaying : ranked.slice(0, 1)).slice(0, count);
}

/* ═══════════════════  THE HOOK — one human fact, said first  ═══════════════════ */

/*
  Interests and concentration are what the app is about, and six identical
  11px chips made "Economics", "Coffee" and "Malkin" read as equally important.
  The HOOK is one shared HUMAN fact — never a gym, a time or a level — given
  its own line in the school's colour: "Also does Neuroscience", "Both into
  Climbing", "They run too". It is the reason you'd message this person rather
  than the one below them.

  Which fact wins: the rarest across the list on screen (see reasonRarity), so
  on a list of economists the concentration goes quiet and the one shared
  hobby becomes the line. Without a list, the strongest.

  The wording is data here, per kind of fact, and the same function feeds the
  match card, the board rows and the "going tonight" rows — so the hook you
  read on a board is the hook you read on the card.
*/
export type Hook = {
  /** "Also does Neuroscience" */
  text: string;
  /** The reason it came from, so a card can leave that chip out. */
  key: string;
  /** Chip keys the card should drop, because the line already says them. */
  chipKeys: string[];
};

// The human facts, in the order they win a tie. Logistics never hook.
const HOOK_KEYS = ["interests", "concentration", "activity-also", "origin", "languages", "mentor"] as const;

function hookWording(m: Match, r: MatchReason): { text: string; chipKeys: string[] } | null {
  const f = m.facts;
  switch (r.key) {
    case "concentration":
      return f.concentration
        ? { text: `Also does ${f.concentration}`, chipKeys: ["concentration"] }
        : null;
    case "interests": {
      const [a, b] = f.interests;
      if (!a) return null;
      return {
        text: b ? `Both into ${a} and ${b}` : `Both into ${a}`,
        chipKeys: f.interests.slice(0, b ? 2 : 1).map((i) => `interest-${i}`),
      };
    }
    case "origin":
      return { text: `Also from ${f.country ?? f.region}`, chipKeys: ["origin"] };
    case "languages": {
      const lang = f.languages.find((l) => l !== campusLanguage);
      return lang ? { text: `Also speaks ${lang}`, chipKeys: ["languages"] } : null;
    }
    case "activity-also": {
      const w = activityWording[f.activity ?? "other"] ?? activityWording.other;
      return { text: w.they, chipKeys: ["activity-also"] };
    }
    case "mentor":
      return { text: levelWording.mentor.full, chipKeys: ["mentor"] };
    default:
      return null;
  }
}

/** The one line under a name. Null when the two share no human fact at all. */
export function hookLine(m: Match, rarity?: ReasonRarity): Hook | null {
  const ranked = topMatchReasons(m, 99, rarity).filter((r) =>
    (HOOK_KEYS as readonly string[]).includes(r.key),
  );
  // Rarest first already; among equals, the order of HOOK_KEYS decides.
  ranked.sort((a, b) => {
    if (rarity && rarity.total >= 5) {
      const share = (k: string) => (rarity.counts.get(k) ?? 0) / rarity.total;
      const d = share(a.key) - share(b.key);
      if (d !== 0) return d;
    }
    return HOOK_KEYS.indexOf(a.key as (typeof HOOK_KEYS)[number]) - HOOK_KEYS.indexOf(b.key as (typeof HOOK_KEYS)[number]);
  });
  for (const r of ranked) {
    const w = hookWording(m, r);
    if (w) return { text: w.text, key: r.key, chipKeys: w.chipKeys };
  }
  return null;
}

/*
  WHERE AND WHEN — the small grey line under the hook: their gym (yours too
  when it is shared) and whether they train when you do. Logistics, said
  quietly; the human fact above it is what gets the colour.
*/
export function whereWhenLine(m: Match): string | null {
  const gym = m.facts.gym ?? m.theirs.gym;
  const when = (m.breakdown.schedule ?? 0) > 0 ? "trains when you do" : null;
  const parts = [gym, when].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/*
  THE FIRST LINE OF A NEW CONVERSATION — "You both do CS · both into coffee."
  Two human facts at most, strongest first, joined the way a person would say
  them. Null when there is nothing to say; the thread then opens as it did.
*/
export function dmContextLine(m: Match): string | null {
  const f = m.facts;
  const parts: string[] = [];
  for (const r of matchReasons(m)) {
    if (parts.length >= 2) break;
    switch (r.key) {
      case "concentration":
        if (f.concentration) parts.push(`you both do ${f.concentration}`);
        break;
      case "interests":
        if (f.interests[0]) parts.push(`both into ${f.interests[0].toLowerCase()}`);
        break;
      case "origin":
        parts.push(`both from ${f.country ?? f.region}`);
        break;
      case "languages": {
        const lang = f.languages.find((l) => l !== campusLanguage);
        if (lang) parts.push(`both speak ${lang}`);
        break;
      }
      case "activity-also": {
        const w = activityWording[f.activity ?? "other"] ?? activityWording.other;
        parts.push(w.they.toLowerCase());
        break;
      }
      case "gym":
        if (f.gym) parts.push(`both train at ${f.gym}`);
        break;
      default:
        break;
    }
  }
  if (parts.length === 0) return null;
  const line = parts.join(" · ");
  return line[0].toUpperCase() + line.slice(1) + ".";
}

/* ══════════════════════  what a RESULT CARD shows  ══════════════════════ */

/*
  WHAT A CARD SAYS, AND IN WHAT ORDER.

  Every card answers the same four things in the same four places, so you learn
  to read one card and then you can read twenty:

    1. their concentration
    2. their main gym
    3. whether you train at similar times
    4. whether they also do your sport ("They run too")

  ...and then the room that's left goes to interests — the hobbies — plus
  anything genuinely rare you share. Six chips in total.

  SHARED OR THEIRS. Each of those first two is a real overlap when you have
  one, and simply THEIRS when you don't. A shared chip wears the school's own
  colour and a tick; theirs is plain grey and never dressed up as something you
  have in common. So the shape of the card is fixed but nothing on it is
  invented.

  A WHITELIST, NOT A BLACKLIST. Only the reasons named in CARD_CHIPS below can
  reach a card. That is deliberate: the matching engine scores nine kinds of
  overlap and some of them are true but worthless to read —

    • "Wants a partner" — almost everybody does. It is a description of the
      app's users, not of a person.
    • "Same level" / "Close level" — nine cards in ten. (The MENTOR case is
      kept: it is rare and it is the most useful line on the page.)
    • "Both lift" — the identity line two millimetres above already says it.

  ...and a blacklist would have let the next such reason through by default.
  Anything added to the engine from now on has to be named here before a card
  will show it.

  Shared interests arrive from the engine as one chip ("Climbing, Coffee +2").
  On a card they are split one per chip: six short chips pack into the rows and
  read at a glance, where one long one truncates and loses its tail.
*/
export type CardChip = {
  key: string;
  label: string;
  /** True when it is an overlap — the tick and the school's colour. */
  shared: boolean;
  /** The longer wording, for a title attribute. */
  full: string;
};

/**
 * The only reasons a result card may show, and the order they read in. The
 * first four are the fixed shape of every card; the rest fill what's left.
 */
const CARD_CHIPS = [
  "concentration",
  "gym",
  "schedule",
  "activity-also",
  "mentor",
  "origin",
  "languages",
  "interests",
] as const;

export function cardChips(m: Match, count: number, rarity?: ReasonRarity): CardChip[] {
  const chips: CardChip[] = [];
  const seen = new Set<string>();
  const push = (chip: CardChip) => {
    const id = chip.label.trim().toLowerCase();
    if (!chip.label || seen.has(id) || chips.length >= count) return false;
    seen.add(id);
    chips.push(chip);
    return true;
  };

  /*
    Ask for everything and sort it ourselves. `topMatchReasons` orders by how
    RARE a reason is across the list, which is the right question for the tail
    of the card but the wrong one for its first two slots: the card has to say
    what somebody studies and where they train whether or not that happens to
    be unusual.
  */
  const shared = new Map(topMatchReasons(m, 99, rarity).map((r) => [r.key, r]));
  const sharedChip = (key: string) => {
    const r = shared.get(key);
    return r ? push({ key: r.key, label: r.short, shared: true, full: r.full }) : false;
  };

  // 1 · What they study — shared if it is, otherwise simply theirs.
  if (!sharedChip("concentration") && m.theirs.concentration) {
    push({
      key: "their-concentration",
      label: m.theirs.concentration,
      shared: false,
      full: `They're concentrating in ${m.theirs.concentration}`,
    });
  }

  // 2 · Where they train. Same rule.
  if (!sharedChip("gym") && m.theirs.gym) {
    push({
      key: "their-gym",
      label: m.theirs.gym,
      shared: false,
      full: `They train at ${m.theirs.gym}`,
    });
  }

  // 3 · When. Only ever a shared fact — there is nothing to say about somebody
  // else's timetable on its own.
  sharedChip("schedule");

  // 4 · The sometimes-one: they also do your sport.
  sharedChip("activity-also");

  // Then whatever else is genuinely worth reading, rarest first, with shared
  // interests split one to a chip.
  for (const r of topMatchReasons(m, 99, rarity)) {
    if (!CARD_CHIPS.includes(r.key as (typeof CARD_CHIPS)[number])) continue;
    if (r.key === "interests") {
      for (const one of m.facts.interests) {
        push({ key: `interest-${one}`, label: one, shared: true, full: r.full });
      }
      continue;
    }
    sharedChip(r.key);
  }

  // And their own hobbies for the room that's left.
  for (const one of m.theirs.interests) {
    push({
      key: `their-interest-${one}`,
      label: one,
      shared: false,
      full: `They're into ${one}`,
    });
  }

  return chips;
}

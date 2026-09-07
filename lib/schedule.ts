/*
  TRAINING AVAILABILITY — the shared vocabulary for "when do you train".

  Stored per day inside `trainingSchedule` (day key -> array of slot strings).
  TWO formats live in that array during the changeover:

    "07:00-09:00"  exact hours  — what the profile editor writes now
    "AM"           coarse block — what onboarding still collects

  Both are read everywhere, so nobody's saved answers break. A legacy block is
  widened to the hour range it always meant (see BLOCK_HOURS, which mirrors
  block_range() in db/matching.sql — keep the two in step).

  The database understands both too: block_range() parses "HH:MM-HH:MM" and
  falls back to the named blocks, and match_browse compares slots by overlapping
  RANGES rather than identical text. That last part matters — "07:00-09:00" and
  "07:30-09:30" are a real-world match that string equality would score as zero.
*/

export type Slot = { start: string; end: string }; // "07:00" style, 24h

// Coarse block -> the hours it represents. Mirrors block_range() in matching.sql.
const BLOCK_HOURS: Record<string, [number, number]> = {
  "early am": [5, 8],
  am: [8, 11],
  midday: [11, 14],
  pm: [14, 18],
  "late pm": [18, 22],
};

const HHMM = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/;

export const pad2 = (n: number) => String(n).padStart(2, "0");
export const hourLabel = (h: number) => `${pad2(h)}:00`;

/* Text -> slot. Understands exact hours and the legacy block names. */
export function parseSlot(text: string): Slot | null {
  const exact = HHMM.exec(text.trim());
  if (exact) {
    const [, sh, sm, eh, em] = exact;
    return { start: `${pad2(+sh)}:${sm}`, end: `${pad2(+eh)}:${em}` };
  }
  const block = BLOCK_HOURS[text.trim().toLowerCase()];
  return block ? { start: hourLabel(block[0]), end: hourLabel(block[1]) } : null;
}

export const slotToText = (s: Slot) => `${s.start}-${s.end}`;

/* A day's stored strings as slots, dropping anything unrecognised, sorted. */
export function daySlots(raw: string[] | undefined): Slot[] {
  return (raw ?? [])
    .map(parseSlot)
    .filter((s): s is Slot => s !== null)
    .sort((a, b) => a.start.localeCompare(b.start));
}

export const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/* Slots the user can pick from. Half-hour steps across a realistic training day. */
export function timeChoices(fromHour = 5, toHour = 23): string[] {
  const out: string[] = [];
  for (let h = fromHour; h <= toHour; h++) {
    out.push(`${pad2(h)}:00`);
    if (h !== toHour) out.push(`${pad2(h)}:30`);
  }
  return out;
}

/*
  The one time that runs through someone's week — the slot sitting on the most
  days. It is what the "what time, usually?" buttons show as chosen, and the
  thing a new choice replaces, so days that were given their OWN time are left
  where they are. Ties go to the earliest slot, so the answer never flickers
  between two equally common times.
*/
export function usualSlot(schedule: Record<string, string[]>): string | null {
  const days = new Map<string, number>();
  for (const slots of Object.values(schedule ?? {})) {
    // Once per day: two days at 17:00 beats one day that lists 17:00 twice.
    for (const text of new Set(slots ?? [])) {
      days.set(text, (days.get(text) ?? 0) + 1);
    }
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [text, count] of [...days].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (count > bestCount) {
      best = text;
      bestCount = count;
    }
  }
  return best;
}

/* "Mon 07:00–09:00" style, for one slot. */
export const slotLabel = (s: Slot) => `${s.start}–${s.end}`;


/* ---- THE WEEK STRIP -------------------------------------------------------
  "Find a partner by time" used to offer seven bare weekday pills. Mon meant
  some Monday — you couldn't tell which, and you couldn't ask for the one after
  next. Now it shows real DATES a week at a time, with arrows, up to a month
  ahead.

  Matching itself still searches on the weekday: a person's training schedule is
  a weekly habit, not a diary, so "who trains Thursday around 9" is the right
  question whichever Thursday you picked. The date is what the human needs in
  order to know which Thursday they just asked for — and it is what a board post
  is pinned to.
--------------------------------------------------------------------------- */

// A month of forward planning. Past this, a weekly habit says very little.
export const MAX_WEEKS_AHEAD = 4;

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export type StripDay = {
  iso: string; // yyyy-mm-dd
  dayKey: string; // mon..sun — what matching actually searches on
  letter: string;
  num: number; // day of the month
  isToday: boolean;
  isPast: boolean; // you cannot arrange to have trained yesterday
};

// Midnight local, so date arithmetic never trips over the clock.
const atMidnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// The Monday of whatever week a date falls in. Weeks start Monday here because
// the training week does.
function mondayOf(d: Date): Date {
  const x = atMidnight(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

const isoOf = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** The seven days of the week `offset` weeks from the one we're in. */
export function weekStrip(offset: number, today = new Date()): StripDay[] {
  const t0 = atMidnight(today);
  const start = mondayOf(t0);
  start.setDate(start.getDate() + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return {
      iso: isoOf(d),
      dayKey: DAY_KEYS[i],
      letter: DAY_LETTERS[i],
      num: d.getDate(),
      isToday: d.getTime() === t0.getTime(),
      isPast: d.getTime() < t0.getTime(),
    };
  });
}

/**
 * What to call that week. The two people actually plan in get their own words;
 * anything further out is named by its dates, because "in 3 weeks" is a sum
 * nobody wants to do.
 */
export function weekLabel(offset: number, today = new Date()): string {
  if (offset === 0) return "This week";
  if (offset === 1) return "Next week";
  const week = weekStrip(offset, today);
  const a = week[0];
  const b = week[6];
  const monthA = MONTHS_SHORT[Number(a.iso.slice(5, 7)) - 1];
  const monthB = MONTHS_SHORT[Number(b.iso.slice(5, 7)) - 1];
  return monthA === monthB
    ? `${a.num}–${b.num} ${monthB}`
    : `${a.num} ${monthA} – ${b.num} ${monthB}`;
}

/** The weekday key an ISO date falls on — what the matching functions want. */
export function dayKeyOf(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return DAY_KEYS[(new Date(y, m - 1, d).getDay() + 6) % 7];
}

/** "Thu 9 Oct" — the chosen date, said back in full. */
export function dateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dt = new Date(y, m - 1, d);
  return `${names[(dt.getDay() + 6) % 7]} ${d} ${MONTHS_SHORT[m - 1]}`;
}

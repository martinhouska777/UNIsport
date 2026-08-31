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

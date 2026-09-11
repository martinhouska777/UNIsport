/*
  COACH — TODAY (the model behind the console's first screen)
  ---------------------------------------------------------------------------
  The one question a coach has at 5:40am is "what is happening this morning",
  and until this screen every tab in the console answered it with a list to
  open. This puts the answer on one screen: today and tomorrow, each as its
  AM and PM, each saying what the plan prescribes, where the lineup for it has
  got to, and who is out — with one tap into the editor or the builder.

  Everything here is PURE: given the plan, the squad's config, the lineup
  statuses, the lineups themselves and who is out, it returns what the screen
  draws. The screen fetches and renders; it decides nothing (rule 7).
*/
import {
  buildWeeks,
  parseDate,
  sessionKey,
  toISO,
  periods,
  type Block,
  type Period,
  type SessionMap,
} from "./coachPlan";
import {
  configNeedsLineup,
  configSessionColor,
  configSessionLabel,
  type TrainingConfig,
} from "./trainingConfig";
import type { LineupStatus, StoredLineup } from "./lineupStore";
import { rosterById, type OutReason } from "./coachLineup";

export type TodayLineup = {
  status: LineupStatus;
  boats: number;
  /** Seats with somebody in them, and seats in total, across every boat (cox included). */
  filled: number;
  seats: number;
};

export type TodaySlot = {
  key: string; // the practice's day_key — what the Plan and Lineup deep links take
  period: Period;
  /** The session's start time — from the session, or the config's usual time for the period. */
  time: string;
  session: { label: string; color: string; description: string; note?: string } | null;
  /** Whether this session's TYPE needs a lineup (the coach's setting). */
  needsLineup: boolean;
  lineup: TodayLineup | null;
};

export type TodayOut = { id: string; name: string; reason: OutReason };

export type TodayDay = {
  iso: string;
  date: Date;
  /** "Today" / "Tomorrow". */
  title: string;
  /** "Thu 11 Sep". */
  label: string;
  /** The block this day falls in, or null — then the plan has nothing for it yet. */
  block: Block | null;
  slots: TodaySlot[];
  out: TodayOut[];
};

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const dayLabel = (d: Date) => `${WD[d.getDay()]} ${d.getDate()} ${MO[d.getMonth()]}`;

/** The block whose date range covers this day, if any. */
export function blockCovering(blocks: Block[], iso: string): Block | null {
  return blocks.find((b) => b.start <= iso && iso <= b.end) ?? null;
}

/*
  Where a day sits inside its block — which week row — so the Plan tab can be
  opened straight onto it. Null when no block covers the day.
*/
export function weekIndexOf(block: Block, date: Date): number | null {
  const weeks = buildWeeks(block);
  const idx = weeks.findIndex((w) =>
    w.days.some(
      (d) =>
        d.date.getFullYear() === date.getFullYear() &&
        d.date.getMonth() === date.getMonth() &&
        d.date.getDate() === date.getDate(),
    ),
  );
  return idx === -1 ? null : idx;
}

function lineupSummary(stored: StoredLineup | null | undefined): TodayLineup | null {
  if (!stored) return null;
  let filled = 0;
  let seats = 0;
  for (const b of stored.boats) {
    seats += b.seats.length + (b.hasCox ? 1 : 0);
    filled += b.seats.filter((s) => s.athleteId).length + (b.hasCox && b.coxId ? 1 : 0);
  }
  return { status: stored.status, boats: stored.boats.length, filled, seats };
}

export function buildDay(args: {
  date: Date;
  title: string;
  blocks: Block[];
  sessions: SessionMap;
  cfg: TrainingConfig;
  lineups: Record<string, StoredLineup | null>;
  out: Record<string, OutReason>;
}): TodayDay {
  const { date, title, blocks, sessions, cfg, lineups, out } = args;
  const iso = toISO(date);
  const slots: TodaySlot[] = periods.map((period) => {
    const key = sessionKey(date, period);
    const s = sessions[key];
    return {
      key,
      period,
      time: s?.time?.trim() || cfg.times[period],
      session: s
        ? {
            label: configSessionLabel(cfg, s.category, s.intensity),
            color: configSessionColor(cfg, s.category, s.intensity),
            description: s.description.trim(),
            note: s.note?.trim() || undefined,
          }
        : null,
      needsLineup: configNeedsLineup(cfg, s?.category),
      lineup: lineupSummary(lineups[key]),
    };
  });
  const outList: TodayOut[] = Object.entries(out)
    .map(([id, reason]) => ({ id, name: rosterById[id]?.name ?? id, reason }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { iso, date, title, label: dayLabel(date), block: blockCovering(blocks, iso), slots, out: outList };
}

/** Today and tomorrow as calendar days (midnight local). */
export function todayAndTomorrow(now = new Date()): { today: Date; tomorrow: Date } {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  return { today, tomorrow };
}

/** Which practice a "mark someone out" tap should open: today's first slot that needs a lineup, else its AM. */
export function practiceForOut(day: TodayDay): string {
  return (day.slots.find((s) => s.needsLineup) ?? day.slots[0]).key;
}

// Re-exported so the screen can build a date from a block's ISO without a second import.
export { parseDate };

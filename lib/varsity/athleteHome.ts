/*
  ATHLETE HOME — derive the Home screen from the coach's PUBLISHED plan and the
  athlete's OWN log.
  ------------------------------------------------------------------------
  Given the shared plan (blocks + sessions) and the athlete's logs for the
  block, build the data the Home screen renders: the greeting (block + week-of),
  the race countdown, every week's strip, and the day's AM/PM sessions — each
  one knowing whether it has been LOGGED. Athletes only ever see the current
  week of a PUBLISHED block — never the whole block ahead (per the spec).

  Why the log is in here at all: Home used to paint every session "upcoming"
  forever, because it never looked at what the athlete had done. So this
  morning's erg still said UPCOMING at nine at night, and nothing on the screen
  led to the Log. Now a session card is a fact about the day — planned, done,
  or missed — and the Log is one tap from it.
*/
import {
  buildWeeks,
  parseDate,
  sessionKey,
  sessionLabel,
  toISO,
  periods,
  type Period,
  type Session,
  type Block,
} from "./coachPlan";
import type {
  HomeData,
  SessionKind,
  SessionStatus,
  LoggedSummary,
  WeekView,
  DaySession,
  TodaySession,
  Lineup,
} from "./home";
import type { Plan } from "./planStore";
import { effortLabel, type LogEntry } from "./logStore";
import { formatMetrics } from "./logParse";

// Plan category/intensity → the Home screen's color "kind". Exported because the
// Calendar tab colours a LOGGED session by the plan session it came from, so
// that the same practice is the same colour on both screens.
export function kindOf(s: Session): SessionKind {
  switch (s.category) {
    case "off":
      return "off";
    case "weights":
      return "weights";
    case "flex":
      return "flex";
    default: // water / erg
      // All three of the coach's intensities are their own colour. UT1 used to
      // be painted as UT2, which made a month of rate work look like a month of
      // steady state.
      if (s.intensity === "hard") return "hard";
      if (s.intensity === "UT1") return "ut1";
      return "ut2";
  }
}

// Category fallback label, used when the coach didn't type a description.
function categoryLabel(s: Session): string {
  if (s.category === "off") return "OFF";
  if (s.category === "weights") return "Weights";
  if (s.category === "flex") return "Flex";
  const cat = s.category === "water" ? "water" : "erg";
  return s.intensity ? `${s.intensity} ${cat}` : cat;
}

// What shows in a calendar cell: the coach's actual workout ("3×25' UT2") when
// there is one, otherwise the category name. Exported so the Calendar tab
// prints a planned day with exactly the words Home's week strip uses.
export function cellLabel(s: Session): string {
  return s.description.trim() || categoryLabel(s);
}

/*
  ONE MONTH OF THE PLAN, for the Calendar tab — every day of a PUBLISHED block
  that falls in the month, with its prescribed sessions. The same gate as Home
  and the Log tab (published blocks only), so the calendar never shows a draft
  the coach has not sent. Keyed by ISO date; a day with nothing prescribed is
  simply absent.
*/
export type PlannedSession = {
  period: Period;
  dayKey: string;
  session: Session;
  label: string; // the cell text (cellLabel)
  kind: SessionKind;
};
export function prescribedForMonth(plan: Plan, year: number, month: number): Record<string, PlannedSession[]> {
  const out: Record<string, PlannedSession[]> = {};
  const first = toISO(new Date(year, month, 1));
  const last = toISO(new Date(year, month + 1, 0));
  for (const block of plan.blocks) {
    if (block.status !== "published") continue;
    // A block's days, only the ones inside its own dates and this month —
    // buildWeeks pads to whole Mon–Sun weeks, and the padding is not the plan.
    if (block.end < first || block.start > last) continue;
    for (const wk of buildWeeks(block)) {
      for (const d of wk.days) {
        const iso = toISO(d.date);
        if (iso < first || iso > last || iso < block.start || iso > block.end) continue;
        const sessions = periods.flatMap((p) => {
          const dayKey = sessionKey(d.date, p);
          const s = plan.sessions[dayKey];
          return s ? [{ period: p, dayKey, session: s, label: cellLabel(s), kind: kindOf(s) }] : [];
        });
        if (sessions.length) out[iso] = sessions;
      }
    }
  }
  return out;
}

/** The last day of the last published block — how far ahead a calendar can page. Null: nothing published. */
export function planEndIso(plan: Plan): string | null {
  let end: string | null = null;
  for (const b of plan.blocks) {
    if (b.status === "published" && (end === null || b.end > end)) end = b.end;
  }
  return end;
}

// Pick the published block to show today + which week within it is current.
function pickActive(blocks: Block[], today: Date) {
  const published = blocks
    .filter((b) => b.status === "published")
    .sort((a, b) => a.start.localeCompare(b.start));
  for (const block of published) {
    const weeks = buildWeeks(block, today);
    let weekIdx = weeks.findIndex((w) => w.days.some((d) => d.today));
    if (weekIdx === -1) {
      // Not in any week: if the block hasn't started yet, preview week 1;
      // if it's already finished, move on to the next published block.
      if (today < parseDate(block.start)) weekIdx = 0;
      else continue;
    }
    return { block, weeks, weekIdx };
  }
  return null;
}

/*
  THE DATES THE LOG IS NEEDED FOR: the active block's first day up to today.
  Home fetches the athlete's logs for this span in one go, so every card on
  every day of the block can say whether it was done. Null when there is no
  published block, in which case there is nothing to ask the log about.
*/
export function logSpanFor(plan: Plan, today = new Date()): { from: string; to: string } | null {
  const active = pickActive(plan.blocks, today);
  if (!active) return null;
  const first = active.weeks[0].days[0].date;
  const from = toISO(first < today ? first : today);
  return { from, to: toISO(today) };
}

// A day's PRESCRIBED sessions (for the Log tab) — the same published-block gate
// as Home, so athletes log exactly what they're shown. Works for any day (today
// or a recent one). Empty when the day isn't in a published block or has none.
export function prescribedForDay(
  plan: Plan,
  day = new Date(),
): { period: Period; dayKey: string; session: Session }[] {
  const active = pickActive(plan.blocks, day);
  if (!active) return [];
  const cell = active.weeks[active.weekIdx].days.find((d) => d.today);
  if (!cell) return [];
  return periods.flatMap((p) => {
    const dayKey = sessionKey(cell.date, p);
    const s = plan.sessions[dayKey];
    return s ? [{ period: p, dayKey, session: s }] : [];
  });
}

/*
  WHERE A SESSION STANDS. A plan log is stored against its slot (`dayKey`), so
  "done" is a lookup. "Missed" is only ever said about a day that has GONE —
  today's unlogged session is still ahead of you, or you simply haven't got to
  your phone yet, and neither deserves a red word.
*/
function statusOf(
  dayKey: string,
  iso: string,
  todayIso: string,
  logsByKey: Record<string, LogEntry>,
): { status: SessionStatus; log?: LoggedSummary } {
  const entry = logsByKey[dayKey];
  if (entry) {
    // The figures, then how it felt: "75 min · 18,000 m · Hard".
    const summary = [formatMetrics(entry.minutes, entry.metres, entry.split), effortLabel(entry.effort)]
      .filter(Boolean)
      .join(" · ");
    return { status: "done", log: { summary } };
  }
  return { status: iso < todayIso ? "missed" : "upcoming" };
}

/*
  A day-strip session, drawn as a full session card.

  The Home screen shows ANY day in the place today's sessions sit, and it must
  look the same whichever day that is — a second, smaller design for "some
  other Wednesday" is how the screen used to feel wrong. The week strip already
  carries every day's workout AND its status, so this is a rename of fields
  rather than a second trip to the plan or the log.
*/
export function daySessionToCard(s: DaySession, iso: string): TodaySession {
  return {
    period: s.clock ? `${s.time} · ${s.clock}` : s.time,
    // "ALL" is a whole-day entry and belongs to neither half; it can't own a
    // boat, so it falls to AM rather than inventing a third period.
    periodKey: s.time === "PM" ? "PM" : "AM",
    dayKey: s.dayKey,
    iso,
    location: "",
    status: s.status,
    log: s.log,
    kind: s.kind,
    title: s.label,
    detail: s.type ?? "",
    coachNote: s.note ? { coach: "COACH", text: s.note } : undefined,
  };
}

export function buildAthleteHome(
  plan: Plan,
  firstName: string,
  lineups: Lineup[],
  today = new Date(),
  logs: LogEntry[] = [],
): HomeData | null {
  const active = pickActive(plan.blocks, today);
  if (!active) return null;
  const { block, weeks, weekIdx } = active;
  const weekRow = weeks[weekIdx];
  const todayIso = toISO(today);

  // The athlete's plan logs, by the slot they were logged against. Extra
  // training has no slot and is the Log tab's business, not a card's.
  const logsByKey: Record<string, LogEntry> = {};
  for (const l of logs) if (l.source === "plan" && l.dayKey) logsByKey[l.dayKey] = l;

  const dateLabel =
    today.toLocaleDateString("en-US", { weekday: "long" }) +
    " · " +
    today.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  // Every week of the block, so the strip can swipe between weeks and show a
  // month overview. weekIdx (0-based) is the week containing today.
  const weekViews: WeekView[] = weeks.map((wk) => ({
    label: wk.rangeLabel,
    days: wk.days.map((d) => {
      const iso = toISO(d.date);
      return {
        letter: d.weekday[0],
        num: d.dayNum,
        iso,
        dateLabel: `${d.weekday} · ${d.month} ${d.dayNum}`,
        today: d.today || undefined,
        sessions: periods.flatMap((p) => {
          const dayKey = sessionKey(d.date, p);
          const s = plan.sessions[dayKey];
          if (!s) return [];
          return [
            {
              time: p,
              clock: s.time,
              label: cellLabel(s),
              type: sessionLabel(s),
              kind: kindOf(s),
              note: s.note || undefined,
              dayKey,
              ...statusOf(dayKey, iso, todayIso, logsByKey),
            },
          ];
        }),
      };
    }),
  }));

  // Today's AM/PM sessions (empty if today isn't inside this week — e.g. a block
  // that hasn't started yet, where we preview week 1).
  const todayCell = weekRow.days.find((d) => d.today);
  const todaySessions: TodaySession[] = todayCell
    ? periods.flatMap((p) => {
        const dayKey = sessionKey(todayCell.date, p);
        const s = plan.sessions[dayKey];
        if (!s) return [];
        const label = sessionLabel(s);
        const desc = s.description.trim();
        return [
          {
            period: `${p} · ${s.time}`,
            periodKey: p,
            dayKey,
            iso: todayIso,
            location: "",
            ...statusOf(dayKey, todayIso, todayIso, logsByKey),
            kind: kindOf(s),
            title: desc || label,
            detail: desc ? label : "",
            coachNote: s.note ? { coach: "COACH", text: s.note } : undefined,
          },
        ];
      })
    : [];

  // Signed days until the race: negative once it's in the past. We use the raw
  // sign here (not daysToRace, which clamps at 0) so a finished race can vanish.
  const raceDaysLeft =
    block.raceName && block.raceDate
      ? Math.round(
          (parseDate(block.raceDate).getTime() -
            new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
            864e5,
        )
      : null;

  // Race over (yesterday or earlier) → no countdown at all.
  const race =
    raceDaysLeft !== null && raceDaysLeft >= 0
      ? {
          name: block.raceName!,
          location: block.raceDate
            ? parseDate(block.raceDate).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
              })
            : "",
          big: raceDaysLeft === 0 ? "Today" : raceDaysLeft === 1 ? "Tomorrow" : String(raceDaysLeft),
          small: raceDaysLeft > 1 ? "Days" : undefined,
        }
      : null;

  return {
    greeting: {
      date: dateLabel,
      name: firstName,
      block: block.name.toUpperCase(),
      week: `Week ${weekRow.index} of ${weeks.length}`,
    },
    race,
    weeks: weekViews,
    weekIndex: weekIdx,
    today: todaySessions,
    lineups, // today's published boats (empty if none posted)
  };
}

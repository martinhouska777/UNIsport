/*
  ATHLETE HOME — derive the Home screen from the coach's PUBLISHED plan.
  ------------------------------------------------------------------------
  Given the shared plan (blocks + sessions), build the data the Home screen
  renders FOR TODAY: the greeting (block + week-of), the race countdown, this
  week's strip, and today's AM/PM sessions. Athletes only ever see the current
  week of a PUBLISHED block — never the whole block ahead (per the spec).

  Lineup + coach-focus are separate features (next slices); for now they reuse
  the demo data so the screen stays whole.
*/
import {
  buildWeeks,
  parseDate,
  daysToRace,
  sessionKey,
  sessionLabel,
  periods,
  type Period,
  type Session,
  type Block,
} from "./coachPlan";
import {
  home,
  type HomeData,
  type SessionKind,
  type WeekDay,
  type TodaySession,
  type Lineup,
} from "./home";
import type { Plan } from "./planStore";

// Plan category/intensity → the Home screen's color "kind".
function kindOf(s: Session): SessionKind {
  switch (s.category) {
    case "off":
      return "off";
    case "weights":
      return "weights";
    case "flex":
      return "recovery";
    default: // water / erg
      return s.intensity === "hard" ? "hard" : "ut2";
  }
}

// Tiny label for the week-strip cell.
function shortLabel(s: Session): string {
  if (s.category === "off") return "OFF";
  if (s.category === "weights") return "Weights";
  if (s.category === "flex") return "Flex";
  const cat = s.category === "water" ? "water" : "erg";
  return s.intensity ? `${s.intensity} ${cat}` : cat;
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

export function buildAthleteHome(
  plan: Plan,
  firstName: string,
  lineups: Lineup[],
  today = new Date(),
): HomeData | null {
  const active = pickActive(plan.blocks, today);
  if (!active) return null;
  const { block, weeks, weekIdx } = active;
  const weekRow = weeks[weekIdx];

  const dateLabel =
    today.toLocaleDateString("en-US", { weekday: "long" }) +
    " · " +
    today.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  // This week's strip.
  const week: WeekDay[] = weekRow.days.map((d) => ({
    letter: d.weekday[0],
    num: d.dayNum,
    today: d.today || undefined,
    sessions: periods.flatMap((p) => {
      const s = plan.sessions[sessionKey(d.date, p)];
      return s ? [{ time: p, label: shortLabel(s), kind: kindOf(s) }] : [];
    }),
  }));

  // Today's AM/PM sessions (empty if today isn't inside this week — e.g. a block
  // that hasn't started yet, where we preview week 1).
  const todayCell = weekRow.days.find((d) => d.today);
  const todaySessions: TodaySession[] = todayCell
    ? periods.flatMap((p) => {
        const s = plan.sessions[sessionKey(todayCell.date, p)];
        if (!s) return [];
        const label = sessionLabel(s);
        const desc = s.description.trim();
        return [
          {
            period: `${p} · ${s.time}`,
            location: "",
            status: "upcoming" as const,
            kind: kindOf(s),
            title: desc || label,
            detail: desc ? label : "",
            coachNote: s.note ? { coach: "COACH", text: s.note } : undefined,
          },
        ];
      })
    : [];

  const race = block.raceName
    ? {
        name: block.raceName,
        location: block.raceDate
          ? parseDate(block.raceDate).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
            })
          : "",
        count: daysToRace(block, today) ?? 0,
        unit: (daysToRace(block, today) ?? 0) === 1 ? "Day" : "Days",
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
    week,
    today: todaySessions,
    lineups, // today's published boats (empty if none posted)
    focus: home.focus, // placeholder until the notes slice
  };
}

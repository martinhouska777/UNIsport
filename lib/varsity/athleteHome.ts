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
  type WeekView,
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

// Category fallback label, used when the coach didn't type a description.
function categoryLabel(s: Session): string {
  if (s.category === "off") return "OFF";
  if (s.category === "weights") return "Weights";
  if (s.category === "flex") return "Flex";
  const cat = s.category === "water" ? "water" : "erg";
  return s.intensity ? `${s.intensity} ${cat}` : cat;
}

// What shows in a calendar cell: the coach's actual workout ("3×25' UT2") when
// there is one, otherwise the category name.
function cellLabel(s: Session): string {
  return s.description.trim() || categoryLabel(s);
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

  // Every week of the block, so the strip can swipe between weeks and show a
  // month overview. weekIdx (0-based) is the week containing today.
  const weekViews: WeekView[] = weeks.map((wk) => ({
    label: wk.rangeLabel,
    days: wk.days.map((d) => ({
      letter: d.weekday[0],
      num: d.dayNum,
      dateLabel: `${d.weekday} · ${d.month} ${d.dayNum}`,
      today: d.today || undefined,
      sessions: periods.flatMap((p) => {
        const s = plan.sessions[sessionKey(d.date, p)];
        if (!s) return [];
        return [
          {
            time: p,
            clock: s.time,
            label: cellLabel(s),
            type: sessionLabel(s),
            kind: kindOf(s),
            note: s.note || undefined,
          },
        ];
      }),
    })),
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
    focus: home.focus, // placeholder until the notes slice
  };
}

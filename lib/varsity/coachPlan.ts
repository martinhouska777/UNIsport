/*
  COACH — TRAINING PLAN MODEL (source of truth for the plan builder)
  ------------------------------------------------------------------
  The coach builds a PLAN as a series of BLOCKS (e.g. "Spring 2026", usually
  leading up to a race). A block is a date range; it breaks into weeks; each day
  has an AM and a PM slot; a slot can hold one SESSION.

  A session is a CATEGORY (Water / Erg / Weights / Off / Flex). Water and Erg
  sessions also carry an INTENSITY (UT2 / UT1 / Hard). The coach types a free
  description (or taps one of the 5 most-used suggestions to fill it) and can add
  a note. There is no duration and no location; the time is a preset per period.

  Which types need a boat lineup, and which may carry a squad board, are the
  coach's SETTINGS (needsLineup / canBoard in lib/varsity/trainingConfig.ts),
  read through configNeedsLineup() / configCanBoard(). Nothing here answers
  either question any more — the rowing answers (water / erg) live in the
  rowing preset, where a coach can change them.

  Workout colors are CONTENT colors (rule-1 exception): the coach's own
  spreadsheet hues as hex values, always applied via inline style — never a
  hardcoded class.
*/
import { teamTypeColor, teamZoneColor } from "./teamColors";

export type Period = "AM" | "PM";
export const periods: Period[] = ["AM", "PM"];

// Usual start time per period (no duration — that is implied; a location is optional per session).
export const presetTime: Record<Period, string> = { AM: "7:00 AM", PM: "4:30 PM" };

/* ── Categories ── */
export type Category = "water" | "erg" | "weights" | "off" | "flex";
export const categories: Category[] = ["water", "erg", "weights", "off", "flex"];

export const categoryMeta: Record<
  Category,
  { label: string; color: string; hasIntensity: boolean }
> = {
  water: { label: "Water", color: "#4a90a4", hasIntensity: true },
  // Blue, the same blue the Log gives an erg — grey (var(--muted)) made the Erg
  // stripe on the coach's plan look like nothing was there (2026-09-18).
  erg: { label: "Erg", color: "#60a5fa", hasIntensity: true },
  // The coach's spreadsheet colours — the same hues as kindColor in home.ts,
  // so a session is one colour on every screen and on the sheet itself.
  weights: { label: "Weights", color: "#ff00ff", hasIntensity: false },
  off: { label: "Off", color: "#548235", hasIntensity: false },
  flex: { label: "Flex", color: "#bfbfbf", hasIntensity: false },
};

/*
  Colors for the ATHLETE'S LOG legend. The log covers everything the coach's
  plan does, plus cross-training the plan never schedules (run / bike / other),
  and it gives Erg its own colour rather than the plan's muted grey.

  These live here because per-entity content colors belong in DATA files, never
  as literals inside a component (rule 1) — LogScreen used to declare its own.
*/
export type LogCategory = Category | "run" | "bike" | "other";
export const logCategoryMeta: Record<LogCategory, { label: string; color: string }> = {
  water: { label: "Water", color: categoryMeta.water.color },
  erg: { label: "Erg", color: "#60a5fa" },
  weights: { label: "Weights", color: categoryMeta.weights.color },
  flex: { label: "Flex", color: categoryMeta.flex.color },
  off: { label: "Off", color: categoryMeta.off.color },
  run: { label: "Run", color: "#c084fc" },
  bike: { label: "Bike", color: "#f59e0b" },
  other: { label: "Other", color: "var(--muted)" },
};

/* ── Intensities (Water + Erg only) ── */
export type Intensity = "UT2" | "UT1" | "hard";
export const intensities: Intensity[] = ["UT2", "UT1", "hard"];
export const intensityMeta: Record<Intensity, { label: string; color: string }> = {
  // Spreadsheet hues (see kindColor in home.ts): green steady, yellow rate
  // work, red flat out.
  UT2: { label: "UT2", color: "#00ff00" },
  UT1: { label: "UT1", color: "#ffff00" },
  hard: { label: "Hard", color: "#ff0000" },
};

/* ── The 5 most-used workouts to suggest (tap to fill the description) ──────
   WATER GETS ITS OWN LIST. Water and erg used to share one, and that one was
   erg workouts — a coach writing a morning outing was offered "8×500m, 1:30
   rest", which is not something a crew does on the river. The erg list is
   unchanged; only water is new, taken from the HUBC 25/26 fall plan.

   Which intensity a piece sits under follows the COLOUR the coach's own
   spreadsheet gives it, because that sheet already codes exactly our three:
   green steady, yellow/orange rate work, red flat out. So the rate pieces
   (3×5' @ 28, 3×10' @ 26) are UT1 — orange on the sheet — and red keeps what
   is actually raced: at-pace miles, trials, the full pull.

   Everything here RECURS. One-offs the season happened to contain once — the
   HOC course, "row the course, some bursts" — are not "most used" and would
   only push a weekly session off the list. The coach can still type anything. */
const waterSuggestions: Record<Intensity, string[]> = {
  // A steady outing is a distance: the whole squad's week is 12/14/16/18k.
  UT2: ["12k UT2", "14k UT2", "16k UT2", "18k UT2", "14–16k UT2 small boats"],
  // Rate work. On the water a piece is written as a rate, never as a split.
  UT1: ["3×5' @ 28", "3×5' @ 30", "3×10' @ 26", "3×12' @ 28", "2×2k open rate, small boats"],
  // Red on the sheet: raced, tested, or flat out.
  hard: [
    "2×2 miles at race pace",
    "3×1 mile at pace",
    "2 miles @ 32, 1 mile @ 34",
    "4 mile or 2 mile trial",
    "Full pull",
  ],
};
const ergSuggestions: Record<Intensity, string[]> = {
  UT2: ["3×25' UT2", "70' steady state", "4×20' UT2", "2×30' UT2", "90' UT2 row"],
  UT1: ["3×15' UT1, RP3s", "4×12' UT1", "2×20' UT1", "3×17' UT1", "6×8' UT1"],
  hard: [
    "3×5' (1:50 at 72, 2k+2)",
    "8×500m, 1:30 rest",
    "2k test",
    "4×5' rate ladder",
    "6×750m race pace",
  ],
};
// Flex is just a length choice; weights & off have no quick options.
const flexLengths = ["50 mins", "60 mins", "75 mins"];

export function suggestionsFor(category: Category, intensity?: Intensity): string[] {
  if (category === "water") return intensity ? waterSuggestions[intensity] : [];
  if (category === "erg") return intensity ? ergSuggestions[intensity] : [];
  if (category === "flex") return flexLengths;
  return []; // weights + off → none
}
/* ── Team workouts ──────────────────────────────────────────────────────────
   The coach can mark a session as a TEAM WORKOUT: everyone who logs it lands on
   one shared board the whole squad can see (db/varsity_results.sql). A board is
   one of two kinds, because not every session is a race:

     ranked  — a test or race piece. Fastest first, with a rank number.
     average — steady training. Who did it, and what the squad averaged. No
               ranking, because ranking a UT2 row is bad coaching.

   Both option lists are DATA (rule 7): the editor loops over them. */
export type BoardKind = "ranked" | "average";
export const boardOptions: { key: BoardKind; label: string; sub: string }[] = [
  { key: "ranked", label: "Ranked", sub: "A test or race piece — fastest first" },
  { key: "average", label: "Everyone", sub: "Steady work — who did it, and the squad average" },
];

// What to suggest when the coach first flicks the switch: hard pieces are the
// ones people race, everything else is training. Always editable afterwards.
export const defaultBoard = (intensity?: string): BoardKind =>
  intensity === "hard" ? "ranked" : "average";


/* ── A session and how sessions are stored ──────────────────────────────────
   `category` and `intensity` are plain STRINGS, not the unions above, because a
   squad now defines its own session types and zones in Settings
   (lib/varsity/trainingConfig.ts) and those keys are whatever the coach's words
   produced. The unions stay as the ROWING DEFAULT — the preset every team starts
   from, and the keys already in the database — which is why they still type the
   constants at the top of this file. */
export type Session = {
  category: string;
  intensity?: string;
  description: string;
  time: string; // preset per period, but editable
  /* Where to be — "Weld Boathouse", "Newell erg room", "meet at the vans".
     Optional and free text: a squad's places are its own, and the time already
     on the session is when to be there. */
  location?: string;
  note?: string;
  teamWorkout?: boolean; // results shared to a squad board
  board?: BoardKind; // which kind of board (only read when teamWorkout)
};

// Sessions live in one map keyed by day+period, so the whole plan is one object.
export type SessionMap = Record<string, Session>;
export function sessionKey(date: Date, period: Period): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${period}`;
}

/*
  The reverse of sessionKey(). Note the key holds a ZERO-BASED month and pads
  nothing ('2026-5-22-AM' is 22 June 2026), so it must never be treated as an
  ISO date or sorted as text — the boards sort on the Date this returns.
  Returns null for a key that isn't in that shape.
*/
export function parseSessionKey(key: string): { date: Date; period: Period } | null {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})-(AM|PM)$/.exec(key);
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]), Number(m[3]));
  return Number.isNaN(date.getTime()) ? null : { date, period: m[4] as Period };
}

// "Tue 22 Jun" — how a workout's date reads on the team board.
export function dayKeyLabel(key: string): string {
  const parsed = parseSessionKey(key);
  if (!parsed) return key;
  const d = parsed.date;
  return `${WD[d.getDay()]} ${d.getDate()} ${MO[d.getMonth()]}`;
}

/*
  The colour + label to show for a session (the intensity wins when there is
  one). These are the ROWING-DEFAULT readings, used by every screen that does
  not have the team's config to hand — the athlete's log, the team boards, the
  video strip. A team on a custom config gets its own words from
  configSessionLabel() / configSessionColor() in trainingConfig.ts; here an
  unknown key falls back to showing itself, so a renamed type is never a blank.
*/
// The squad's own colours first (lib/varsity/teamColors.ts), then the shipped ones.
export function sessionColor(s: Session): string {
  if (s.intensity)
    return teamZoneColor(s.intensity) ?? intensityMeta[s.intensity as Intensity]?.color ?? "var(--muted)";
  return teamTypeColor(s.category) ?? categoryMeta[s.category as Category]?.color ?? "var(--muted)";
}
/*
  THE PIECES of a session, as the coach wrote them, up to the first comma:
  "8×500m, 1:30 rest" → "8×500m". What Home's week strip and the calendar print
  for a UT1 or Hard session (owner, 2026-09-16). Empty when nothing was written.
*/
export function sessionPieces(s: Session): string {
  return s.description.split(",")[0].trim();
}

/*
  THE 2K TEST is named "Erg · 2K" on the team Workouts screens instead of
  "Erg · Hard" (owner, 2026-09-16). It keeps the red of a hard session — it is
  one — and the "2k test" description isn't repeated under the name.
*/
export function isTwoKTest(s: Session): boolean {
  return s.category === "erg" && /^\s*2\s*(k|000\s*m)\b/i.test(s.description);
}
/** sessionLabel, except a 2K test reads "Erg · 2K". */
export function workoutLabel(s: Session): string {
  return isTwoKTest(s) ? `${categoryMeta.erg.label} · 2K` : sessionLabel(s);
}

export function sessionLabel(s: Session): string {
  const cat = categoryMeta[s.category as Category]?.label ?? s.category;
  if (!s.intensity) return cat;
  return `${cat} · ${intensityMeta[s.intensity as Intensity]?.label ?? s.intensity}`;
}

/*
  WHAT A LOGGED SESSION IS CALLED wherever it is LISTED — the month grid, the
  day sheet.

  It used to print the log's own `title`, and a title is whatever it happened
  to be: the coach's description for a prescribed session ("14k UT2", "3x5' @
  30"), whatever the athlete typed for their own ("Main strength — squat, pull,
  press", "Easy run"), or the words "Extra session". So a month of training
  read as a month of unrelated sentences, and two identical outings a week
  apart could look like different kinds of training.

  Now every entry is named the same way — the KIND, and the intensity when the
  session has one:

      Erg · UT2        Water · UT2        Weights        Run

  which is exactly `sessionLabel` for a session the coach prescribed. A
  session the athlete added themselves has no prescribed intensity, so it is
  named by its kind alone. The SIZE of it — the kilometres — is the line
  underneath (logVolumeLabel, lib/varsity/athleteProfile), and what was
  actually done is in the day sheet and the workout itself.
*/
export function logLabel(
  log: { title: string; category: string | null },
  planned?: Session,
): string {
  const { kind, intensity } = logLabelParts(log, planned);
  return intensity ? `${kind} · ${intensity}` : kind;
}

/*
  The same name, in its two pieces — for the month grid, where a cell is about
  40px wide and one line cannot hold both. There the kind takes the whole first
  line, and the second line carries the intensity with the figure at its right:

      Water               Erg                 Weights
      UT2      14k        Hard      18k

  rather than "Water · UT2" wrapping onto two of the cell's three lines with
  the figure pushed to a third.
*/
export function logLabelParts(
  log: { title: string; category: string | null },
  planned?: Session,
): { kind: string; intensity: string | null } {
  if (planned) {
    /*
      A FLEX DAY IS NAMED BY WHAT WAS ACTUALLY DONE.

      "Flex" is the coach saying "train how you like" — it is a permission, not
      a kind of training, and the athlete answers it in the log ("What did you
      do?" → Run / Bike / Erg / Other). Reading the PLAN first meant the answer
      was thrown away: a 40-minute bike on a flex day showed up in the calendar
      as "Flex", the one word that says nothing. So on a flex day the log's own
      category wins, and only a log with nothing said falls back to "Flex".
    */
    if (planned.category === "flex" && log.category && log.category !== "flex") {
      const own = logCategoryMeta[log.category as LogCategory];
      if (own && log.category !== "other") return { kind: own.label, intensity: null };
      return { kind: log.title.trim() || "Flex", intensity: null };
    }
    const cat = categoryMeta[planned.category as Category]?.label ?? planned.category;
    const intensity = planned.intensity
      ? (intensityMeta[planned.intensity as Intensity]?.label ?? planned.intensity)
      : null;
    return { kind: cat, intensity };
  }
  const meta = logCategoryMeta[(log.category ?? "other") as LogCategory];
  /* "Other" is not a name for anything, so a log filed under it keeps whatever
     the athlete called it rather than being flattened to a shrug. A session the
     athlete added themselves has no prescribed intensity, so there is no second
     line to write. */
  if (meta && log.category && log.category !== "other") return { kind: meta.label, intensity: null };
  return { kind: log.title.trim() || "Session", intensity: null };
}

/* ── Blocks + week math ── */
export type BlockStatus = "draft" | "published";
export type Block = {
  id: string;
  name: string;
  start: string; // ISO yyyy-mm-dd
  end: string;
  status: BlockStatus; // new blocks start as a draft
  raceName?: string;
  raceDate?: string; // ISO
  /*
    What the squad was last TOLD about this block — the snapshot the Plan tab
    computes (name, dates, race, every session in range) at the moment it was
    published or the coach pressed Tell the squad. Compared to the current
    snapshot to decide whether that button is offered. Null / absent: never
    told, or published before this was recorded (db/patch_announced.sql).
  */
  announced?: string | null;
};

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function toISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}
export function addDays(iso: string, days: number): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export type DayCell = { date: Date; weekday: string; dayNum: number; month: string; today: boolean };
export type WeekRow = { index: number; rangeLabel: string; days: DayCell[] };

// The Monday on or before a date (rowing weeks run Mon–Sun).
function mondayOnOrBefore(d: Date): Date {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // getDay(): Sun=0 → Monday=offset 0
  return x;
}

// Break a block into whole Monday–Sunday weeks covering its range.
export function buildWeeks(block: Block, today = new Date()): WeekRow[] {
  const end = parseDate(block.end);
  const cursor = mondayOnOrBefore(parseDate(block.start));
  const weeks: WeekRow[] = [];
  let idx = 1;
  while (cursor <= end) {
    const days: DayCell[] = [];
    const wkStart = new Date(cursor);
    for (let i = 0; i < 7; i++) {
      days.push({
        date: new Date(cursor),
        weekday: WD[cursor.getDay()],
        dayNum: cursor.getDate(),
        month: MO[cursor.getMonth()],
        today: sameDay(cursor, today),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    const wkEnd = days[days.length - 1].date;
    weeks.push({
      index: idx++,
      rangeLabel: `${MO[wkStart.getMonth()]} ${wkStart.getDate()} – ${MO[wkEnd.getMonth()]} ${wkEnd.getDate()}`,
      days,
    });
  }
  return weeks;
}

export function blockRangeLabel(block: Block): string {
  const s = parseDate(block.start);
  const e = parseDate(block.end);
  const weeks = Math.ceil((e.getTime() - s.getTime()) / (7 * 864e5)) || 1;
  return `${MO[s.getMonth()]} ${s.getDate()} – ${MO[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()} · ${weeks} weeks`;
}

// Days until the race (or null) — for the block's countdown.
export function daysToRace(block: Block, today = new Date()): number | null {
  if (!block.raceDate) return null;
  const ms = parseDate(block.raceDate).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.max(0, Math.round(ms / 864e5));
}

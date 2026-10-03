/*
  THE CONSOLE WALK'S EXAMPLES — a week to plan and a crew to seat.
  ---------------------------------------------------------------------------
  The Coach Console walk (lib/varsity/coachTour.ts) opens the workout editor and
  a lineup and works them in front of the coach: picks a type and an intensity,
  turns on Repeat, repeats a crew, swaps two rowers (owner, 2026-10-03: "think
  what a 60-year-old coach who sees the app for the first time would need").
  It needs something to work on, and a coach meeting the console for the first
  time has nothing yet — no block, no lineup ever published. These stand in,
  the same way the app walk's example chat does (lib/tourExample.ts).

  NOTHING HERE IS EVER SAVED. The screens show these only while a walk is on
  screen, and while they do they write nothing: the Plan tab keeps its real
  (empty) plan underneath and only draws this one, and a lineup opened by the
  walk is an example for as long as it is open — no autosave, no Publish.

  THE PLAN: shown only when the coach has no block. A coach WITH a plan walks
  through their own week — the editor is opened, filled in and left with Back,
  which saves nothing.

  THE CREW: always, because a real practice cannot be shown safely — pressing
  Repeat on it would write a draft lineup. It is an eight from the squad's own
  roster, with one rower out sick, so the walk can show what Repeat does with
  someone who cannot row today: their seat comes across empty.

  The week is built from the squad's OWN training settings — its types, its
  zones, its most-used workouts — so a swimming coach sees Pool and Aerobic,
  not Water and UT2. The words that are not settings live here (rule 7).
*/
import { addDays, sessionKey, toISO, type Block, type SessionMap } from "./coachPlan";
import { libraryKey, type TrainingConfig } from "./trainingConfig";
import { roster, makeSeats, DEFAULT_DOCK, type Boat, type BoatKind, type OutReason } from "./coachLineup";

/** No real block can have this id (real ones are `blk-<timestamp>`). */
export const EXAMPLE_BLOCK_ID = "tour-example-block";

const EXAMPLE_NAME = "Example block";
const EXAMPLE_RACE = "Your next race";
const EXAMPLE_WEEKS = 6;

/** Monday of the week `d` is in, at midnight. */
function mondayOf(d: Date): Date {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}

/*
  THE EXAMPLE WEEK. Six weeks from this Monday, a race at the end, and this
  week planned the way a squad's week looks: a session most mornings, a few
  afternoons, the colours of easy, steady and hard all on show — and MONDAY
  MORNING LEFT EMPTY, because that is the slot the walk opens, and adding a
  session to an empty slot is the thing being taught.
*/
export function exampleTrainingWeek(cfg: TrainingConfig, today = new Date()): { block: Block; sessions: SessionMap } {
  const start = mondayOf(today);
  const startIso = toISO(start);
  const endIso = addDays(startIso, EXAMPLE_WEEKS * 7 - 1);
  const block: Block = {
    id: EXAMPLE_BLOCK_ID,
    name: EXAMPLE_NAME,
    start: startIso,
    end: endIso,
    status: "draft",
    raceName: EXAMPLE_RACE,
    raceDate: endIso,
  };

  const zoned = cfg.types.filter((t) => t.hasZones && cfg.zones.length > 0);
  const plain = cfg.types.filter((t) => !t.hasZones && t.key !== "off");
  const off = cfg.types.find((t) => t.key === "off");
  const sessions: SessionMap = {};
  const put = (dayOffset: number, period: "AM" | "PM", typeKey: string, zoneKey?: string) => {
    const d = new Date(start);
    d.setDate(start.getDate() + dayOffset);
    sessions[sessionKey(d, period)] = {
      category: typeKey,
      intensity: zoneKey,
      description: cfg.library[libraryKey(typeKey, zoneKey)]?.[0] ?? "",
      time: cfg.times[period],
    };
  };

  /* Day by day: [day, period, which zoned type, which zone]. The zone indexes
     run easy → hard, so 0 / 1 / 2 are the squad's own three. */
  const zonedPlan: [number, "AM" | "PM", number, number][] = [
    [1, "AM", 0, 1],
    [2, "AM", 0, 0],
    [3, "AM", 1, 2],
    [4, "AM", 0, 0],
    [5, "AM", 0, 2],
  ];
  if (zoned.length > 0) {
    for (const [day, period, t, z] of zonedPlan) {
      const type = zoned[t % zoned.length];
      put(day, period, type.key, cfg.zones[Math.min(z, cfg.zones.length - 1)].key);
    }
  }
  // Afternoons: a lift or a second session, where the squad has one.
  if (plain[0]) {
    put(0, "PM", plain[0].key);
    put(3, "PM", plain[0].key);
  }
  if (off) put(6, "AM", off.key);
  return { block, sessions };
}

/* ── The example crew ─────────────────────────────────────────────────────── */

/** Which seat the sick rower had (0 = bow), so their seat comes across empty. */
const SICK_SEAT = 3;

/*
  The last crew "published": an eight from the roster — the first eight rowers
  and the first coxswain on it — on the practice before today's, so the Repeat
  chip says "Repeat <yesterday> AM". The rigging is the squad's first boat that
  carries a cox and its most seats, so it is an eight for a rowing squad and
  whatever their biggest boat is for anyone else.
*/
export function exampleCrew(boatKinds: BoatKind[], today = new Date()): {
  from: string;
  boats: Boat[];
  out: Record<string, OutReason>;
} {
  const kind =
    [...boatKinds].sort((a, b) => Number(b.cox) - Number(a.cox) || b.rowers - a.rowers)[0] ?? {
      key: "8+",
      symbol: "8+",
      name: "Eight",
      rowers: 8,
      cox: true,
    };
  const rowers = roster.filter((a) => !a.cox).slice(0, kind.rowers);
  const cox = kind.cox ? (roster.find((a) => a.cox) ?? null) : null;
  const seats = makeSeats(kind.rowers).map((s, i) => ({ ...s, athleteId: rowers[i]?.id ?? null }));
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const sick = rowers[Math.min(SICK_SEAT, rowers.length - 1)];
  return {
    from: sessionKey(yesterday, "AM"),
    boats: [
      {
        id: "tour-example-boat",
        badge: kind.key,
        name: "1V",
        dock: DEFAULT_DOCK,
        oars: "",
        note: "",
        hasCox: kind.cox,
        coxId: cox?.id ?? null,
        seats,
      },
    ],
    out: sick ? { [sick.id]: "SICK" } : {},
  };
}

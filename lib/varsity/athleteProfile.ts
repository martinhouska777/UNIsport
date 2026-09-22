/*
  VARSITY ATHLETE PROFILE — editable record (source of truth for the Profile tab)
  ------------------------------------------------------------------------------
  The athlete's own rowing record: which year they are on the team, their
  height/weight, current status, and erg personal bests. This is private,
  editable data — it persists in the SAME `profiles.data` JSON the normal app
  profile uses, under a `varsity` sub-key, so the two never clash and one DB row
  still holds the whole person. Falls back to localStorage with no Supabase env.

  Everything offered as a choice (team-year pills, status options, which PR
  pieces exist) lives HERE as data — never hardcoded in the screen (rule 1 / 7).

  The athlete's NAME is NOT stored here: it is the same value the normal profile
  shows (profiles.data.name), read via fetchProfileFullName.
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { classYears, freshmanClassYear } from "@/lib/onboarding";
import { sideMeta, type Side } from "@/lib/varsity/coachLineup";
import { cleanDaysOut, type DayOut, type DaysOut } from "@/lib/varsity/daysOut";
import { cleanCheckIns, emptyCheckIn, type CheckIn, type CheckIns } from "@/lib/varsity/checkIn";

/* ── Editable option lists ── */

// Class standing on the team (the "freshman / sophomore …" the owner asked for).
export const teamYearOptions = ["Freshman", "Sophomore", "Junior", "Senior", "Grad"] as const;

/*
  What you are in a boat. A coxswain can only ever take the cox seat — the
  lineup builder already enforces that (see `cox` in lib/varsity/coachLineup.ts)
  — so picking Coxswain makes the side question meaningless and it disappears.
*/
export const boatRoleOptions = ["Rower", "Coxswain"] as const;
export type BoatRole = (typeof boatRoleOptions)[number];

/*
  Which side you row. The `Side` type and its oar colors already live in
  coachLineup.ts, because the coach's builder colors every seat by it — this
  just gives the ATHLETE a way to answer it about themselves instead of leaving
  the coach to set thirty of them by hand.

  ONE name per side, taken straight from sideMeta: Port, Starboard. An athlete
  answering this reads the same word here that the coach reads on the roster
  and on the seat in the boat — and the same colour, since the roster draws
  the blade colours.

  TWO OPTIONS, not three (owner, 2026-09-21): a rower is port or starboard,
  and somebody who can do either picks the one they are being seated on. The
  stored "B" is not offered here — it is what a coxswain's record carries and
  what a rower carries until they answer.
*/
export const sideOptions: { key: Side; label: string }[] = [
  { key: "P", label: sideMeta.P.label },
  { key: "S", label: sideMeta.S.label },
];

/** "Starboard" — for the chip on the profile. Null for a coxswain. */
export function sideLabel(role: BoatRole, side: Side): string | null {
  if (role === "Coxswain") return null;
  return sideOptions.find((s) => s.key === side)?.label ?? null;
}

// Current status — `tone` maps to a theme token, never a raw color (rule 1).
export type StatusTone = "success" | "warn" | "danger" | "muted";
export const statusOptions: { title: string; sub: string; tone: StatusTone }[] = [
  { title: "Active", sub: "Available for training and selection", tone: "success" },
  // Same word as the lineup's own out-reason (outMeta.SICK in coachLineup.ts)
  // — a day or two, not weeks, which is what separates it from Injured below.
  { title: "Sick", sub: "Out today — back tomorrow", tone: "warn" },
  { title: "Injured", sub: "Out of selection — rehab in progress", tone: "danger" },
  { title: "Away", sub: "Travelling / off the water this week", tone: "muted" },
];

// The erg pieces tracked as personal bests (the owner asked for 2K, 5K, 6K, 30r20).
// Editing this list changes which PRs the screen shows — no component change.
export const prPieces = ["2K", "5K", "6K", "30′ r20"] as const;

// Per-category dot color for the training calendar. These are CONTENT colors
// (like a house's identity colors) so per rule 1's exception they live as data
// and are applied via inline style — where a theme token fits we use it.
export const logCategoryColor: Record<string, string> = {
  water: "#4a90a4", // teal — on the water
  erg: "#60a5fa", // blue — erg
  weights: "#a78bfa", // purple — lifting
  run: "#34d399", // green — running
  bike: "#f59e0b", // amber — bike
  flex: "var(--accent)", // gold — mobility
  off: "var(--muted)",
  other: "var(--muted)",
};
// Human labels for the calendar legend (same keys as logCategoryColor).
export const logCategoryLabel: Record<string, string> = {
  water: "Water",
  erg: "Erg",
  weights: "Weights",
  run: "Run",
  bike: "Bike",
  flex: "Flex",
  off: "Off",
  other: "Other",
};
/*
  Categories shown in the calendar legend, in order — the month's training by
  what it actually WAS.

  Flex is deliberately absent. "Flex" is the coach's word for a day you train how
  you like; how much of it you did is not a number anyone wants. What they want
  is the thing they actually did on it — so a flex day is logged as a Run or a
  Bike (components/varsity/log/LogScreen.tsx) and counts there instead.
*/
export const legendCategories = ["water", "erg", "weights", "run", "bike"] as const;

// Which logged categories count as "metres rowed" for the monthly total.
export const rowingCategories = new Set(["water", "erg"]);

// 6 -> "6", 7.5 -> "7.5". No trailing ".0" in a 33px-wide column.
const trimNum = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

/*
  HOW MUCH was done, short enough for a month cell.

  This replaced the category word on the second line of a calendar chip. The
  title above it already says the type — "Erg · UT2" sat on top of "Erg", so the
  cell spent two of its three lines saying "erg" twice and never said the one
  thing that wasn't written anywhere else: the size of the session.

  Rowing is measured in metres and written in kilometres ("6 km", "7.5 km" —
  the owner, 2026-09-14; it was "6k"). Everything else
  is measured in minutes. A run logged with a distance instead gets kilometres,
  because that is how a run is talked about. A rest day, a lifting session and
  anything logged with no figures get NO second line at all — see below.

  Kept SHORT on purpose: the column is about 33px of text, so "Water · 16k"
  truncates to "Wate…" and loses the number it was there for.
*/
export function logVolumeLabel(
  category: string | null,
  metres: number | null,
  minutes: number | null,
): string {
  const key = category ?? "other";
  /*
    SOME KINDS GET NO SECOND LINE AT ALL.

    A rest day is not a quantity — "Off" under a block that already says Off
    was the word twice in a cell 33px wide. And a lifting session's minutes
    are the least interesting thing about it (the lifts and the weights are,
    and those are in the day sheet): it was printing "60 min" where the erg
    beside it printed the metres that actually say how big the session was.
  */
  if (key === "off" || key === "weights") return "";
  if (rowingCategories.has(key) && metres) return `${trimNum(metres / 1000)} km`;
  if (minutes) return `${minutes} min`;
  if (metres) return `${trimNum(metres / 1000)} km`;
  /*
    No figures logged: say NOTHING rather than falling back to the category
    word. The title directly above is already that word, so the fallback only
    ever produced "Erg" under "Erg" — the duplicate it was meant to avoid.
  */
  return "";
}

// What the profile's graph charts before anyone touches the arrows on it.
// Keys come from lib/varsity/athleteStats.
export const defaultStatMetric = "distance";

/* ── The stored record ── */
export type VarsityAthleteProfile = {
  teamYear: string; // one of teamYearOptions
  boatRole: BoatRole; // Rower | Coxswain
  side: Side; // P | S | B — meaningless for a coxswain, kept so a switch back works
  heightCm: number | null;
  weightKg: number | null;
  status: string; // a statusOptions title
  prs: Record<string, string>; // piece label -> value (e.g. "2K" -> "6:08.4")
  statMetric: string; // what the Statistics graph (and its three numbers) shows
  statChart: string; // how it is drawn — "bars" | "line" (lib/varsity/athleteStats)
  /*
    WHICH NAME ON THE SQUAD LIST IS YOU. The coach's roster (lib/varsity/
    coachLineup.ts) and the athlete's account were two lists with nothing
    joining them, so "your seat" in a published boat was found by comparing
    the name you typed at setup with the name the coach typed on the roster —
    one accent or a nickname apart and you were never in a boat. This is the
    join: the roster id you claimed as yours. Null until you pick one.
  */
  rosterId: string | null;
  /*
    DAYS OUT — the days you didn't train and why (lib/varsity/daysOut.ts), keyed
    by ISO date. Written by the status, the calendar and the Missed button.
  */
  daysOut: DaysOut;
  /* The day the status last turned Sick / Injured / Away — so switching back
     knows which days to offer to log. Null while Active. */
  statusSince: string | null;
  /*
    THE DAILY CHECK-IN (lib/varsity/checkIn.ts), keyed by ISO date: how you
    slept, how you feel, where you are sore. Written from the bottom of the Log
    tab, for today only, and read back by the Recovery group in your own
    Statistics. Private to the athlete — the coach's card does not carry it.
  */
  checkIns: CheckIns;
  /*
    WHETHER TEAMMATES SEE YOUR CALENDAR (owner, 2026-09-13). Opening a rower on
    the Team tab shows their training month — so the squad can see how the
    people who train best actually train — but each athlete decides. On by
    default; the switch sits under "Training calendar" on your profile. The
    coach sees it either way (can.readTraining).
  */
  showCalendar: boolean;
};

// Best guess at class standing from the academic class year (e.g. '30 = Freshman
// when '30 is the freshman class). Still fully editable afterwards.
export function defaultTeamYear(classYear: string): string {
  const fresh = classYears.indexOf(freshmanClassYear);
  const mine = classYears.indexOf(classYear);
  if (fresh < 0 || mine < 0) return "";
  const step = fresh - mine; // 0 = freshman, 1 = sophomore, …
  return teamYearOptions[step] ?? "";
}

export function defaultProfile(classYear: string): VarsityAthleteProfile {
  return {
    teamYear: defaultTeamYear(classYear),
    // NO SIDE is the honest default for anyone who never answered. It is not a
    // third kind of rower — the chip reads "Not set" until they pick one.
    boatRole: "Rower",
    side: "B",
    heightCm: null,
    weightKg: null,
    status: statusOptions[0].title,
    prs: {},
    statMetric: defaultStatMetric,
    statChart: "bars",
    rosterId: null,
    daysOut: {},
    statusSince: null,
    checkIns: {},
    showCalendar: true,
  };
}

// Fold a saved (partial) record onto the defaults so the screen always has a
// complete object to render.
export function withDefaults(
  saved: Partial<VarsityAthleteProfile> | undefined,
  classYear: string,
): VarsityAthleteProfile {
  const base = defaultProfile(classYear);
  return {
    teamYear: saved?.teamYear || base.teamYear,
    // Both are checked against the real option lists, so a value written by an
    // older build (or hand-edited JSON) can never render an empty pill row.
    boatRole: boatRoleOptions.includes(saved?.boatRole as BoatRole)
      ? (saved!.boatRole as BoatRole)
      : base.boatRole,
    side: saved?.side === "P" || saved?.side === "S" ? saved.side : base.side,
    heightCm: saved?.heightCm ?? base.heightCm,
    weightKg: saved?.weightKg ?? base.weightKg,
    status: saved?.status || base.status,
    prs: { ...base.prs, ...(saved?.prs ?? {}) },
    // Checked against the real metric list where it's rendered, so a stale key
    // from an older version can't blank the graph.
    statMetric: saved?.statMetric || base.statMetric,
    // Same story as the measure: checked against the real list where it's used,
    // so a key from an older build falls back to columns rather than to nothing.
    statChart: saved?.statChart || base.statChart,
    rosterId: saved?.rosterId || null,
    // Older accounts have null / nothing here, never a map (see the memory on
    // DB nulls): cleaned into a safe object every time.
    daysOut: cleanDaysOut(saved?.daysOut),
    statusSince:
      typeof saved?.statusSince === "string" && /^\d{4}-\d{2}-\d{2}$/.test(saved.statusSince)
        ? saved.statusSince
        : null,
    // Same story as the days out: nothing there on an older account, and every
    // answer checked against the real option lists on the way in.
    checkIns: cleanCheckIns(saved?.checkIns),
    // Only an explicit "no" hides it: older accounts have nothing (or null)
    // here, and they keep the default.
    showCalendar: saved?.showCalendar !== false,
  };
}

/*
  THE TWO THINGS A BOAT IS READ BY: the name you go by, and the roster id you
  claimed. Everything that decides "is this my seat" (lib/varsity/lineupStore)
  takes this pair rather than a bare name, so the id wins whenever there is
  one and the name is only ever a fallback for an account that hasn't claimed.
*/
export type SeatIdentity = { name: string; rosterId: string | null };

export async function fetchSeatIdentity(userId: string | null): Promise<SeatIdentity> {
  const b = await fetchAthleteProfile(userId);
  return { name: b.name, rosterId: b.profile.rosterId };
}

/** Claim (or, with null, let go of) a roster seat. One read, one merged write. */
export async function claimRosterSeat(
  userId: string | null,
  rosterId: string | null,
): Promise<{ error?: string }> {
  const b = await fetchAthleteProfile(userId);
  return saveAthleteProfile(userId, { ...b.profile, rosterId });
}

/* ── localStorage fallback (no Supabase env) ── */
const keyFor = (userId: string) => `varsityAthleteProfile:${userId}`;
function loadLocal(userId: string): Partial<VarsityAthleteProfile> | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    return raw ? (JSON.parse(raw) as Partial<VarsityAthleteProfile>) : undefined;
  } catch {
    return undefined;
  }
}
function saveLocal(userId: string, p: VarsityAthleteProfile) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(p));
  }
}

// Everything the Profile screen needs in one read: the shared name + academic
// class year (from onboarding), plus the merged, ready-to-render varsity record.
export type AthleteProfileBundle = {
  name: string;
  classYear: string;
  /** The profile photo set on the normal Profile tab — one photo, both modes. */
  photo: string | null;
  profile: VarsityAthleteProfile;
};

/* ── Read the athlete's varsity profile bundle (always returns complete data) ── */
export async function fetchAthleteProfile(userId: string | null): Promise<AthleteProfileBundle> {
  if (!userId || !hasSupabaseEnv()) {
    // Dev / no-Supabase: name + class year aren't stored locally, only the
    // varsity record is. Default the rest.
    return { name: "", classYear: "", photo: null, profile: withDefaults(loadLocal(userId ?? ""), "") };
  }
  const supabase = createClient();
  const { data } = await supabase.from("profiles").select("data").eq("id", userId).maybeSingle();
  const d = (data?.data as
    | { name?: string; classYear?: string; photo?: string | null; varsity?: Partial<VarsityAthleteProfile> }
    | undefined) ?? {};
  const classYear = d.classYear ?? "";
  return {
    name: (d.name ?? "").trim(),
    classYear,
    photo: d.photo ?? null,
    profile: withDefaults(d.varsity, classYear),
  };
}

/* ── Save it back, merged under data.varsity so other profile fields survive ── */
export async function saveAthleteProfile(
  userId: string | null,
  next: VarsityAthleteProfile,
): Promise<{ error?: string }> {
  if (!userId) return {};
  if (!hasSupabaseEnv()) {
    saveLocal(userId, next);
    return {};
  }
  const supabase = createClient();
  const { data: row } = await supabase.from("profiles").select("data").eq("id", userId).maybeSingle();
  const current = (row?.data as Record<string, unknown>) ?? {};
  const merged = { ...current, varsity: next };
  const { error } = await supabase
    .from("profiles")
    .update({ data: merged, updated_at: new Date().toISOString() })
    .eq("id", userId);
  return error ? { error: error.message } : {};
}

/* ── Days out (lib/varsity/daysOut.ts), read and written on this same record ── */

/** The athlete's days out. */
export async function fetchDaysOut(userId: string | null): Promise<DaysOut> {
  const { profile } = await fetchAthleteProfile(userId);
  return profile.daysOut;
}

/*
  ONE READ-MODIFY-WRITE AT A TIME.

  The days out and the check-in both read the whole profile, change one field
  and write it all back — and they share the record, so two of them in flight
  at once means the second one read BEFORE the first one wrote, and its write
  puts the older copy back. The check-in card saves on every tap, so answering
  three questions quickly lost the first two (audit, 2026-09-19).

  Everything that rewrites the record goes through here and waits its turn. A
  failed write does not stop the queue: the next one starts from a fresh read
  either way.
*/
let profileWrites: Promise<unknown> = Promise.resolve();
function inTurn<T>(work: () => Promise<T>): Promise<T> {
  const run = profileWrites.then(work, work);
  profileWrites = run.catch(() => undefined);
  return run;
}

/**
 * Write some days (a value) or clear them (null), merged onto what is saved
 * NOW — read fresh, so a day marked here never wipes a profile edit made
 * somewhere else. Returns the whole map as saved.
 */
export async function saveDaysOut(
  userId: string | null,
  patch: Record<string, DayOut | null>,
): Promise<DaysOut> {
  return inTurn(async () => {
    const { profile } = await fetchAthleteProfile(userId);
    const next: DaysOut = { ...profile.daysOut };
    for (const [iso, v] of Object.entries(patch)) {
      if (v) next[iso] = v;
      else delete next[iso];
    }
    await saveAthleteProfile(userId, { ...profile, daysOut: next });
    return next;
  });
}

/* ── The daily check-in (lib/varsity/checkIn.ts), on the same record ── */

/** Every check-in this athlete has written. */
export async function fetchCheckIns(userId: string | null): Promise<CheckIns> {
  const { profile } = await fetchAthleteProfile(userId);
  return profile.checkIns;
}

/**
 * Answer one question of one day. Read fresh and merged, like the days out, so
 * a tap here can never wipe a profile edit made on another screen — the card
 * writes on every tap, and three taps in a row must all survive.
 * Returns the day as saved.
 */
export async function saveCheckIn(
  userId: string | null,
  iso: string,
  patch: Partial<CheckIn>,
): Promise<CheckIn> {
  return inTurn(async () => {
    const { profile } = await fetchAthleteProfile(userId);
    const day: CheckIn = { ...emptyCheckIn(), ...(profile.checkIns[iso] ?? {}), ...patch };
    const checkIns: CheckIns = { ...profile.checkIns, [iso]: day };
    await saveAthleteProfile(userId, { ...profile, checkIns });
    return day;
  });
}

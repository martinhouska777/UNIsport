/*
  WINTER POINTS — the team's winter training competition (owner, 2026-11-08,
  look A, then "Can you put it in the app now? I like it.").
  ---------------------------------------------------------------------------
  The captain (or the coach) sets it up in the Coach Console under Settings:
  dates, teams, how many points each activity is worth, the limits, the rules
  and prizes, then Publish. Athletes open the standings from their Profile.
  The points come from the sessions they already log: each activity says what
  kind of log it is (`type`), and a logged session counts as the activity it
  names (`wp_activity`), or else the first activity of its kind.

  Everything here is pure: the config's shape, the HUBC 2025-26 defaults and
  the scoring. The reads and writes are in winterPointsStore.ts.

  THE RULES, as HUBC counts them:
    - minutes or km times the activity's points, or a flat amount a session
    - heart rate needed on the cardio that isn't erg, BikeErg or rowing
    - weights 3 a week, 60 min or more; core only after 60 points of cardio
    - 2 hard workouts a week; the first 150 min of cross-training at 1:1
    - a daily cap of 150, the best 6 days count
    - a full week (6 days of 60 cardio and 1 hard workout) is x1.2
    - a team's week is its top 4; a class drops its worst 2 and averages
    - photo of the week, 75 points to the one the captain picks
*/

export type WpType = "erg" | "water" | "weights" | "run" | "bike" | "other";
export type WpPer = "min" | "km" | "session";

export type WpActivity = {
  id: string;
  /** "hard" marks the hard workouts the full week asks for. */
  key: string;
  name: string;
  /** What kind of logged session this activity is (Logged as). */
  type: WpType;
  color: string;
  points: number;
  per: WpPer;
  most: number | null;
  short: number | null;
  cday: number | null;
  hr: boolean;
  cardio: boolean;
};

export type WpTeam = {
  id: string;
  name: string;
  color: string;
  /** user id */
  captain: string;
  /** user ids */
  members: string[];
};

export type WpLimits = {
  cap: { on: boolean; v: number };
  days: { on: boolean; v: number };
  top: { on: boolean; v: number };
  cross: { on: boolean; v: number };
  full: { on: boolean; bonus: number; days: number; perDay: number; hard: number };
  min: { on: boolean; v: number };
  /** winners: week number -> user id */
  photo: { on: boolean; v: number; winners: Record<string, string> };
  classes: { on: boolean; drop: number };
};

export type WinterPoints = {
  name: string;
  start: string; // yyyy-mm-dd
  end: string;
  closeDay: number; // 0 Sunday … 6 Saturday
  closeTime: string; // "21:00"
  teams: WpTeam[];
  acts: WpActivity[];
  lim: WpLimits;
  rules: string;
};

/* What a logged session is called, in the order the Log screen shows them. */
export const wpTypes: { key: WpType; label: string }[] = [
  { key: "erg", label: "Erg" },
  { key: "water", label: "Water" },
  { key: "weights", label: "Weights" },
  { key: "run", label: "Run" },
  { key: "bike", label: "Bike" },
  { key: "other", label: "Other" },
];

/* Team colours, handed out in turn to a new team (content colours, data only). */
export const wpTeamColors = [
  "#2563eb", "#7c3aed", "#16a34a", "#f59e0b", "#0891b2", "#db2777", "#ea580c", "#475569",
  "#0d9488", "#9333ea", "#65a30d", "#e11d48",
];

/* Places 1, 2 and 3 on the standings: gold, silver and bronze number badges. */
export const wpRankColors = ["#e0a51a", "#98a3b1", "#c07b3e"];

/* An activity's dot, by what it is logged as (the Log screen's own colours). */
export const wpTypeColor: Record<WpType, string> = {
  erg: "#60a5fa",
  water: "#4a90a4",
  weights: "#ff00ff",
  run: "#c084fc",
  bike: "#f59e0b",
  other: "#676d76",
};

/* ── dates ── */
const DMS = 86400000;
const pd = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
export const addDays = (s: string, n: number) => iso(pd(s) + n * DMS);
export const daysBetween = (a: string, b: string) => Math.round((pd(b) - pd(a)) / DMS);
export const isoToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const fmtDate = (s: string) => {
  const d = new Date(pd(s));
  return `${WD[d.getUTCDay()]} ${d.getUTCDate()} ${MO[d.getUTCMonth()]}`;
};
export const fmtDay = (s: string) => {
  const d = new Date(pd(s));
  return `${WD[d.getUTCDay()]} ${d.getUTCDate()}`;
};
export const fmtTime = (t: string) => {
  const [h, m] = String(t || "21:00").split(":").map(Number);
  return `${h % 12 || 12}:${String(m || 0).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};
export const fmtPoints = (x: number) =>
  (Math.round(x * 10) / 10).toLocaleString("en-US", { maximumFractionDigits: 1 });
export const fmtNum = (x: number) => String(Math.round(x * 100) / 100);
export const ordinal = (n: number) => {
  const t = n % 100;
  const u = n % 10;
  return n + (u === 1 && t !== 11 ? "st" : u === 2 && t !== 12 ? "nd" : u === 3 && t !== 13 ? "rd" : "th");
};

/* ── the HUBC 2025-26 defaults ── */
const act = (
  key: string,
  name: string,
  type: WpType,
  color: string,
  points: number,
  per: WpPer,
  o: Partial<Pick<WpActivity, "most" | "short" | "cday" | "hr" | "cardio">> = {},
): WpActivity => ({
  id: key,
  key,
  name,
  type,
  color,
  points,
  per,
  most: o.most ?? null,
  short: o.short ?? null,
  cday: o.cday ?? null,
  hr: o.hr ?? false,
  cardio: o.cardio ?? true,
});

export const defaultActivities = (): WpActivity[] => [
  act("erg", "Erg", "erg", "#60a5fa", 1, "min"),
  act("big", "Big boat", "water", "#4a90a4", 4, "km"),
  act("small", "Small boats", "water", "#4a90a4", 5, "km"),
  act("berg", "BikeErg", "bike", "#f59e0b", 0.75, "min"),
  act("watt", "Watt bike", "bike", "#f59e0b", 0.75, "min", { hr: true }),
  act("road", "Road bike", "bike", "#f59e0b", 0.3, "min", { hr: true }),
  act("run", "Run", "run", "#c084fc", 0.75, "min", { hr: true }),
  act("ski", "Cross country ski", "other", "#0891b2", 0.5, "min", { hr: true }),
  act("other", "Other cardio", "other", "#676d76", 0.1, "min", { hr: true }),
  act("weights", "Weights", "weights", "#ff00ff", 40, "session", { most: 3, short: 60, cardio: false }),
  act("core", "Core", "weights", "#16a34a", 10, "session", { cday: 60, cardio: false }),
  act("hard", "Hard workout", "erg", "#b91c1c", 100, "session", { most: 2 }),
];

export const defaultLimits = (): WpLimits => ({
  cap: { on: true, v: 150 },
  days: { on: true, v: 6 },
  top: { on: true, v: 4 },
  cross: { on: true, v: 150 },
  full: { on: true, bonus: 1.2, days: 6, perDay: 60, hard: 1 },
  min: { on: true, v: 1800 },
  photo: { on: true, v: 75, winners: {} },
  classes: { on: true, drop: 2 },
});

/* A new event starts next Monday and runs five weeks; the week closes Sunday 9 PM. */
export function defaultWinterPoints(today = isoToday()): WinterPoints {
  const dow = new Date(pd(today)).getUTCDay();
  const start = addDays(today, ((8 - dow) % 7) || 7);
  return {
    name: "Winter points",
    start,
    end: addDays(start, 34),
    closeDay: 0,
    closeTime: "21:00",
    teams: [],
    acts: defaultActivities(),
    lim: defaultLimits(),
    rules: "",
  };
}

/* A stored config written by an older build, or half empty: fill in what is missing. */
export function normaliseWinterPoints(raw: unknown): WinterPoints | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Partial<WinterPoints>;
  const base = defaultWinterPoints();
  const lim = (v.lim ?? {}) as Partial<WpLimits>;
  const dl = base.lim;
  return {
    name: typeof v.name === "string" && v.name.trim() ? v.name : base.name,
    start: typeof v.start === "string" ? v.start : base.start,
    end: typeof v.end === "string" ? v.end : base.end,
    closeDay: typeof v.closeDay === "number" ? v.closeDay : base.closeDay,
    closeTime: typeof v.closeTime === "string" ? v.closeTime : base.closeTime,
    teams: Array.isArray(v.teams)
      ? v.teams.map((t) => ({ ...t, members: Array.isArray(t.members) ? t.members : [] }))
      : [],
    acts: Array.isArray(v.acts) ? v.acts.map((a) => ({ ...a, type: a.type ?? "other" })) : base.acts,
    lim: {
      cap: { ...dl.cap, ...lim.cap },
      days: { ...dl.days, ...lim.days },
      top: { ...dl.top, ...lim.top },
      cross: { ...dl.cross, ...lim.cross },
      full: { ...dl.full, ...lim.full },
      min: { ...dl.min, ...lim.min },
      photo: { ...dl.photo, ...lim.photo, winners: { ...(lim.photo?.winners ?? {}) } },
      classes: { ...dl.classes, ...lim.classes },
    },
    rules: typeof v.rules === "string" ? v.rules : "",
  };
}

/* ── how a logged session is read ── */
export type WpLog = {
  id: string;
  date: string;
  category: string | null;
  minutes: number | null;
  metres: number | null;
  /** The activity id it was logged as; null = the first of its kind. */
  activity: string | null;
  heartRate: boolean | null;
};

/** The activities a session of this kind can count as, in the setup's order. */
export const activitiesOfType = (cfg: WinterPoints, category: string | null) =>
  cfg.acts.filter((a) => a.type === category);

export function activityFor(cfg: WinterPoints, log: WpLog): WpActivity | null {
  if (log.activity) {
    const named = cfg.acts.find((a) => a.id === log.activity);
    if (named) return named;
  }
  return activitiesOfType(cfg, log.category)[0] ?? null;
}

/* ── the event's weeks ── */
export const nWeeks = (cfg: WinterPoints) => {
  const n = daysBetween(cfg.start, cfg.end) + 1;
  return n > 0 ? Math.ceil(n / 7) : 0;
};
export const curWeek = (cfg: WinterPoints, today: string) =>
  today < cfg.start ? 0 : Math.min(Math.floor(daysBetween(cfg.start, today) / 7) + 1, nWeeks(cfg));
export const weekStart = (cfg: WinterPoints, w: number) => addDays(cfg.start, (w - 1) * 7);
export const weekOf = (cfg: WinterPoints, date: string) => Math.floor(daysBetween(cfg.start, date) / 7) + 1;
/** Inside the dates, up to a week after the end so the results can be read. */
export const isRunning = (cfg: WinterPoints | null, today: string): cfg is WinterPoints =>
  !!cfg && today >= cfg.start && today <= addDays(cfg.end, 7);
export const inEvent = (cfg: WinterPoints, date: string, today: string) =>
  date >= cfg.start && date <= cfg.end && date <= today;

/* ── scoring ── */
export type Tag = { label: string; bad: boolean };
export type SessionScore = { log: WpLog; act: WpActivity; pts: number; tags: Tag[] };
export type DayScore = {
  date: string;
  sessions: SessionScore[];
  cardio: number;
  raw: number;
  total: number;
  capped: boolean;
  counted: boolean;
};
export type WeekScore = { w: number; days: DayScore[]; base: number; mult: number; photo: number; total: number };

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

/** One person's week, from their sessions (any order; sorted here by day, then as logged). */
export function scoreWeek(cfg: WinterPoints, pid: string, logs: WpLog[], w: number, today: string): WeekScore {
  const L = cfg.lim;
  const ws = weekStart(cfg, w);
  let we = addDays(ws, 6);
  if (we > cfg.end) we = cfg.end;
  const last = we < today ? we : today;
  const days: DayScore[] = [];
  for (let i = 0; i < 7; i++) {
    const dt = addDays(ws, i);
    if (dt > last) break;
    days.push({ date: dt, sessions: [], cardio: 0, raw: 0, total: 0, capped: false, counted: true });
  }
  const mine = logs
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => l.date >= ws && l.date <= last)
    .sort((a, b) => (a.l.date < b.l.date ? -1 : a.l.date > b.l.date ? 1 : a.i - b.i))
    .map(({ l }) => l);
  const used: Record<string, number> = {};
  let cross = 0;
  for (const l of mine) {
    const a = activityFor(cfg, l);
    const day = days.find((x) => x.date === l.date);
    if (!a || !day) continue;
    const s: SessionScore = { log: l, act: a, pts: 0, tags: [] };
    let ok = true;
    if (a.hr && !l.heartRate) {
      s.tags.push({ label: "No heart rate", bad: true });
      ok = false;
    }
    if (ok && a.short && (l.minutes ?? 0) < a.short) {
      s.tags.push({ label: `Under ${a.short} min`, bad: true });
      ok = false;
    }
    if (ok && a.most) {
      const u = used[a.id] ?? 0;
      if (u >= a.most) {
        s.tags.push({ label: `${ordinal(u + 1)} this week`, bad: true });
        ok = false;
      } else used[a.id] = u + 1;
    }
    if (ok) {
      if (a.per === "min") {
        const m = l.minutes ?? 0;
        if (L.cross.on && a.hr && a.points < 1) {
          const take = Math.min(m, Math.max(0, L.cross.v - cross));
          cross += take;
          s.pts = take + (m - take) * a.points;
          if (take > 0) s.tags.push({ label: "1:1", bad: false });
        } else s.pts = m * a.points;
      } else if (a.per === "km") s.pts = ((l.metres ?? 0) / 1000) * a.points;
      else s.pts = a.points;
    }
    day.sessions.push(s);
  }
  for (const day of days) {
    day.cardio = sum(day.sessions.filter((s) => s.act.cardio).map((s) => s.pts));
    for (const s of day.sessions) {
      if (s.act.cday && s.pts > 0 && day.cardio < s.act.cday) {
        s.pts = 0;
        s.tags.push({ label: `Under ${s.act.cday} cardio`, bad: true });
      }
    }
    day.raw = sum(day.sessions.map((s) => s.pts));
    day.total = L.cap.on ? Math.min(day.raw, L.cap.v) : day.raw;
    day.capped = L.cap.on && day.raw > L.cap.v;
  }
  if (L.days.on) {
    days
      .filter((d) => d.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(L.days.v)
      .forEach((d) => (d.counted = false));
  }
  const base = sum(days.filter((d) => d.counted).map((d) => d.total));
  let mult = 1;
  if (L.full.on) {
    const cd = days.filter((d) => d.cardio >= L.full.perDay).length;
    const hard = cfg.acts.find((a) => a.key === "hard");
    const hw = hard
      ? sum(days.map((d) => d.sessions.filter((s) => s.act === hard && s.pts > 0).length))
      : L.full.hard;
    if (cd >= L.full.days && hw >= L.full.hard) mult = L.full.bonus;
  }
  const photo = L.photo.on && L.photo.winners[String(w)] === pid ? L.photo.v : 0;
  return { w, days, base, mult, photo, total: base * mult + photo };
}

/* ── the standings ── */
export type WpPerson = { id: string; name: string; cls: string };
/** person id -> [null, week 1, week 2, …] up to this week */
export type Scores = Record<string, (WeekScore | null)[]>;

export function scoreAll(cfg: WinterPoints, people: string[], logs: Record<string, WpLog[]>, today: string): Scores {
  const cur = curWeek(cfg, today);
  const out: Scores = {};
  for (const pid of people) {
    const arr: (WeekScore | null)[] = [null];
    for (let w = 1; w <= cur; w++) arr.push(scoreWeek(cfg, pid, logs[pid] ?? [], w, today));
    out[pid] = arr;
  }
  return out;
}

export type WeekPick = number | "T";
const range = (a: number, b: number) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);

export const personWeek = (sc: Scores, pid: string, w: number) => sc[pid]?.[w]?.total ?? 0;
export const personValue = (sc: Scores, pid: string, wk: WeekPick, cur: number) =>
  wk === "T" ? sum(range(1, cur).map((w) => personWeek(sc, pid, w))) : personWeek(sc, pid, wk);

export const teamWeek = (cfg: WinterPoints, sc: Scores, t: WpTeam, w: number) =>
  sum(
    t.members
      .map((p) => personWeek(sc, p, w))
      .sort((a, b) => b - a)
      .slice(0, cfg.lim.top.v),
  );
export const teamValue = (cfg: WinterPoints, sc: Scores, t: WpTeam, wk: WeekPick, cur: number) =>
  wk === "T" ? sum(range(1, cur).map((w) => teamWeek(cfg, sc, t, w))) : teamWeek(cfg, sc, t, wk);

export const classWeek = (cfg: WinterPoints, sc: Scores, members: string[], w: number) => {
  const v = members.map((p) => personWeek(sc, p, w)).sort((a, b) => b - a);
  const keep = v.length > cfg.lim.classes.drop ? v.slice(0, v.length - cfg.lim.classes.drop) : v;
  return keep.length ? sum(keep) / keep.length : 0;
};
export const classValue = (cfg: WinterPoints, sc: Scores, members: string[], wk: WeekPick, cur: number) =>
  wk === "T" ? sum(range(1, cur).map((w) => classWeek(cfg, sc, members, w))) : classWeek(cfg, sc, members, wk);

export const teamOf = (cfg: WinterPoints, pid: string) => cfg.teams.find((t) => t.members.includes(pid));
/** Everyone on a team, once. */
export const eventPeople = (cfg: WinterPoints) => Array.from(new Set(cfg.teams.flatMap((t) => t.members)));

/* Class standing, from the rowing profile's team year. */
export const classOrder = ["Seniors", "Juniors", "Sophomores", "Freshmen", "Grads"];
export const classOfTeamYear = (teamYear: string) =>
  ({ Freshman: "Freshmen", Sophomore: "Sophomores", Junior: "Juniors", Senior: "Seniors", Grad: "Grads" })[
    teamYear
  ] ?? "";

/* ── words ── */
export const perWord = (p: WpPer) => (p === "min" ? "a minute" : p === "km" ? "a km" : "a session");
export const activityDetail = (a: WpActivity) => `${fmtNum(a.points)} ${perWord(a.per)}`;
export const activityRules = (a: WpActivity) => {
  const r: string[] = [];
  if (a.hr) r.push("Heart rate");
  if (a.most) r.push(`${a.most} a week`);
  if (a.short) r.push(`${a.short} min or more`);
  if (a.cday) r.push(`${a.cday} cardio that day`);
  return r.join(", ");
};

export type LimitKey = keyof WpLimits;
export const limitSpec: Record<LimitKey, { title: string; fields: [string, string][]; noSwitch?: boolean }> = {
  cap: { title: "Daily cap", fields: [["Points", "v"]] },
  days: { title: "Days a week", fields: [["Days", "v"]] },
  top: { title: "Team score", fields: [["Top", "v"]], noSwitch: true },
  cross: { title: "Cross-training", fields: [["Minutes a week", "v"]] },
  full: {
    title: "Full week",
    fields: [
      ["Bonus", "bonus"],
      ["Days", "days"],
      ["Points a day", "perDay"],
      ["Hard workouts", "hard"],
    ],
  },
  min: { title: "Minimum", fields: [["Points", "v"]] },
  photo: { title: "Photo of the week", fields: [["Points", "v"]] },
  classes: { title: "Classes", fields: [["Drop worst", "drop"]] },
};
export const limitKeys = Object.keys(limitSpec) as LimitKey[];
export function limitDetail(L: WpLimits, k: LimitKey): string {
  const x = L[k] as unknown as { on: boolean } & Record<string, number>;
  if (k !== "top" && !x.on) return "Off";
  switch (k) {
    case "cap":
    case "days":
    case "min":
    case "photo":
      return fmtPoints(x.v);
    case "top":
      return `Top ${x.v}`;
    case "cross":
      return `${fmtPoints(x.v)} min at 1:1`;
    case "full":
      return `×${fmtNum(x.bonus)}`;
    case "classes":
      return `Drop worst ${x.drop}`;
  }
}

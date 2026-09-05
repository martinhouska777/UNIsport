/*
  TEAM TRAINING CONFIG — the vocabulary a squad plans in.
  ---------------------------------------------------------------------------
  Everything that used to make the plan builder "Harvard rowing" lives here as
  EDITABLE DATA instead of constants in the code:

    types    — the session types (Water / Erg / Weights / Off / Flex, or Pool /
               Dryland / Lift, or Practice / Film …). Name, colour, whether the
               type asks for an intensity, whether it can carry a team board,
               and whether it needs a lineup.
    zones    — the intensity words (UT2 / UT1 / Hard, or Easy / Tempo / Race).
    library  — the "Most used · tap to fill" workouts, per type (and per zone
               for types that have zones). This is the coach's OWN list.
    times    — the usual start time for each period.

  Same idea as lib/themes.ts is for colour: adding another sport later = adding
  a PRESET below, not writing new screens (rule 7).

  BACKWARD COMPATIBILITY IS LOAD-BEARING. Sessions already in the database
  carry category 'water'|'erg'|… and intensity 'UT2'|'UT1'|'hard'. The rowing
  preset is therefore built FROM lib/varsity/coachPlan.ts rather than retyped,
  so its keys are exactly those, its colours can never drift from the ones the
  athlete screens still use, and a team that never opens Settings sees no
  change whatsoever.

  Colours here are per-entity CONTENT colours in a DATA file, applied via inline
  style — the documented exception to rule 1, never a hardcoded class.
*/
import {
  categories,
  categoryMeta,
  intensities,
  intensityMeta,
  presetTime,
  suggestionsFor,
  periods,
  type Category,
  type Intensity,
  type Period,
} from "./coachPlan";

/* ── The shape of a config ─────────────────────────────────────────────── */

export type SessionType = {
  key: string; // stable id, written into every session row — never re-key in place
  label: string;
  color: string;
  hasZones: boolean; // does this type ask for an intensity?
  canBoard: boolean; // may its results go to a shared squad board?
  needsLineup: boolean; // does it need a boat / lineup?
};

export type Zone = { key: string; label: string; color: string };

/*
  The workout library, keyed by type — or by "type:zone" for a type that has
  zones, because a steady outing and a race piece are not the same list.
*/
export type Library = Record<string, string[]>;

export type TrainingConfig = {
  preset: string; // which preset this started from (shown in Settings)
  types: SessionType[];
  zones: Zone[];
  library: Library;
  times: Record<Period, string>;
};

export const libraryKey = (typeKey: string, zoneKey?: string) =>
  zoneKey ? `${typeKey}:${zoneKey}` : typeKey;

/* ── Presets ───────────────────────────────────────────────────────────── */

/*
  ROWING — not typed out, DERIVED from the constants the app already ships, so
  the default team's plan is exactly what it was before Settings existed.
*/
function rowingPreset(): TrainingConfig {
  const types: SessionType[] = categories.map((c) => ({
    key: c,
    label: categoryMeta[c].label,
    color: categoryMeta[c].color,
    hasZones: categoryMeta[c].hasIntensity,
    // Erg only, and for a reason worth keeping: eight people share one boat's
    // split and the river moves it more than the crew does, so ranking a water
    // outing measures the stream. A coach may still change this.
    canBoard: c === "erg",
    needsLineup: c === "water",
  }));
  const zones: Zone[] = intensities.map((i) => ({
    key: i,
    label: intensityMeta[i].label,
    color: intensityMeta[i].color,
  }));
  const library: Library = {};
  for (const c of categories) {
    if (categoryMeta[c].hasIntensity) {
      for (const i of intensities) library[libraryKey(c, i)] = [...suggestionsFor(c, i)];
    } else {
      const own = suggestionsFor(c);
      if (own.length) library[c] = [...own];
    }
  }
  return { preset: "rowing", types, zones, library, times: { ...presetTime } };
}

/* The other sports are ordinary data entries. Each is a STARTING POINT a coach
   edits — nobody has to live with our words. */
const swimming: TrainingConfig = {
  preset: "swimming",
  types: [
    { key: "pool", label: "Pool", color: "#4a90a4", hasZones: true, canBoard: true, needsLineup: false },
    { key: "dryland", label: "Dryland", color: "var(--accent)", hasZones: false, canBoard: false, needsLineup: false },
    { key: "lift", label: "Lift", color: "#c084fc", hasZones: false, canBoard: false, needsLineup: false },
    { key: "off", label: "Off", color: "#166534", hasZones: false, canBoard: false, needsLineup: false },
    { key: "recovery", label: "Recovery", color: "var(--muted)", hasZones: false, canBoard: false, needsLineup: false },
  ],
  zones: [
    { key: "aerobic", label: "Aerobic", color: "var(--success)" },
    { key: "threshold", label: "Threshold", color: "#eab308" },
    { key: "race", label: "Race", color: "var(--danger)" },
  ],
  library: {
    "pool:aerobic": ["4×400 free", "3000m mixed", "10×200 @ 3:00", "1500m pull", "6×300 IM"],
    "pool:threshold": ["8×100 @ 1:20", "5×200 @ 2:40", "10×100 descend", "4×150 build"],
    "pool:race": ["8×50 all out", "4×100 race pace", "200 time trial", "Broken 200"],
    dryland: ["Core circuit", "Bands + shoulders", "Med-ball circuit"],
    recovery: ["30 mins easy", "45 mins easy"],
  },
  times: { AM: "6:00 AM", PM: "3:30 PM" },
};

const running: TrainingConfig = {
  preset: "running",
  types: [
    { key: "run", label: "Run", color: "#4a90a4", hasZones: true, canBoard: false, needsLineup: false },
    { key: "track", label: "Track", color: "#f59e0b", hasZones: true, canBoard: true, needsLineup: false },
    { key: "lift", label: "Lift", color: "#c084fc", hasZones: false, canBoard: false, needsLineup: false },
    { key: "off", label: "Off", color: "#166534", hasZones: false, canBoard: false, needsLineup: false },
    { key: "cross", label: "Cross", color: "var(--muted)", hasZones: false, canBoard: false, needsLineup: false },
  ],
  zones: [
    { key: "easy", label: "Easy", color: "var(--success)" },
    { key: "tempo", label: "Tempo", color: "#eab308" },
    { key: "intervals", label: "Intervals", color: "var(--danger)" },
  ],
  library: {
    "run:easy": ["40 mins easy", "60 mins easy", "8 miles steady", "Recovery shakeout"],
    "run:tempo": ["4 miles at tempo", "2×15' tempo", "20' threshold"],
    "run:intervals": ["6×800m", "10×400m", "5×1000m", "Hill repeats ×8"],
    "track:easy": ["Strides + drills"],
    "track:tempo": ["3×1 mile", "6×600m"],
    "track:intervals": ["12×400m", "3000m time trial", "8×200m"],
    cross: ["45 mins bike", "30 mins pool run"],
  },
  times: { AM: "6:30 AM", PM: "4:00 PM" },
};

/*
  TEAM SPORT — deliberately generic. Basketball, soccer, hockey and lacrosse all
  plan in practice / lift / film / off, and inventing sport-specific drill names
  we do not actually know would only give a coach a list to delete.
*/
const teamSport: TrainingConfig = {
  preset: "team",
  types: [
    { key: "practice", label: "Practice", color: "#4a90a4", hasZones: true, canBoard: false, needsLineup: false },
    { key: "lift", label: "Lift", color: "#c084fc", hasZones: false, canBoard: true, needsLineup: false },
    { key: "film", label: "Film", color: "var(--accent)", hasZones: false, canBoard: false, needsLineup: false },
    { key: "off", label: "Off", color: "#166534", hasZones: false, canBoard: false, needsLineup: false },
    { key: "recovery", label: "Recovery", color: "var(--muted)", hasZones: false, canBoard: false, needsLineup: false },
  ],
  zones: [
    { key: "skills", label: "Skills", color: "var(--success)" },
    { key: "team", label: "Team", color: "#eab308" },
    { key: "live", label: "Live", color: "var(--danger)" },
  ],
  library: {
    "practice:skills": ["Skill work + shooting", "Individual technique", "Small groups"],
    "practice:team": ["Team install", "Set pieces", "Half-court sets"],
    "practice:live": ["Full scrimmage", "Live 5v5", "Match simulation"],
    lift: ["Upper body", "Lower body", "Full body circuit"],
    recovery: ["Stretch + mobility", "Pool recovery"],
  },
  times: { AM: "7:00 AM", PM: "4:00 PM" },
};

/* A blank slate for a coach who would rather build their own from nothing. */
const blank: TrainingConfig = {
  preset: "blank",
  types: [
    { key: "session", label: "Session", color: "#4a90a4", hasZones: false, canBoard: false, needsLineup: false },
    { key: "off", label: "Off", color: "#166534", hasZones: false, canBoard: false, needsLineup: false },
  ],
  zones: [],
  library: {},
  times: { AM: "7:00 AM", PM: "4:30 PM" },
};

export type PresetEntry = { key: string; label: string; sub: string; build: () => TrainingConfig };

export const presets: PresetEntry[] = [
  { key: "rowing", label: "Rowing", sub: "Water · Erg · Weights, UT2 / UT1 / Hard", build: rowingPreset },
  { key: "swimming", label: "Swimming", sub: "Pool · Dryland · Lift", build: () => clone(swimming) },
  { key: "running", label: "Running", sub: "Run · Track · Lift", build: () => clone(running) },
  { key: "team", label: "Team sport", sub: "Practice · Lift · Film", build: () => clone(teamSport) },
  { key: "blank", label: "Start blank", sub: "Build every type yourself", build: () => clone(blank) },
];

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export const defaultConfig = (): TrainingConfig => rowingPreset();
export const presetLabel = (key: string) => presets.find((p) => p.key === key)?.label ?? key;

/* ── Lookups (always total — a config can never make a screen crash) ────── */

/*
  A session whose type was deleted from the config still has to render: it is a
  real session someone planned. Every lookup below therefore falls back rather
  than returning undefined, and an unknown key shows itself as the label so the
  coach can see exactly what is orphaned instead of a blank chip.
*/
export function findType(cfg: TrainingConfig, key: string | undefined): SessionType {
  const t = cfg.types.find((x) => x.key === key);
  if (t) return t;
  return {
    key: key ?? "",
    label: key ?? "—",
    color: "var(--muted)",
    hasZones: false,
    canBoard: false,
    needsLineup: false,
  };
}

export function findZone(cfg: TrainingConfig, key: string | undefined): Zone | undefined {
  if (!key) return undefined;
  return cfg.zones.find((z) => z.key === key) ?? { key, label: key, color: "var(--muted)" };
}

export function workoutsFor(cfg: TrainingConfig, typeKey?: string, zoneKey?: string): string[] {
  if (!typeKey) return [];
  const t = cfg.types.find((x) => x.key === typeKey);
  if (t?.hasZones && !zoneKey) return [];
  return cfg.library[libraryKey(typeKey, t?.hasZones ? zoneKey : undefined)] ?? [];
}

/* The colour + label a planned session shows: the zone wins when there is one,
   because that is the thing a coach reads off the page first. */
export function configSessionColor(cfg: TrainingConfig, typeKey: string, zoneKey?: string): string {
  const z = zoneKey ? findZone(cfg, zoneKey) : undefined;
  return z ? z.color : findType(cfg, typeKey).color;
}
export function configSessionLabel(cfg: TrainingConfig, typeKey: string, zoneKey?: string): string {
  const t = findType(cfg, typeKey).label;
  const z = zoneKey ? findZone(cfg, zoneKey) : undefined;
  return z ? `${t} · ${z.label}` : t;
}

/* Turn a coach's typed name into a key that is safe to store forever. */
export function keyFromLabel(label: string, taken: string[]): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || "type";
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export { periods };
export type { Period, Category, Intensity };

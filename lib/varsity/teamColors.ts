/*
  THE SQUAD'S OWN COLOURS, on every screen — not just the coach's Plan.
  ---------------------------------------------------------------------------
  A coach picks a colour for each training type and intensity in Training
  settings (lib/varsity/trainingConfig.ts). The coach's Plan always read those,
  but the athlete's Home week strip, Calendar, Log, Statistics and the team
  Workouts board painted from the colours the app shipped with — so a coach
  who made Erg purple saw purple and the squad kept seeing blue. The owner's
  decision (2026-09-18): the coach's colours are the WHOLE TEAM's colours.

  HOW: those screens read plain records (`kindColor` in home.ts,
  `logCategoryColor` in athleteProfile.ts, `logCategoryMeta` in coachPlan.ts)
  in dozens of places. Rather than thread the config through every one, this
  module rewrites those records IN PLACE from the squad's config — always from
  the shipped defaults first, so a type the coach deletes falls back instead
  of keeping a stale colour. `sessionColor` asks `teamZoneColor` /
  `teamTypeColor` directly.

  The shells (athlete + coach layouts) apply it through <TeamColors>, which
  also remembers the last colours per team in localStorage so a screen paints
  in the squad's colours from its very first frame.

  Race has no entry in a coach's settings, so it keeps its own colour.
*/
import type { SessionKind } from "./home";
import { kindColor, kindInk } from "./home";
import { logCategoryColor } from "./athleteProfile";
import { logCategoryMeta, type LogCategory } from "./coachPlan";
import type { TrainingConfig } from "./trainingConfig";

export type TeamColorMap = { types: Record<string, string>; zones: Record<string, string> };

/*
  The shipped values, captured the first time colours are applied — NOT at
  import: coachPlan.ts imports this module for sessionColor, so at load time
  the records below may not exist yet.
*/
let shipped: {
  kind: Record<SessionKind, string>;
  ink: Record<SessionKind, string>;
  logColor: Record<string, string>;
  logMeta: Record<LogCategory, string>;
} | null = null;

let active: TeamColorMap = { types: {}, zones: {} };

export function teamColorMap(cfg: TrainingConfig): TeamColorMap {
  return {
    types: Object.fromEntries(cfg.types.map((t) => [t.key, t.color])),
    zones: Object.fromEntries(cfg.zones.map((z) => [z.key, z.color])),
  };
}

export const teamTypeColor = (key: string | undefined): string | undefined =>
  key ? active.types[key] : undefined;
export const teamZoneColor = (key: string | undefined): string | undefined =>
  key ? active.zones[key] : undefined;

/*
  Which of the coach's settings each calendar colour follows. The kinds are the
  rowing words the athlete screens are built on; the keys are the ones the
  rowing preset stores (coachPlan.ts), so an untouched squad keeps its blocks.
  (Its calendar DOTS for weights / flex / off do move to the plan's hues —
  one session, one colour, which is the point.)
*/
const kindSource: Partial<Record<SessionKind, { zone?: string; type?: string }>> = {
  ut2: { zone: "UT2" },
  ut1: { zone: "UT1" },
  hard: { zone: "hard" },
  weights: { type: "weights" },
  flex: { type: "flex" },
  off: { type: "off" },
};

/*
  The text that sits ON a near-solid block has to answer to the colour the
  coach picked: near-black on a light hue, near-white on a dark one. A theme
  variable (var(--success) …) cannot be measured here; every one a coach can
  pick is a mid-to-light hue, so it keeps the dark ink.
*/
const INK_DARK = "#0b0e11";
const INK_LIGHT = "#eef1f3";
function inkFor(color: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return INK_DARK;
  const n = parseInt(m[1], 16);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return L > 0.18 ? INK_DARK : INK_LIGHT;
}

/** Point every colour record at this squad's colours (null = the shipped ones). */
export function applyTeamColors(map: TeamColorMap | null) {
  active = map ?? { types: {}, zones: {} };
  shipped ??= {
    kind: { ...kindColor },
    ink: { ...kindInk },
    logColor: { ...logCategoryColor },
    logMeta: Object.fromEntries(
      Object.entries(logCategoryMeta).map(([k, v]) => [k, v.color]),
    ) as Record<LogCategory, string>,
  };

  Object.assign(kindColor, shipped.kind);
  Object.assign(kindInk, shipped.ink);
  for (const [kind, src] of Object.entries(kindSource) as [SessionKind, { zone?: string; type?: string }][]) {
    const c = src.zone ? active.zones[src.zone] : src.type ? active.types[src.type] : undefined;
    // Only a colour the coach actually CHANGED gets its ink recomputed — the
    // shipped ones keep the ink that was chosen for them by eye.
    if (c && c.toLowerCase() !== shipped.kind[kind].toLowerCase()) {
      kindColor[kind] = c;
      kindInk[kind] = inkFor(c);
    }
  }

  Object.assign(logCategoryColor, shipped.logColor);
  for (const k of Object.keys(shipped.logMeta) as LogCategory[]) {
    const c = active.types[k];
    logCategoryMeta[k].color = c ?? shipped.logMeta[k];
    if (c) logCategoryColor[k] = c;
  }
}

/* ── The last colours seen per team, so a screen never paints the old ones first ── */
const cacheKey = (teamId: string) => `varsityTeamColors:${teamId}`;

export function readCachedTeamColors(teamId: string): TeamColorMap | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(cacheKey(teamId));
    return raw ? (JSON.parse(raw) as TeamColorMap) : null;
  } catch {
    return null;
  }
}

export function cacheTeamColors(teamId: string, map: TeamColorMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(cacheKey(teamId), JSON.stringify(map));
  } catch {
    /* blocked storage only costs one frame of the old colours */
  }
}

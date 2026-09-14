/*
  FROM DIALS TO TOKENS (app/lab — dev only).

  Takes a LabState and produces (a) the CSS the lab injects into the framed
  landing and (b) the `@theme static` block the owner pastes back, so a chosen
  look lands in app/globals.css as a copy, not a translation.

  The neutrals are built in oklch — the same maths the app's Colour Lab used —
  so "one step lighter" means the same thing on a black page and a white one:
  the page's lightness comes from `light`; elevated / surface / line / hover
  step AWAY from the page toward the text side; text-2 / text-3 sit between
  the text and the page. Above 60% lightness the text flips dark.
*/

import type { LabState } from "@/lib/lab/state";
import { labFont, labFontHref, labFontStack } from "@/lib/lab/fonts";

// ——— colour maths ———

function oklchToRgb(L: number, C: number, H: number): [number, number, number] {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const gam = (x: number) => {
    x = Math.min(1, Math.max(0, x));
    return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  };
  return [gam(r), gam(g), gam(bb)].map((x) => Math.round(x * 255)) as [number, number, number];
}

function hex(rgb: [number, number, number]): string {
  return "#" + rgb.map((x) => x.toString(16).padStart(2, "0")).join("");
}

function oklchHex(L: number, C: number, H: number): string {
  return hex(oklchToRgb(Math.min(0.995, Math.max(0.03, L)), C, H));
}

function hexToRgb(h: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(h.trim());
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Part-way between two hexes in sRGB — for the elevated step when the surface is its own colour. */
function mixHex(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return hex(A.map((x, i) => Math.round(x + (B[i] - x) * t)) as [number, number, number]);
}

function rgba(h: string, a: number): string {
  const [r, g, b] = hexToRgb(h);
  return `rgba(${r}, ${g}, ${b}, ${+a.toFixed(3)})`;
}

// ——— tokens ———

export type LabTokens = Record<string, string>;

export function deriveTokens(s: LabState): { tokens: LabTokens; isLight: boolean } {
  // 0.128 + 2% of the range is oklch L 0.145 — exactly #0a0a0a, today's page.
  const Lbg = 0.128 + (s.light / 100) * 0.865;
  const isLight = Lbg >= 0.6;
  const C = (s.tint / 100) * 0.04;
  const H = s.hue;
  const dir = isLight ? -1 : 1;
  const unit = 0.006 + (s.step / 100) * 0.05;

  const Ltext = isLight ? 0.2 : 0.97;
  const Ctext = C * 0.5;
  const t2 = 0.25 + ((100 - s.textc) / 100) * 0.35;
  const t3 = Math.min(0.9, t2 + 0.23);
  const mixL = (t: number) => Ltext + (Lbg - Ltext) * t;
  const mixC = (t: number) => Ctext + (C - Ctext) * t;

  const bg = oklchHex(Lbg, C, H);
  const text = oklchHex(Ltext, Ctext, H);
  const textRgb = hexToRgb(text);
  const gridBase = isLight ? 0.06 : 0.015;

  // The blocks' colour: derived by `step`, or the pair's own hex — then the
  // pills and feature rows sit half-way between the page and the blocks.
  const ownSurface = /^#[0-9a-f]{6}$/i.test(s.surface) ? s.surface : null;
  const surface = ownSurface ?? oklchHex(Lbg + dir * unit * 1.5, C, H);
  const elevated = ownSurface ? mixHex(bg, ownSurface, 0.5) : oklchHex(Lbg + dir * unit, C, H);

  const tokens: LabTokens = {
    "--color-l-bg": bg,
    "--color-l-bg-elevated": elevated,
    "--color-l-surface": surface,
    "--color-l-line": oklchHex(Lbg + dir * unit * 3, C, H),
    "--color-l-line-hover": oklchHex(Lbg + dir * unit * 4.7, C, H),
    "--color-l-text": text,
    "--color-l-text-2": oklchHex(mixL(t2), mixC(t2), H),
    "--color-l-text-3": oklchHex(mixL(t3), mixC(t3), H),
    "--color-l-accent": s.accent,
    "--color-l-accent-dim": rgba(s.accent, 0.1),
    "--color-l-accent-soft": rgba(s.accent, 0.2),
    "--color-l-varsity": s.varsity,
    "--color-l-varsity-dim": rgba(s.varsity, 0.08),
    "--color-l-varsity-soft": rgba(s.varsity, 0.2),
    "--color-l-bg-warm": oklchHex(Lbg + dir * 0.012, Math.max(C, 0.008), 75),
    "--color-l-grid": `rgba(${textRgb.join(", ")}, ${+(gridBase * s.grid).toFixed(4)})`,
    "--color-l-grid-2": `rgba(${textRgb.join(", ")}, ${+(gridBase * 1.33 * s.grid).toFixed(4)})`,
  };
  return { tokens, isLight };
}

// ——— the CSS the lab injects ———

const RADIUS_PX: Record<string, string | null> = { pill: null, "12": "12px", "6": "6px", "0": "0px" };

export function deriveCss(s: LabState): string {
  const { tokens } = deriveTokens(s);
  const vars = Object.entries(tokens)
    .map(([k, v]) => `  ${k}: ${v} !important;`)
    .join("\n");

  const display = labFont(s.display);
  const body = labFont(s.body);
  const kicker = s.kicker === "body" ? body : labFont(s.kicker);
  const radius = RADIUS_PX[s.radius];

  return [
    `:root {\n${vars}\n  --l-glow: ${s.glow};\n}`,
    // the body face: .font-sans sits on the landing's root, everything inherits
    `.font-sans { font-family: ${labFontStack(body)} !important; }`,
    // the headlines
    `.font-display { font-family: ${labFontStack(display)} !important; font-weight: ${s.dweight} !important; letter-spacing: ${(s.dtrack / 1000).toFixed(3)}em !important;${s.dupper ? " text-transform: uppercase !important;" : ""} }`,
    s.ditalic ? "" : `.font-display em, .font-display .italic { font-style: normal !important; }`,
    // the kickers and the scroll cue
    `.font-mono, .l-cue { font-family: ${labFontStack(kicker)} !important; }`,
    s.kupper ? "" : `.font-mono, .l-cue, .uppercase { text-transform: none !important; letter-spacing: 0.01em !important; }`,
    // buttons and pills — the dots stay round
    radius ? `.rounded-full:where(a, button, [role="button"], .inline-flex) { border-radius: ${radius} !important; }` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** The Google Fonts links the framed page needs for this state. */
export function deriveFontLinks(s: LabState): string[] {
  const ids = [s.display, s.body, s.kicker === "body" ? s.body : s.kicker];
  const hrefs = ids.map((id) => labFontHref(labFont(id))).filter((h): h is string => !!h);
  return Array.from(new Set(hrefs));
}

/** What the owner pastes back: the token block for app/globals.css plus the type choices in words. */
export function deriveHandover(s: LabState): string {
  const { tokens, isLight } = deriveTokens(s);
  const lines = Object.entries(tokens)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
  const display = labFont(s.display);
  const body = labFont(s.body);
  const kicker = s.kicker === "body" ? body : labFont(s.kicker);
  return [
    `/* landing tokens — ${isLight ? "light" : "dark"} page */`,
    `@theme static {`,
    lines,
    `}`,
    ``,
    `/* type */`,
    `display: ${display.name} · weight ${s.dweight} · tracking ${(s.dtrack / 1000).toFixed(3)}em${s.ditalic ? " · italic emphasis" : " · no italic"}${s.dupper ? " · UPPERCASE" : ""}`,
    `body:    ${body.name}`,
    `kickers: ${kicker.name}${s.kupper ? " · UPPERCASE" : " · sentence case"}`,
    `shape:   ${s.radius === "pill" ? "pills" : `${s.radius}px corners`} · grid ×${s.grid} · glow ×${s.glow}`,
  ].join("\n");
}

/*
  THE EIGHT SCHOOLS the landing's two closers cycle through — Campus Colours
  (the student closer) and Blade Lock (the varsity closer).

  This is CONTENT, not page chrome. Rule 1's exception applies: a school's
  identity colours live here in data and are applied inline, never written
  inside a component. Rule 2 still holds — the page's own design stays neutral;
  what changes colour is the picture of a themed app, which is the whole point
  of the piece. Adding a school = adding an entry here (and its two recolored
  screens under public/landing/closers/).

  The values come from the two Claude Design pieces the closers were ported
  from, reconciled where they disagreed:
    • `color` is the school colour proper — the blade, the glow, the recolor
      target used by scripts/landing/recolor-shots.mjs.
    • `ink` is the legible version of it for type and UI on the dark ground
      (Princeton's orange and Columbia's light blue darken; Brown's dark brown
      lightens — the campus piece drew Brown's letter in #4e3629, which
      vanishes on #0a0a0a, so the blade piece's #6b4423 is used for type).
  The blade art is the design's own drawing of each crew's blade, in a
  980×160 SVG viewBox clipped to the blade shape.
*/

/* The crest drawings moved to lib/crests.ts — BOTH zones wear them now, so
   they are not landing data any more. Look a school's crest up by `key`. */

/** One mark painted on the blade, over its base colour. */
export type BladeMark =
  | { kind: "polygon"; points: string; fill: string }
  | { kind: "path"; d: string; fill: string }
  | { kind: "rect"; x: number; y: number; w: number; h: number; fill: string }
  | { kind: "circle"; cx: number; cy: number; r: number; fill: string };

export type School = {
  /** File key — public/landing/closers/{gyms|vhome}-{key}.webp */
  key: string;
  name: string;
  /** The big letter in the campus closer. */
  letter: string;
  /** School colour proper. */
  color: string;
  /** Legible-on-dark version for type and UI accents. */
  ink: string;
  /** The blade: base coat, then marks on top. */
  blade: { base: string; marks: BladeMark[] };
};

/** The blade shape shared by every oar (in the 980×160 viewBox). */
export const BLADE_PATH =
  "M522 72 L690 57 Q700 56 700 66 L700 128 Q700 137 690 137 C640 136 570 112 522 90 Z";

/** The blade piece's off-white for the light-based blades. */
const BLADE_WHITE = "#f5f3ef";

/** The oar itself, as the blade piece drew it — handle, shaft, collar, the
    hairlines on them, the blade's outline, and the shade that dims a blade as
    it turns away. Illustration colours, applied inline. */
export const OAR_ART = {
  handle: "#161618",
  shaft: "#1d1d20",
  collar: "#0c0c0e",
  line: "#3a3a3e",
  outline: "#45454a",
  shade: "#060607",
};

/* HOW FAST THE SCHOOLS CHANGE. Two paces, on purpose.

   Campus Colours keeps the design piece's own 2.6s: down there the cycle IS
   the exhibit, the reader has stopped, and the section does nothing else.

   The intro is slower. It is the front door, it is trying to be read, and at
   the closer's pace the owner's verdict was "a disco ball on the hero"
   (2026-08-23). It is also long enough to notice which letter under the
   phone is lit before it moves on — 4.7s, the owner's number. */
export const SCHOOL_CYCLE_MS = 2600;
export const HERO_CYCLE_MS = 4700;

export const schools: School[] = [
  {
    key: "harvard",
    name: "Harvard",
    letter: "H",
    color: "#a51c30",
    ink: "#a51c30",
    blade: {
      base: "#a51c30",
      marks: [
        { kind: "polygon", points: "636,48 704,48 704,94", fill: BLADE_WHITE },
        { kind: "polygon", points: "636,145 704,145 704,100", fill: BLADE_WHITE },
      ],
    },
  },
  {
    key: "yale",
    name: "Yale",
    letter: "Y",
    color: "#00356b",
    ink: "#00356b",
    blade: {
      // Split down the blade's own axis (neck 522,81 → tip 700,97), blue below:
      // half and half, not a sliver hugging the bottom edge.
      base: BLADE_WHITE,
      marks: [{ kind: "path", d: "M520 81 L704 98 L704 144 L520 144 Z", fill: "#00356b" }],
    },
  },
  {
    key: "princeton",
    name: "Princeton",
    letter: "P",
    color: "#e77500",
    ink: "#c96500",
    blade: {
      base: "#e77500",
      marks: [{ kind: "polygon", points: "522,44 700,44 522,144", fill: "#1a1a1a" }],
    },
  },
  {
    key: "penn",
    name: "Penn",
    letter: "P",
    color: "#011f5b",
    ink: "#011f5b",
    blade: {
      base: "#011f5b",
      marks: [{ kind: "polygon", points: "700,54 700,140 600,97", fill: "#c50f1f" }],
    },
  },
  {
    key: "brown",
    name: "Brown",
    letter: "B",
    color: "#4e3629",
    ink: "#6b4423",
    blade: {
      base: BLADE_WHITE,
      marks: [{ kind: "rect", x: 518, y: 44, w: 188, h: 42, fill: "#6b4423" }],
    },
  },
  {
    key: "columbia",
    name: "Columbia",
    letter: "C",
    color: "#6cace4",
    ink: "#1d64ab",
    blade: {
      base: BLADE_WHITE,
      marks: [{ kind: "polygon", points: "522,44 700,44 700,74 522,132", fill: "#6cace4" }],
    },
  },
  {
    key: "cornell",
    name: "Cornell",
    letter: "C",
    color: "#b31b1b",
    ink: "#b31b1b",
    blade: {
      // Carnelian across the tip. Its inner edge is TWO ARCS meeting at a single
      // point: each one leaves an edge of the blade half way down (x 613) and
      // sweeps in to the cusp a quarter back from the tip (x 656) — so the white
      // runs out to a spike and the red hangs back in two lobes. The arcs bow
      // towards the NECK, which is what makes the point sharp instead of a bulb;
      // bowed the other way it reads as a round bite, which is the wrong blade.
      base: BLADE_WHITE,
      marks: [
        {
          kind: "path",
          d: "M613 40 L613 63.9 Q621.1 97.9 656 97 Q623 91.5 613 123.5 L613 152 L710 152 L710 40 Z",
          fill: "#b31b1b",
        },
      ],
    },
  },
  {
    key: "dartmouth",
    name: "Dartmouth",
    letter: "D",
    color: "#00693e",
    ink: "#00693e",
    blade: {
      // Forest green with one white triangle off the tip edge, running back along
      // the blade's lower side. It is a WEDGE, not a half: the apex sits on the
      // bottom edge a third back from the tip (646.5,131.8), so green keeps the
      // whole body of the blade. The other two corners are past the outline on
      // purpose — the clip lands the edges exactly on it.
      base: "#00693e",
      marks: [{ kind: "polygon", points: "704,40 704,148 646.5,131.8", fill: BLADE_WHITE }],
    },
  },
];

/** `#rrggbb` → `rgba(r,g,b,a)` for the glows and washes built from a school colour. */
/*
  A SCHOOL'S COLOUR, RAISED TO A USABLE LIGHTNESS.

  Several of these are near-black — Yale #00356b, Penn #011f5b, Brown #4e3629.
  A halo in one of them on a #0a0a0a page is not a halo but a slightly less
  black patch, and a word set in one is unreadable. So the hue and the
  saturation are kept exactly and only the LIGHTNESS is raised to a floor,
  which gives all eight the same presence without turning any of them into a
  different colour. Anything already above the floor (Columbia's pale blue)
  comes back untouched.

  It also DESATURATES as it lightens, which sounds like a detail and is not:
  raising a fully saturated dark colour to a mid lightness at full saturation
  turns Dartmouth's forest green into neon mint and Brown's brown into tan. The
  schools have to still look like themselves.

  Two floors are in use: ~0.44 for the glow behind the intro's phones, and
  accent() below for anything that has to be READ.

  Presentational only: the school's own `color` and `ink` are what the closers
  use for type and UI, and neither is changed.
*/
export function lift(hex: string, floor = 0.44, desat = 0.9): string {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255,
    g = ((n >> 8) & 255) / 255,
    b = (n & 255) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (l >= floor) return hex;
  const d = max - min;
  let sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  sat *= 1 - (floor - l) * desat; // the further it is lifted, the less neon
  // back to rgb at the raised lightness
  const c = (1 - Math.abs(2 * floor - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = floor - c / 2;
  const [r1, g1, b1] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const hex2 = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${hex2(r1)}${hex2(g1)}${hex2(b1)}`;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
}
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
/* The page's two inks, the only two colours a label here is ever set in. */
const INK = { "l-bg": 0.0056, "l-text": 0.9067 } as const; // luminance of #0a0a0a / #f5f5f5

/*
  THE SCHOOL'S COLOUR AS AN ACCENT — what the intro paints the wordmark's
  second half, "Your people" and the button with while that school is showing.

  Two jobs. It has to be readable as type on the near-black page (the display
  sizes need 3:1), and the BUTTON's label has to clear 4.5:1 against it — the
  contrast promise this page already made for the blue it replaces. So: lift to
  a floor that keeps every school recognisably itself, pick whichever ink reads
  better on the result, and if that still falls short, walk the lightness away
  from the middle until it does. Yale and Brown are the two that need the walk.

  `ink` is a TOKEN name, never a colour, so nothing is written into a
  component (rule 1).
*/
export function accent(hex: string): { color: string; ink: "l-bg" | "l-text" } {
  let floor = 0.46;
  for (let step = 0; step < 8; step++) {
    const color = lift(hex, floor);
    const lum = luminance(color);
    const dark = contrast(lum, INK["l-bg"]);
    const light = contrast(lum, INK["l-text"]);
    const ink = dark >= light ? "l-bg" : "l-text";
    if (Math.max(dark, light) >= 4.5) return { color, ink };
    // Move AWAY from the middle, in the direction the better ink wants.
    floor += ink === "l-bg" ? 0.03 : -0.03;
  }
  return { color: lift(hex, 0.46), ink: "l-text" };
}

export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

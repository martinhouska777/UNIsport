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
      base: BLADE_WHITE,
      marks: [{ kind: "path", d: "M522 80 C575 102 640 119 700 121 L700 142 L522 142 Z", fill: "#00356b" }],
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
      base: BLADE_WHITE,
      marks: [
        { kind: "circle", cx: 701, cy: 75, r: 24, fill: "#e21833" },
        { kind: "circle", cx: 701, cy: 120, r: 24, fill: "#e21833" },
      ],
    },
  },
  {
    key: "dartmouth",
    name: "Dartmouth",
    letter: "D",
    color: "#00693e",
    ink: "#00693e",
    blade: { base: "#00693e", marks: [] },
  },
];

/** `#rrggbb` → `rgba(r,g,b,a)` for the glows and washes built from a school colour. */
export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

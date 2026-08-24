/*
  THE UNIVERSITY CRESTS — one drawing, eight schools, shared by BOTH zones.

  This is the compact cut from the "Campus Crests" design piece (2026-08-24),
  the owner's pick: built to survive 16–32px, so nothing is thinner than 4
  units and the motif is a single shape or dropped. Per school only the motif,
  the letter and the letter's seat change; the shield and its construction are
  one family. Rendered by components/SchoolCrest.tsx.

  The drawing is OURS — a generic heater shield and original motifs — so no
  university's actual arms enter the repo. It is drawn ONLY in
  var(--crest-field) (the shield) and var(--crest-mark) (border, motif,
  letter); whoever renders it sets that pair (rule 1):
    • the landing's button sets it from the school's accent pair, inverted;
    • the app sets it from the THEME (--primary / --primary-contrast), so the
      same crest re-skins with the university like everything else in Zone 2.
*/

export type CrestSpec = {
  /** The school's letter — the crest's largest element. */
  letter: string;
  /** The motif path, clipped to the inner shield. Empty = letter only. */
  motif: string;
  /** The letter's font-size in viewBox units. */
  fontSize: number;
  /**
   * The letter's baseline, in viewBox units. NOT eyeballed: each one seats the
   * letter's INK (its cap box, measured in Playfair 900 — not the em box, which
   * carries empty ascent) in the middle of the room the letter actually has:
   *   • no motif  → the middle of the inner shield's area (y ≈ 53). The shield
   *     tapers to a point, so its area sits HIGH — centring on the box middle
   *     (y = 58) is what made the letter look like it had slipped down.
   *   • motif      → the middle of what the motif leaves over, and then pulled
   *     back up until the letter's bottom corners are still inside the border
   *     (the shield is narrow down there, so the free area alone lies too low).
   */
  letterY: number;
};

/** The heater shield every crest shares, in the 100×116 viewBox. */
export const CREST_SHIELD_PATH = "M8 6 H92 V50 C92 82 76 102 50 110 C24 102 8 82 8 50 Z";

/*
  Two schools share "P" and two share "C" — for those four the motif stays
  even in the compact cut, because it is what tells them apart. The other
  four are letter-only, which is what compact means.
*/
export const crests: Record<string, CrestSpec> = {
  harvard: { letter: "H", motif: "", fontSize: 64, letterY: 76 },
  yale: { letter: "Y", motif: "", fontSize: 74, letterY: 80 },
  princeton: {
    letter: "P",
    motif: "M13 15 H87 V22 H13 Z M13 28 H87 V35 H13 Z",
    fontSize: 66,
    letterY: 86,
  },
  penn: { letter: "P", motif: "", fontSize: 74, letterY: 80 },
  brown: { letter: "B", motif: "", fontSize: 72, letterY: 79 },
  columbia: {
    // the skyline along the base, and the letter seated higher to clear it
    letter: "C",
    motif: "M18 102 V84 H36 V73 H50 V80 H64 V86 H80 V102 Z",
    fontSize: 64,
    letterY: 63,
  },
  cornell: { letter: "C", motif: "M43 30 V19 L50 13 L57 19 V30 Z", fontSize: 62, letterY: 85 },
  dartmouth: { letter: "D", motif: "M50 14 L65 32 H35 Z", fontSize: 60, letterY: 84 },
};

export function crestFor(key: string): CrestSpec {
  return crests[key] ?? crests.harvard;
}

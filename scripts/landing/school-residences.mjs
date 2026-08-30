// The people on the intro's Match screen — where they live, and the gym they
// train at — for every school.
//
// recolor-shots.mjs turns the Harvard Match screen into each school's colours,
// but the four cards still said Mather / Eliot / Leverett / Pforzheimer and
// "Hemenway Gymnasium", so Yale's phone showed Payne Whitney on the left
// (patched by patch-gyms.mjs) and a Harvard house on the right. patch-match.mjs
// writes these names in their place.
//
// NOT invented: every name below is copied from that school's own entry in
// `lib/gyms.ts` — the residences are its house/college/dorm gyms, the `gym` is
// one of its three main facilities. The marketing shot and the app therefore
// name the same buildings. (Plain Node cannot import a `.ts`, which is why this
// is a copy — same reason school-gyms.mjs exists. If lib/gyms.ts changes, change
// this too.)
//
// `gym` is deliberately a SHORT name: it is drawn inside a pill on a half-width
// card, and patch-match.mjs warns if one runs past the card's edge.
export const SCHOOL_PEOPLE = [
  // Harvard is the real capture and is left alone; its row is here so --calib
  // can render the original text back over it and prove the geometry.
  { key: "harvard", n: "Harvard",
    residences: ["Mather", "Eliot", "Leverett", "Pforzheimer"],
    gym: "Hemenway Gymnasium" },
  { key: "yale", n: "Yale",
    residences: ["Branford", "Saybrook", "Berkeley", "Silliman"],
    gym: "Israel Fitness Center" },
  { key: "princeton", n: "Princeton",
    residences: ["Whitman", "Rockefeller", "Mathey", "Butler"],
    gym: "Jadwin Gymnasium" },
  { key: "penn", n: "Penn",
    residences: ["Harnwell", "Rodin", "Ware", "Riepe"],
    gym: "Fox Fitness Center" },
  { key: "brown", n: "Brown",
    residences: ["Keeney Quad", "Wriston Quad", "Andrews", "Perkins"],
    gym: "Nelson Fitness Center" },
  { key: "columbia", n: "Columbia",
    residences: ["John Jay", "Carman", "Furnald", "Hartley"],
    gym: "Levien Gymnasium" },
  { key: "cornell", n: "Cornell",
    residences: ["Alice Cook", "Flora Rose", "Hans Bethe", "Clara Dickson"],
    gym: "Teagle Hall" },
  { key: "dartmouth", n: "Dartmouth",
    residences: ["Allen", "East Wheelock", "North Park", "South"],
    gym: "Berry Sports Center" },
];

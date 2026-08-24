/*
  GYM DATA (placeholder/fake for now).
  This is DATA. Later it comes from the database.

  Note on colors: the white-label THEME (background, crimson primary, gold accent,
  text, etc.) still drives the whole app. The only colors stored here are each
  house's two IDENTITY colors (`houseColors`) — these are per-gym content data,
  like a logo, not theme chrome. They are applied via inline styles, never as
  hardcoded colors inside a component.
*/

export type GymKind = "main" | "house";

export type GalleryIcon = "barbell" | "run" | "swimming" | "basketball";
export type GalleryItem = { label: string; icon: GalleryIcon };

export type StatRow = { label: string; value: string };
export type EquipmentSection = { title: string; rows: StatRow[] };
export type RatingBar = { label: string; value: number }; // out of 5

export type HouseColors = { primary: string; secondary: string };

export type Gym = {
  slug: string;
  name: string;
  kind: GymKind;
  address: string;
  hours: string;
  rating: number;
  ratingCount: number;
  floors: number;
  houseColors?: HouseColors; // only for house gyms
  gallery: GalleryItem[];
  equipment: EquipmentSection[];
  ratings: RatingBar[];
};

const clamp5 = (n: number) => Math.max(0, Math.min(5, Math.round(n * 10) / 10));

// Generates a standard house-gym record; only the distinctive bits are passed in.
function houseGym(opts: {
  slug: string;
  name: string;
  address: string;
  rating: number;
  ratingCount: number;
  colors: HouseColors;
}): Gym {
  const { rating } = opts;
  return {
    slug: opts.slug,
    name: opts.name,
    kind: "house",
    address: opts.address,
    hours: "7am–12am",
    rating,
    ratingCount: opts.ratingCount,
    floors: 1,
    houseColors: opts.colors,
    gallery: [
      { label: "Weight Room", icon: "barbell" },
      { label: "Cardio Corner", icon: "run" },
    ],
    equipment: [
      {
        title: "Free Weights",
        rows: [
          { label: "Dumbbells", value: "5 – 90 lb" },
          { label: "Barbells", value: "Olympic" },
        ],
      },
      {
        title: "Racks & Platforms",
        rows: [
          { label: "Squat racks", value: "1" },
          { label: "Bench press stations", value: "1" },
        ],
      },
      {
        title: "Cardio",
        rows: [
          { label: "Treadmills", value: "3" },
          { label: "Stationary bikes", value: "2" },
        ],
      },
      {
        title: "Other Facilities",
        rows: [{ label: "Weight rooms", value: "1" }],
      },
    ],
    ratings: [
      { label: "Equipment", value: clamp5(rating - 0.2) },
      { label: "Cleanliness", value: clamp5(rating + 0.1) },
      { label: "Atmosphere", value: clamp5(rating) },
    ],
  };
}

/*
  Generates a MAIN-gym record from a size class plus the gym's own signature
  facilities. Harvard's three below predate this helper and stay hand-written;
  every other school's mains come from here, so a campus is a dozen lines of
  facts rather than three hundred of boilerplate. Numbers per class follow the
  Harvard three: flagship ≈ Malkin, large ≈ Murr, standard ≈ Hemenway.
*/
function mainGym(opts: {
  slug: string;
  name: string;
  address: string;
  hours: string;
  rating: number;
  ratingCount: number;
  floors: number;
  size: "flagship" | "large" | "standard";
  /** The gym's signature facilities, appended to "Other Facilities". */
  extras?: StatRow[];
  gallery?: GalleryItem[];
}): Gym {
  const spec = {
    flagship: {
      dumbbells: "5 – 150 lb", barbells: "Olympic + EZ bar", kettlebells: "8 – 48 kg",
      racks: "6", benches: "4", platforms: "2", cables: "8",
      treadmills: "24", bikes: "18", ergs: "10", ellipticals: "12", weightRooms: "3",
    },
    large: {
      dumbbells: "5 – 120 lb", barbells: "Olympic", kettlebells: "8 – 40 kg",
      racks: "4", benches: "3", platforms: "", cables: "5",
      treadmills: "16", bikes: "12", ergs: "8", ellipticals: "", weightRooms: "2",
    },
    standard: {
      dumbbells: "5 – 110 lb", barbells: "Olympic", kettlebells: "8 – 32 kg",
      racks: "3", benches: "3", platforms: "", cables: "4",
      treadmills: "14", bikes: "10", ergs: "6", ellipticals: "8", weightRooms: "2",
    },
  }[opts.size];
  const row = (label: string, value: string): StatRow[] => (value ? [{ label, value }] : []);
  const { rating } = opts;
  return {
    slug: opts.slug,
    name: opts.name,
    kind: "main",
    address: opts.address,
    hours: opts.hours,
    rating,
    ratingCount: opts.ratingCount,
    floors: opts.floors,
    gallery: opts.gallery ?? [
      { label: "Main Floor", icon: "barbell" },
      { label: "Cardio Room", icon: "run" },
    ],
    equipment: [
      {
        title: "Free Weights",
        rows: [
          { label: "Dumbbells", value: spec.dumbbells },
          { label: "Barbells", value: spec.barbells },
          { label: "Kettlebells", value: spec.kettlebells },
        ],
      },
      {
        title: "Racks & Platforms",
        rows: [
          ...row("Squat racks", spec.racks),
          ...row("Bench press stations", spec.benches),
          ...row("Deadlift platforms", spec.platforms),
          ...row("Cable machines", spec.cables),
        ],
      },
      {
        title: "Cardio",
        rows: [
          ...row("Treadmills", spec.treadmills),
          ...row("Stationary bikes", spec.bikes),
          ...row("Rowing machines", spec.ergs),
          ...row("Ellipticals", spec.ellipticals),
        ],
      },
      {
        title: "Other Facilities",
        rows: [...(opts.extras ?? []), { label: "Weight rooms", value: spec.weightRooms }],
      },
    ],
    ratings: [
      { label: "Equipment", value: clamp5(rating - 0.2) },
      { label: "Cleanliness", value: clamp5(rating + 0.1) },
      { label: "Atmosphere", value: clamp5(rating - 0.1) },
    ],
  };
}

const mainGyms: Gym[] = [
  {
    slug: "malkin",
    name: "Malkin Athletic Center",
    kind: "main",
    address: "39 Holyoke Street",
    hours: "6am–11pm",
    rating: 4.8,
    ratingCount: 142,
    floors: 3,
    gallery: [
      { label: "Main Floor", icon: "barbell" },
      { label: "Cardio Room", icon: "run" },
      { label: "Pool", icon: "swimming" },
      { label: "Courts", icon: "basketball" },
    ],
    equipment: [
      {
        title: "Free Weights",
        rows: [
          { label: "Dumbbells", value: "5 – 150 lb" },
          { label: "Barbells", value: "Olympic + EZ bar" },
          { label: "Kettlebells", value: "8 – 48 kg" },
        ],
      },
      {
        title: "Racks & Platforms",
        rows: [
          { label: "Squat racks", value: "6" },
          { label: "Bench press stations", value: "4" },
          { label: "Deadlift platforms", value: "2" },
          { label: "Cable machines", value: "8" },
        ],
      },
      {
        title: "Cardio",
        rows: [
          { label: "Treadmills", value: "24" },
          { label: "Stationary bikes", value: "18" },
          { label: "Rowing machines", value: "10" },
          { label: "Ellipticals", value: "12" },
        ],
      },
      {
        title: "Other Facilities",
        rows: [
          { label: "Swimming pool", value: "25 yard" },
          { label: "Basketball courts", value: "3 full-size" },
          { label: "Group fitness studio", value: "Yes" },
          { label: "Weight rooms", value: "3" },
        ],
      },
    ],
    ratings: [
      { label: "Equipment", value: 4.6 },
      { label: "Cleanliness", value: 4.8 },
      { label: "Atmosphere", value: 4.4 },
    ],
  },
  {
    slug: "murr",
    name: "Murr Center",
    kind: "main",
    address: "65 N Harvard St",
    hours: "6am–10pm",
    rating: 4.6,
    ratingCount: 98,
    floors: 2,
    gallery: [
      { label: "Strength Floor", icon: "barbell" },
      { label: "Cardio Deck", icon: "run" },
      { label: "Courts", icon: "basketball" },
    ],
    equipment: [
      {
        title: "Free Weights",
        rows: [
          { label: "Dumbbells", value: "5 – 120 lb" },
          { label: "Barbells", value: "Olympic" },
          { label: "Kettlebells", value: "8 – 40 kg" },
        ],
      },
      {
        title: "Racks & Platforms",
        rows: [
          { label: "Squat racks", value: "4" },
          { label: "Bench press stations", value: "3" },
          { label: "Cable machines", value: "5" },
        ],
      },
      {
        title: "Cardio",
        rows: [
          { label: "Treadmills", value: "16" },
          { label: "Stationary bikes", value: "12" },
          { label: "Rowing machines", value: "8" },
        ],
      },
      {
        title: "Other Facilities",
        rows: [
          { label: "Basketball courts", value: "2 full-size" },
          { label: "Squash courts", value: "6" },
          { label: "Weight rooms", value: "2" },
        ],
      },
    ],
    ratings: [
      { label: "Equipment", value: 4.5 },
      { label: "Cleanliness", value: 4.6 },
      { label: "Atmosphere", value: 4.5 },
    ],
  },
  {
    slug: "hemenway",
    name: "Hemenway Gymnasium",
    kind: "main",
    address: "7 Divinity Avenue",
    hours: "6am–10pm",
    rating: 4.4,
    ratingCount: 76,
    floors: 2,
    gallery: [
      { label: "Strength Floor", icon: "barbell" },
      { label: "Cardio Room", icon: "run" },
      { label: "Courts", icon: "basketball" },
    ],
    equipment: [
      {
        title: "Free Weights",
        rows: [
          { label: "Dumbbells", value: "5 – 110 lb" },
          { label: "Barbells", value: "Olympic + EZ bar" },
          { label: "Kettlebells", value: "8 – 32 kg" },
        ],
      },
      {
        title: "Racks & Platforms",
        rows: [
          { label: "Squat racks", value: "3" },
          { label: "Bench press stations", value: "3" },
          { label: "Cable machines", value: "4" },
        ],
      },
      {
        title: "Cardio",
        rows: [
          { label: "Treadmills", value: "14" },
          { label: "Stationary bikes", value: "10" },
          { label: "Rowing machines", value: "6" },
          { label: "Ellipticals", value: "8" },
        ],
      },
      {
        title: "Other Facilities",
        rows: [
          { label: "Basketball courts", value: "1 full-size" },
          { label: "Group fitness studio", value: "Yes" },
          { label: "Weight rooms", value: "2" },
        ],
      },
    ],
    ratings: [
      { label: "Equipment", value: 4.3 },
      { label: "Cleanliness", value: 4.5 },
      { label: "Atmosphere", value: 4.3 },
    ],
  },
];

// All 12 houses with their two identity colors (as data).
const houseGyms: Gym[] = [
  houseGym({ slug: "adams", name: "Adams", address: "26 Plympton Street", rating: 4.3, ratingCount: 38, colors: { primary: "#3b6fe0", secondary: "#9aa0a6" } }), // Blue & Gray
  houseGym({ slug: "cabot", name: "Cabot", address: "60 Linnaean Street", rating: 4.1, ratingCount: 22, colors: { primary: "#34a85a", secondary: "#e8e8e8" } }), // Green & White
  houseGym({ slug: "currier", name: "Currier", address: "64 Linnaean Street", rating: 4.2, ratingCount: 25, colors: { primary: "#9b6dff", secondary: "#e8e8e8" } }), // Purple & White
  houseGym({ slug: "dunster", name: "Dunster", address: "945 Memorial Drive", rating: 4.4, ratingCount: 31, colors: { primary: "#9e2b4d", secondary: "#c4c8d0" } }), // Maroon & Silver
  houseGym({ slug: "eliot", name: "Eliot", address: "101 Dunster Street", rating: 4.5, ratingCount: 41, colors: { primary: "#cf2b40", secondary: "#3b6fe0" } }), // Crimson & Blue
  houseGym({ slug: "kirkland", name: "Kirkland", address: "95 Dunster Street", rating: 4.2, ratingCount: 27, colors: { primary: "#f0883e", secondary: "#2b2b2b" } }), // Orange & Black
  houseGym({ slug: "leverett", name: "Leverett", address: "28 DeWolfe Street", rating: 4.2, ratingCount: 34, colors: { primary: "#df3b3b", secondary: "#c4c8d0" } }), // Red & Silver
  houseGym({ slug: "lowell", name: "Lowell", address: "10 Holyoke Place", rating: 4.4, ratingCount: 36, colors: { primary: "#9b6dff", secondary: "#d4a843" } }), // Purple & Gold
  houseGym({ slug: "mather", name: "Mather", address: "10 Cowperthwaite Street", rating: 4.3, ratingCount: 30, colors: { primary: "#d4a843", secondary: "#2b2b2b" } }), // Black & Gold
  houseGym({ slug: "pforzheimer", name: "Pforzheimer", address: "56 Linnaean Street", rating: 4.0, ratingCount: 19, colors: { primary: "#34a85a", secondary: "#e8e8e8" } }), // Green & White
  houseGym({ slug: "quincy", name: "Quincy", address: "58 Plympton Street", rating: 4.3, ratingCount: 33, colors: { primary: "#34a85a", secondary: "#e8e8e8" } }), // Green & White
  houseGym({ slug: "winthrop", name: "Winthrop", address: "32 Mill Street", rating: 4.3, ratingCount: 29, colors: { primary: "#cf2b40", secondary: "#9aa0a6" } }), // Crimson & Gray
];

/*
  THE OTHER SEVEN IVIES.
  Main facilities are the real ones per campus (researched for the landing's
  gyms sheet, scripts/landing/preview-gyms8.mjs); hours, ratings and the
  residential gyms' addresses/colours are DEMO data in the Harvard pattern.
  Each campus's residential list uses that school's own word for it — houses,
  colleges, dorms — which the Gyms tab reads from lib/themes.ts.
*/
const yaleGyms: Gym[] = [
  mainGym({ slug: "payne-whitney", name: "Payne Whitney Gymnasium", address: "70 Tower Parkway", hours: "6am–11pm", rating: 4.7, ratingCount: 163, floors: 9, size: "flagship",
    extras: [ { label: "Swimming pool", value: "50 meter" }, { label: "Basketball courts", value: "3 full-size" }, { label: "Squash courts", value: "12" } ],
    gallery: [ { label: "Main Floor", icon: "barbell" }, { label: "Cardio Room", icon: "run" }, { label: "Pool", icon: "swimming" }, { label: "Courts", icon: "basketball" } ] }),
  mainGym({ slug: "israel-fitness", name: "Israel Fitness Center", address: "PWG · 4th floor", hours: "6am–10pm", rating: 4.6, ratingCount: 121, floors: 1, size: "large" }),
  mainGym({ slug: "lanman", name: "Lanman Center", address: "PWG · court level", hours: "7am–10pm", rating: 4.3, ratingCount: 64, floors: 1, size: "standard",
    extras: [{ label: "Basketball courts", value: "4 full-size" }],
    gallery: [ { label: "Courts", icon: "basketball" }, { label: "Cardio Corner", icon: "run" } ] }),
  houseGym({ slug: "benjamin-franklin", name: "Benjamin Franklin", address: "90 Prospect Street", rating: 4.2, ratingCount: 24, colors: { primary: "#c9243f", secondary: "#e8e8e8" } }), // Red & White
  houseGym({ slug: "berkeley", name: "Berkeley", address: "205 Elm Street", rating: 4.3, ratingCount: 31, colors: { primary: "#d43a2f", secondary: "#d4a843" } }), // Red & Gold
  houseGym({ slug: "branford", name: "Branford", address: "74 High Street", rating: 4.4, ratingCount: 36, colors: { primary: "#2f6fb8", secondary: "#d4a843" } }), // Blue & Gold
  houseGym({ slug: "davenport", name: "Davenport", address: "248 York Street", rating: 4.2, ratingCount: 27, colors: { primary: "#3a3f8f", secondary: "#e8e8e8" } }), // Navy & White
  houseGym({ slug: "ezra-stiles", name: "Ezra Stiles", address: "302 York Street", rating: 4.0, ratingCount: 19, colors: { primary: "#d4a843", secondary: "#2b2b2b" } }), // Gold & Black
  houseGym({ slug: "grace-hopper", name: "Grace Hopper", address: "189 Elm Street", rating: 4.3, ratingCount: 28, colors: { primary: "#2e8f5b", secondary: "#e8e8e8" } }), // Green & White
  houseGym({ slug: "jonathan-edwards", name: "Jonathan Edwards", address: "68 High Street", rating: 4.1, ratingCount: 22, colors: { primary: "#2e7d4f", secondary: "#c4c8d0" } }), // Green & Silver
  houseGym({ slug: "morse", name: "Morse", address: "304 York Street", rating: 4.0, ratingCount: 18, colors: { primary: "#c93a3a", secondary: "#9aa0a6" } }), // Red & Gray
  houseGym({ slug: "pauli-murray", name: "Pauli Murray", address: "130 Prospect Street", rating: 4.2, ratingCount: 25, colors: { primary: "#8f4bd0", secondary: "#e8e8e8" } }), // Purple & White
  houseGym({ slug: "pierson", name: "Pierson", address: "261 Park Street", rating: 4.3, ratingCount: 30, colors: { primary: "#d9b23e", secondary: "#2b2b2b" } }), // Gold & Black
  houseGym({ slug: "saybrook", name: "Saybrook", address: "242 Elm Street", rating: 4.4, ratingCount: 33, colors: { primary: "#3b6fe0", secondary: "#d43a2f" } }), // Blue & Red
  houseGym({ slug: "silliman", name: "Silliman", address: "505 College Street", rating: 4.3, ratingCount: 29, colors: { primary: "#c93a3a", secondary: "#d4a843" } }), // Red & Gold
  houseGym({ slug: "timothy-dwight", name: "Timothy Dwight", address: "345 Temple Street", rating: 4.1, ratingCount: 21, colors: { primary: "#d9553e", secondary: "#e8e8e8" } }), // Vermilion & White
  houseGym({ slug: "trumbull", name: "Trumbull", address: "241 Elm Street", rating: 4.0, ratingCount: 17, colors: { primary: "#3a3f8f", secondary: "#d4a843" } }), // Navy & Gold
];

const princetonGyms: Gym[] = [
  mainGym({ slug: "dillon", name: "Dillon Gymnasium", address: "Elm Drive", hours: "6am–11pm", rating: 4.7, ratingCount: 134, floors: 2, size: "flagship",
    extras: [ { label: "Swimming pool", value: "25 yard" }, { label: "Group fitness studio", value: "Yes" } ],
    gallery: [ { label: "Main Floor", icon: "barbell" }, { label: "Cardio Room", icon: "run" }, { label: "Pool", icon: "swimming" } ] }),
  mainGym({ slug: "stephens", name: "Stephens Fitness Center", address: "Dillon Gym · bi-level", hours: "6am–11pm", rating: 4.6, ratingCount: 112, floors: 2, size: "large" }),
  mainGym({ slug: "jadwin", name: "Jadwin Gymnasium", address: "Fitzrandolph Road", hours: "7am–10pm", rating: 4.2, ratingCount: 58, floors: 3, size: "standard",
    extras: [ { label: "Indoor track", value: "200 meter" }, { label: "Basketball courts", value: "3 full-size" } ],
    gallery: [ { label: "Courts", icon: "basketball" }, { label: "Track", icon: "run" } ] }),
  houseGym({ slug: "butler", name: "Butler", address: "Elm Drive", rating: 4.2, ratingCount: 26, colors: { primary: "#2f8f5b", secondary: "#e8e8e8" } }), // Green & White
  houseGym({ slug: "forbes", name: "Forbes", address: "79 Alexander Street", rating: 4.1, ratingCount: 20, colors: { primary: "#3b6fe0", secondary: "#e8e8e8" } }), // Blue & White
  houseGym({ slug: "mathey", name: "Mathey", address: "Blair Walk", rating: 4.2, ratingCount: 23, colors: { primary: "#9e2b4d", secondary: "#c4c8d0" } }), // Maroon & Silver
  houseGym({ slug: "rockefeller", name: "Rockefeller", address: "Holder Walk", rating: 4.3, ratingCount: 27, colors: { primary: "#d9553e", secondary: "#2b2b2b" } }), // Orange & Black
  houseGym({ slug: "whitman", name: "Whitman", address: "Baker Lane", rating: 4.4, ratingCount: 32, colors: { primary: "#8f4bd0", secondary: "#e8e8e8" } }), // Purple & White
  houseGym({ slug: "yeh", name: "Yeh", address: "Poe Field", rating: 4.3, ratingCount: 24, colors: { primary: "#2ea3a3", secondary: "#2b2b2b" } }), // Teal & Black
  houseGym({ slug: "new-college-west", name: "New College West", address: "Poe Field", rating: 4.2, ratingCount: 21, colors: { primary: "#d4a843", secondary: "#2b2b2b" } }), // Gold & Black
];

const pennGyms: Gym[] = [
  mainGym({ slug: "pottruck", name: "Pottruck Health & Fitness", address: "3701 Walnut Street", hours: "6am–11pm", rating: 4.6, ratingCount: 147, floors: 4, size: "flagship",
    extras: [ { label: "Swimming pool", value: "25 yard" }, { label: "Climbing wall", value: "Yes" }, { label: "Basketball courts", value: "2 full-size" } ],
    gallery: [ { label: "Main Floor", icon: "barbell" }, { label: "Cardio Room", icon: "run" }, { label: "Pool", icon: "swimming" }, { label: "Courts", icon: "basketball" } ] }),
  mainGym({ slug: "fox-fitness", name: "Fox Fitness Center", address: "219 S 33rd Street", hours: "7am–10pm", rating: 4.3, ratingCount: 71, floors: 1, size: "standard" }),
  mainGym({ slug: "sheerr-pool", name: "Sheerr Pool", address: "Pottruck · lower level", hours: "7am–9pm", rating: 4.4, ratingCount: 52, floors: 1, size: "standard",
    extras: [{ label: "Swimming pool", value: "12 lanes" }],
    gallery: [ { label: "Pool", icon: "swimming" }, { label: "Cardio Corner", icon: "run" } ] }),
  houseGym({ slug: "harrison", name: "Harrison", address: "3910 Irving Street", rating: 4.3, ratingCount: 34, colors: { primary: "#c93a3a", secondary: "#9aa0a6" } }), // Red & Gray
  houseGym({ slug: "harnwell", name: "Harnwell", address: "3820 Locust Walk", rating: 4.2, ratingCount: 29, colors: { primary: "#3b6fe0", secondary: "#e8e8e8" } }), // Blue & White
  houseGym({ slug: "rodin", name: "Rodin", address: "3901 Locust Walk", rating: 4.2, ratingCount: 27, colors: { primary: "#2ea3a3", secondary: "#e8e8e8" } }), // Teal & White
  houseGym({ slug: "fisher-hassenfeld", name: "Fisher Hassenfeld", address: "3700 Spruce Street", rating: 4.1, ratingCount: 22, colors: { primary: "#d4a843", secondary: "#9e2b4d" } }), // Gold & Maroon
  houseGym({ slug: "ware", name: "Ware", address: "3650 Spruce Street", rating: 4.0, ratingCount: 18, colors: { primary: "#9e2b4d", secondary: "#e8e8e8" } }), // Maroon & White
  houseGym({ slug: "riepe", name: "Riepe", address: "The Quad · 3700 Spruce St", rating: 4.1, ratingCount: 20, colors: { primary: "#2e8f5b", secondary: "#e8e8e8" } }), // Green & White
  houseGym({ slug: "hill", name: "Hill", address: "3333 Walnut Street", rating: 3.9, ratingCount: 16, colors: { primary: "#d9553e", secondary: "#2b2b2b" } }), // Orange & Black
  houseGym({ slug: "kings-court", name: "Kings Court English", address: "3465 Sansom Street", rating: 4.0, ratingCount: 15, colors: { primary: "#8f4bd0", secondary: "#e8e8e8" } }), // Purple & White
  houseGym({ slug: "lauder", name: "Lauder", address: "3335 Woodland Walk", rating: 4.3, ratingCount: 26, colors: { primary: "#3a3f8f", secondary: "#d4a843" } }), // Navy & Gold
  houseGym({ slug: "gutmann", name: "Gutmann", address: "4015 Walnut Street", rating: 4.4, ratingCount: 30, colors: { primary: "#2f6fb8", secondary: "#e8e8e8" } }), // Blue & White
];

const brownGyms: Gym[] = [
  mainGym({ slug: "nelson", name: "Nelson Fitness Center", address: "225 Hope Street", hours: "6am–11pm", rating: 4.7, ratingCount: 128, floors: 2, size: "flagship",
    extras: [{ label: "Group fitness studio", value: "Yes" }] }),
  mainGym({ slug: "omac", name: "Olney-Margolies Athletic Center", address: "235 Hope Street", hours: "6am–10pm", rating: 4.4, ratingCount: 83, floors: 2, size: "large",
    extras: [ { label: "Indoor track", value: "200 meter" }, { label: "Basketball courts", value: "2 full-size" } ],
    gallery: [ { label: "Track", icon: "run" }, { label: "Courts", icon: "basketball" } ] }),
  mainGym({ slug: "coleman", name: "Coleman Aquatics Center", address: "225 Hope Street", hours: "7am–9pm", rating: 4.5, ratingCount: 61, floors: 1, size: "standard",
    extras: [{ label: "Swimming pool", value: "8 lanes" }],
    gallery: [ { label: "Pool", icon: "swimming" }, { label: "Cardio Corner", icon: "run" } ] }),
  houseGym({ slug: "keeney", name: "Keeney Quad", address: "64 Charlesfield Street", rating: 4.2, ratingCount: 28, colors: { primary: "#c93a3a", secondary: "#e8e8e8" } }), // Red & White
  houseGym({ slug: "wriston", name: "Wriston Quad", address: "Brown Street", rating: 4.1, ratingCount: 24, colors: { primary: "#d4a843", secondary: "#4e3629" } }), // Gold & Brown
  houseGym({ slug: "pembroke", name: "Pembroke", address: "172 Meeting Street", rating: 4.2, ratingCount: 22, colors: { primary: "#3b6fe0", secondary: "#e8e8e8" } }), // Blue & White
  houseGym({ slug: "grad-center", name: "Grad Center", address: "90 Thayer Street", rating: 3.9, ratingCount: 15, colors: { primary: "#2b2b2b", secondary: "#9aa0a6" } }), // Black & Gray
  houseGym({ slug: "perkins", name: "Perkins", address: "154 Power Street", rating: 4.0, ratingCount: 17, colors: { primary: "#2e8f5b", secondary: "#e8e8e8" } }), // Green & White
  houseGym({ slug: "andrews", name: "Andrews", address: "211 Bowen Street", rating: 4.1, ratingCount: 19, colors: { primary: "#8f4bd0", secondary: "#e8e8e8" } }), // Purple & White
];

const columbiaGyms: Gym[] = [
  mainGym({ slug: "dodge", name: "Dodge Fitness Center", address: "3030 Broadway", hours: "6am–11pm", rating: 4.4, ratingCount: 156, floors: 3, size: "flagship",
    extras: [ { label: "Swimming pool", value: "25 yard" }, { label: "Basketball courts", value: "3 full-size" } ],
    gallery: [ { label: "Main Floor", icon: "barbell" }, { label: "Cardio Room", icon: "run" }, { label: "Pool", icon: "swimming" }, { label: "Courts", icon: "basketball" } ] }),
  mainGym({ slug: "levien", name: "Levien Gymnasium", address: "Dodge · court level", hours: "7am–10pm", rating: 4.3, ratingCount: 74, floors: 1, size: "standard",
    extras: [{ label: "Basketball courts", value: "3 full-size" }],
    gallery: [ { label: "Courts", icon: "basketball" }, { label: "Cardio Corner", icon: "run" } ] }),
  mainGym({ slug: "blue-gym", name: "University Gym (Blue Gym)", address: "Dodge · lower level", hours: "7am–10pm", rating: 4.1, ratingCount: 48, floors: 1, size: "standard",
    extras: [{ label: "Basketball courts", value: "1 full-size" }] }),
  houseGym({ slug: "carman", name: "Carman", address: "545 W 114th Street", rating: 4.1, ratingCount: 26, colors: { primary: "#3b6fe0", secondary: "#e8e8e8" } }), // Blue & White
  houseGym({ slug: "john-jay", name: "John Jay", address: "519 W 114th Street", rating: 4.0, ratingCount: 22, colors: { primary: "#9e2b4d", secondary: "#c4c8d0" } }), // Maroon & Silver
  houseGym({ slug: "furnald", name: "Furnald", address: "2940 Broadway", rating: 4.2, ratingCount: 24, colors: { primary: "#2e8f5b", secondary: "#e8e8e8" } }), // Green & White
  houseGym({ slug: "hartley", name: "Hartley", address: "1125 Amsterdam Avenue", rating: 4.0, ratingCount: 18, colors: { primary: "#d4a843", secondary: "#2b2b2b" } }), // Gold & Black
  houseGym({ slug: "wallach", name: "Wallach", address: "1116 Amsterdam Avenue", rating: 3.9, ratingCount: 16, colors: { primary: "#d9553e", secondary: "#e8e8e8" } }), // Orange & White
  houseGym({ slug: "east-campus", name: "East Campus", address: "70 Morningside Drive", rating: 4.3, ratingCount: 29, colors: { primary: "#2ea3a3", secondary: "#2b2b2b" } }), // Teal & Black
  houseGym({ slug: "wien", name: "Wien", address: "411 W 116th Street", rating: 3.9, ratingCount: 14, colors: { primary: "#8f4bd0", secondary: "#e8e8e8" } }), // Purple & White
  houseGym({ slug: "mcbain", name: "McBain", address: "562 W 113th Street", rating: 4.0, ratingCount: 19, colors: { primary: "#c93a3a", secondary: "#9aa0a6" } }), // Red & Gray
];

const cornellGyms: Gym[] = [
  mainGym({ slug: "helen-newman", name: "Helen Newman Hall", address: "163 Cradit Farm Drive", hours: "6am–9pm", rating: 4.5, ratingCount: 119, floors: 2, size: "large",
    extras: [ { label: "Swimming pool", value: "25 yard" }, { label: "Bowling lanes", value: "8" } ],
    gallery: [ { label: "Main Floor", icon: "barbell" }, { label: "Pool", icon: "swimming" } ] }),
  mainGym({ slug: "noyes", name: "Noyes Recreation Center", address: "306 West Avenue", hours: "7am–11pm", rating: 4.6, ratingCount: 104, floors: 3, size: "large",
    extras: [ { label: "Bouldering wall", value: "Yes" }, { label: "Basketball courts", value: "1 full-size" } ] }),
  mainGym({ slug: "teagle", name: "Teagle Hall", address: "512 Campus Road", hours: "7am–10:45pm", rating: 4.2, ratingCount: 67, floors: 2, size: "standard",
    extras: [{ label: "Swimming pool", value: "25 yard" }],
    gallery: [ { label: "Main Floor", icon: "barbell" }, { label: "Pool", icon: "swimming" } ] }),
  houseGym({ slug: "alice-cook", name: "Alice Cook", address: "709 West Avenue", rating: 4.2, ratingCount: 24, colors: { primary: "#3b6fe0", secondary: "#e8e8e8" } }), // Blue & White
  houseGym({ slug: "carl-becker", name: "Carl Becker", address: "West Campus", rating: 4.1, ratingCount: 21, colors: { primary: "#2e8f5b", secondary: "#e8e8e8" } }), // Green & White
  houseGym({ slug: "flora-rose", name: "Flora Rose", address: "West Campus", rating: 4.3, ratingCount: 26, colors: { primary: "#d9553e", secondary: "#e8e8e8" } }), // Rose & White
  houseGym({ slug: "hans-bethe", name: "Hans Bethe", address: "West Campus", rating: 4.2, ratingCount: 23, colors: { primary: "#8f4bd0", secondary: "#e8e8e8" } }), // Purple & White
  houseGym({ slug: "william-keeton", name: "William Keeton", address: "West Campus", rating: 4.1, ratingCount: 20, colors: { primary: "#d4a843", secondary: "#2b2b2b" } }), // Gold & Black
  houseGym({ slug: "toni-morrison", name: "Toni Morrison", address: "18 Sisson Place", rating: 4.4, ratingCount: 31, colors: { primary: "#9e2b4d", secondary: "#c4c8d0" } }), // Maroon & Silver
  houseGym({ slug: "ganedago", name: "Ganedago Hall", address: "North Campus", rating: 4.3, ratingCount: 25, colors: { primary: "#2ea3a3", secondary: "#e8e8e8" } }), // Teal & White
  houseGym({ slug: "clara-dickson", name: "Clara Dickson", address: "North Campus", rating: 3.9, ratingCount: 15, colors: { primary: "#c93a3a", secondary: "#e8e8e8" } }), // Red & White
];

const dartmouthGyms: Gym[] = [
  mainGym({ slug: "zimmerman", name: "Zimmerman Fitness Center", address: "Alumni Gym · 3rd floor", hours: "6am–11pm", rating: 4.7, ratingCount: 115, floors: 1, size: "flagship" }),
  mainGym({ slug: "lewinstein", name: "Lewinstein Athletic Center", address: "Alumni Gym · 6 S Park St", hours: "6am–11pm", rating: 4.6, ratingCount: 97, floors: 2, size: "large" }),
  mainGym({ slug: "berry-sports", name: "Berry Sports Center", address: "6 South Park Street", hours: "7am–10pm", rating: 4.3, ratingCount: 56, floors: 2, size: "standard",
    extras: [{ label: "Basketball courts", value: "2 full-size" }],
    gallery: [ { label: "Courts", icon: "basketball" }, { label: "Cardio Corner", icon: "run" } ] }),
  houseGym({ slug: "allen-house", name: "Allen", address: "Massachusetts Row", rating: 4.2, ratingCount: 22, colors: { primary: "#8f4bd0", secondary: "#e8e8e8" } }), // Purple & White
  houseGym({ slug: "east-wheelock", name: "East Wheelock", address: "East Wheelock Street", rating: 4.1, ratingCount: 19, colors: { primary: "#3b6fe0", secondary: "#e8e8e8" } }), // Blue & White
  houseGym({ slug: "north-park", name: "North Park", address: "North Park Street", rating: 4.3, ratingCount: 25, colors: { primary: "#2e8f5b", secondary: "#e8e8e8" } }), // Green & White
  houseGym({ slug: "school-house", name: "School", address: "School Street", rating: 4.2, ratingCount: 21, colors: { primary: "#d4a843", secondary: "#2b2b2b" } }), // Gold & Black
  houseGym({ slug: "south-house", name: "South", address: "South Main Street", rating: 4.0, ratingCount: 17, colors: { primary: "#9e2b4d", secondary: "#c4c8d0" } }), // Maroon & Silver
  houseGym({ slug: "west-house", name: "West", address: "West Wheelock Street", rating: 4.1, ratingCount: 18, colors: { primary: "#d9553e", secondary: "#2b2b2b" } }), // Orange & Black
];

/*
  EVERY CAMPUS'S GYMS, by the same keys lib/themes.ts uses. The app reads the
  logged-in school's list with gymsFor(); the flat `gyms` export stays as
  Harvard's for the demo fixtures that predate the switcher (tour, fake
  matches), which are Harvard-shaped anyway.
*/
export const gymsByUniversity: Record<string, Gym[]> = {
  harvard: [...mainGyms, ...houseGyms],
  yale: yaleGyms,
  princeton: princetonGyms,
  penn: pennGyms,
  brown: brownGyms,
  columbia: columbiaGyms,
  cornell: cornellGyms,
  dartmouth: dartmouthGyms,
};

export function gymsFor(universityKey: string): Gym[] {
  return gymsByUniversity[universityKey] ?? gymsByUniversity.harvard;
}

/*
  The two identity colors of the house/college someone lives in, found by the
  residence they picked in onboarding ("Adams" → the Adams house gym's colors).

  Freshmen live in Yard dorms, which have no gym and no colors, so this returns
  null for them — callers fall back to the neutral theme tint. These are per-
  entity CONTENT colors and are applied via inline style, never as a hardcoded
  color inside a component (rule 1).
*/
export function houseColorsFor(
  universityKey: string,
  residence: string | null | undefined,
): HouseColors | null {
  if (!residence) return null;
  const house = gymsFor(universityKey).find(
    (g) => g.kind === "house" && g.name === residence,
  );
  return house?.houseColors ?? null;
}

export const gyms: Gym[] = gymsByUniversity.harvard;

const allGyms: Gym[] = Object.values(gymsByUniversity).flat();

// Slugs are globally unique across schools, so a gym page URL works no matter
// which school the switcher is set to.
export function getGym(slug: string): Gym | undefined {
  return allGyms.find((g) => g.slug === slug);
}

// Find a gym by its exact display name (used to link a logged session's gym
// — stored as the gym's name — back to its slug for ratings / crowd).
export function getGymByName(name: string): Gym | undefined {
  const n = name.trim().toLowerCase();
  return allGyms.find((g) => g.name.toLowerCase() === n);
}

/*
  THE NUMBERS PEOPLE ACTUALLY CHOOSE A GYM ON.
  ---------------------------------------------------------------------------
  A gym page lists ~15 pieces of kit at identical weight, so the three or four
  things that genuinely decide where you train ("can I squat?") sit buried
  between treadmill and elliptical counts. These are those, in the order they
  matter, with the short word a pill uses.

  Two kinds of highlight:
    counted   "6 racks"  — only when the value is a plain number, because
              "Olympic + EZ bar" is not something you can compare across gyms
    presence  "pool"     — the value says the size, which no pill has room for;
              what matters at a glance is that there is one at all

  DATA, not logic inside the component (rule 7): another school's gyms get
  their pills for free by using the same row labels, and re-ordering what
  matters is a re-order of this list.
*/
type Highlight = {
  label: string; // must match a StatRow label exactly
  one?: string; // singular word, for counted highlights
  many?: string; // plural word
  word?: string; // set instead of one/many => presence only, no number
};

const highlights: Highlight[] = [
  { label: "Squat racks", one: "rack", many: "racks" },
  { label: "Bench press stations", one: "bench", many: "benches" },
  { label: "Deadlift platforms", one: "platform", many: "platforms" },
  { label: "Swimming pool", word: "pool" },
  { label: "Basketball courts", word: "courts" },
  { label: "Treadmills", one: "treadmill", many: "treadmills" },
];

/** The gym's headline kit, already worded — at most `max`, best first. */
export function gymHighlights(gym: Gym, max = 4): string[] {
  const values = new Map<string, string>();
  gym.equipment.forEach((s) => s.rows.forEach((r) => values.set(r.label, r.value)));

  const out: string[] = [];
  for (const h of highlights) {
    if (out.length >= max) break;
    const raw = values.get(h.label);
    if (!raw) continue;
    if (h.word) {
      out.push(h.word);
      continue;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) continue;
    out.push(`${n} ${n === 1 ? h.one : h.many}`);
  }
  return out;
}

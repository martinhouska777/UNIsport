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

export const gyms: Gym[] = [...mainGyms, ...houseGyms];

export function getGym(slug: string): Gym | undefined {
  return gyms.find((g) => g.slug === slug);
}

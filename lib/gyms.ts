/*
  GYM DATA (placeholder/fake for now).
  Same idea as themes: this is DATA. Later it comes from the database.
  No colors live here — colors come from the theme. House "identity" colors
  from the mockups are intentionally NOT included (rule: all color from theme).
*/

export type GymKind = "main" | "house";

export type GalleryIcon = "barbell" | "run" | "swimming" | "basketball";
export type GalleryItem = { label: string; icon: GalleryIcon };

export type StatRow = { label: string; value: string };
export type EquipmentSection = { title: string; rows: StatRow[] };
export type RatingBar = { label: string; value: number }; // out of 5

export type Gym = {
  slug: string;
  name: string;
  kind: GymKind;
  address: string;
  hours: string;
  rating: number;
  ratingCount: number;
  floors: number;
  gallery: GalleryItem[];
  equipment: EquipmentSection[];
  ratings: RatingBar[];
};

export const gyms: Gym[] = [
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
    slug: "leverett",
    name: "Leverett",
    kind: "house",
    address: "28 DeWolfe Street",
    hours: "7am–12am",
    rating: 4.2,
    ratingCount: 34,
    floors: 1,
    gallery: [
      { label: "Weight Room", icon: "barbell" },
      { label: "Cardio Corner", icon: "run" },
    ],
    equipment: [
      {
        title: "Free Weights",
        rows: [
          { label: "Dumbbells", value: "5 – 80 lb" },
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
      { label: "Equipment", value: 4.0 },
      { label: "Cleanliness", value: 4.3 },
      { label: "Atmosphere", value: 4.4 },
    ],
  },
  {
    slug: "eliot",
    name: "Eliot",
    kind: "house",
    address: "101 Dunster Street",
    hours: "7am–12am",
    rating: 4.5,
    ratingCount: 41,
    floors: 1,
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
          { label: "Squat racks", value: "2" },
          { label: "Bench press stations", value: "1" },
        ],
      },
      {
        title: "Cardio",
        rows: [
          { label: "Treadmills", value: "4" },
          { label: "Stationary bikes", value: "2" },
        ],
      },
      {
        title: "Other Facilities",
        rows: [{ label: "Weight rooms", value: "1" }],
      },
    ],
    ratings: [
      { label: "Equipment", value: 4.3 },
      { label: "Cleanliness", value: 4.6 },
      { label: "Atmosphere", value: 4.6 },
    ],
  },
  {
    slug: "winthrop",
    name: "Winthrop",
    kind: "house",
    address: "32 Mill Street",
    hours: "7am–12am",
    rating: 4.3,
    ratingCount: 29,
    floors: 1,
    gallery: [
      { label: "Weight Room", icon: "barbell" },
      { label: "Cardio Corner", icon: "run" },
    ],
    equipment: [
      {
        title: "Free Weights",
        rows: [
          { label: "Dumbbells", value: "5 – 85 lb" },
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
      { label: "Equipment", value: 4.1 },
      { label: "Cleanliness", value: 4.4 },
      { label: "Atmosphere", value: 4.4 },
    ],
  },
];

export function getGym(slug: string): Gym | undefined {
  return gyms.find((g) => g.slug === slug);
}

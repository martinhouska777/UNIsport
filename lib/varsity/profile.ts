/*
  VARSITY PROFILE — DATA (source of truth for the athlete Profile screen)
  ------------------------------------------------------------------
  Mirrors the profile mockup. Later this comes from the DB (the athlete's
  record, their logged sessions, their season totals). For now it's mock data
  so the layout can be reviewed.

  Activity-type dot colors are CONTENT colors (like a house's identity colors),
  so per rule 1's exception they may live here as data and be applied via inline
  style. Where a token fits (row=success, lift=accent, planned=primary,
  rest/missed=muted/danger) we reference the CSS variable; erg/run have no token
  so they use their own hex.
*/

export type ActivityType = "erg" | "row" | "lift" | "run" | "planned" | "rest" | "missed";

// Legend entries (missed is rendered specially, not in the legend).
export const activityLegend: { type: ActivityType; label: string }[] = [
  { type: "erg", label: "Erg" },
  { type: "row", label: "Row" },
  { type: "lift", label: "Lift" },
  { type: "run", label: "Run" },
  { type: "planned", label: "Planned" },
  { type: "rest", label: "Rest" },
];

export const activityColor: Record<ActivityType, string> = {
  erg: "#4a90a4", // content color (no theme token for this blue)
  row: "var(--success)",
  lift: "var(--accent)",
  run: "#c084fc", // content color (no theme token for this purple)
  planned: "var(--primary)",
  rest: "var(--muted)",
  missed: "var(--danger)",
};

export type CalDay = {
  num: number;
  dots: ActivityType[];
  today?: boolean;
  future?: boolean;
  missed?: boolean;
};

export const profile = {
  identity: {
    initials: "MN",
    name: "Martin Novak",
    classLine: "’27 · Eliot House · 3rd year on team",
    seat: "2V · Stern 4",
  },
  status: {
    title: "Active",
    sub: "Available for training and selection",
  },
  calendar: {
    month: "May",
    year: "2026",
    leadingEmpty: 3,
    summary: [
      { val: "26", lbl: "Sessions" },
      { val: "96%", lbl: "Completed" },
      { val: "94k", lbl: "Meters" },
      { val: "1", lbl: "PR" },
    ],
    days: [
      { num: 1, dots: ["erg"] },
      { num: 2, dots: ["erg", "lift"] },
      { num: 3, dots: ["row"] },
      { num: 4, dots: ["rest"] },
      { num: 5, dots: ["erg"] },
      { num: 6, dots: ["lift"] },
      { num: 7, dots: ["row", "lift"] },
      { num: 8, dots: ["missed"], missed: true },
      { num: 9, dots: ["erg"] },
      { num: 10, dots: ["row"] },
      { num: 11, dots: ["rest"] },
      { num: 12, dots: ["erg"] },
      { num: 13, dots: ["lift"] },
      { num: 14, dots: ["erg", "lift"] },
      { num: 15, dots: ["row"] },
      { num: 16, dots: ["run"] },
      { num: 17, dots: ["row"] },
      { num: 18, dots: ["erg"] },
      { num: 19, dots: ["erg", "lift"] },
      { num: 20, dots: ["erg"] },
      { num: 21, dots: ["run"] },
      { num: 22, dots: ["erg", "run"], today: true },
      { num: 23, dots: ["planned"], future: true },
      { num: 24, dots: ["rest"], future: true },
      { num: 25, dots: ["planned"], future: true },
      { num: 26, dots: ["planned", "planned"], future: true },
      { num: 27, dots: ["planned"], future: true },
      { num: 28, dots: ["planned"], future: true },
      { num: 29, dots: ["planned"], future: true },
      { num: 30, dots: ["planned"], future: true },
      { num: 31, dots: ["rest"], future: true },
    ] as CalDay[],
  },
  portfolio: {
    season: "2025–26 season",
    stats: [
      { val: "412k", lbl: "Meters", sub: "+8% vs ’25" },
      { val: "148", lbl: "Sessions", sub: "+12%" },
      { val: "94%", lbl: "Consistency", sub: "+6 pts" },
    ],
    prs: [
      { name: "2K", val: "6:08.4" },
      { name: "5K", val: "16:42.8" },
      { name: "6K", val: "20:14.3" },
      { name: "60'", val: "16,820m" },
      { name: "Squat", val: "175 kg" },
      { name: "Deadlift", val: "205 kg" },
    ],
  },
  report: {
    title: "Send to coaches abroad",
    sub: "A live web page showing your full training year — calendar, every session, every test, with verified data. Just paste the link in an email or WhatsApp.",
    url: "hubc.app/m/martin-novak-2026",
  },
};

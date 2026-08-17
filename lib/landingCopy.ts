/*
  EVERY WORD ON THE LANDING PAGE — the single source of truth.

  Rule 7: content is data, never hardcoded in a component. This file is where
  landing copy gets decided and reviewed. It reads top-to-bottom in the order a
  visitor meets it, so the whole page can be read as prose without opening a
  single component.

  ── Beat numbering ────────────────────────────────────────────────────────
  The two scroll animations are numbered the way we talk about them:
    S1…S7  the student story  (gyms → people → reasons → plan → log → record → proof)
    V1…V6  the varsity story  (plan → boat → race → week → calendar → season)

  ── One sync obligation, until the port lands ─────────────────────────────
  The built prototype (webpage/Scroll Animations.html) still carries its own
  copy in the two arrays at the top of scripts/landing/build-story.mjs, because
  that script is plain Node and cannot import this file. Until step 2 of the
  port (ScrollStory reads its beats from here), a copy change must be made in
  BOTH places or the prototype and the site will disagree.

  Motion fields — pan, hold, enter, tap, ann — deliberately stay in
  build-story.mjs. They are mechanics, not text, and this file is meant to stay
  readable by someone who does not read code.
*/

export type Beat = {
  /** S1…S7 / V1…V6 — how we refer to this beat in conversation. */
  id: string;
  /** The small label above the headline. */
  kicker: string;
  /** The headline. */
  head: string;
  /** Optional second half of the headline, set in italic accent. */
  headEm?: string;
  /** The sub-line under it. Empty string = headline stands alone. */
  sub: string;
  /** Which screenshot in public/landing/ this beat rides. */
  shot: string;
};

/* ─────────────────────────── THE HERO ─────────────────────────── */

export const hero = {
  badge: "The universal college fitness platform",
  /* The page headline. Describes the product, and lives only here. */
  headline: ["Your campus.", "Your gym.", "Your people."],
  kicker: {
    lead: "For every student.",
    tail: "With a dedicated mode for varsity athletes.",
  },
  /* Four short claims, then the varsity note. The fourth was "Join the
     community that's already there" — vague about where those people are.
     "See where you rank" is the leaderboards, and it is the only line here
     that gives a reason to come back tomorrow. */
  body: "Discover every gym on campus. Find a verified training partner. Log every session. See where you rank — plus a gated mode built for varsity teams.",
  primaryCta: "Get started with .edu",
  /* Two doors, because the kicker promises two. */
  studentCta: "See the student app",
  varsityCta: "See Varsity Mode",
  inviteNote: "Got a link from your team?",
  inviteCta: "Join with your invite",
  schools: ["Harvard", "Yale", "MIT", "Princeton"],
};

/* THE BRAND LINE. Three words, a promise rather than a description — it goes
   under the logo, on the splash, in a store listing. Distinct from the hero
   headline above, which describes and only ever appears on this page.
   S7 already lands on it, so the story closes on the brand line. */
export const brandLine = "Never train alone.";

/* ───────────────────── S1–S7 · THE STUDENT STORY ───────────────────── */

export const studentStory: Beat[] = [
  {
    id: "S1",
    kicker: "01 · The gyms",
    head: "Every gym on campus. One list.",
    sub: "Opening hours, how busy it is right now, and the house gyms nobody has a map of.",
    shot: "01-gyms.webp",
  },
  {
    id: "S2",
    kicker: "02 · The people",
    head: "Then it finds your people.",
    sub: "Sorted by how well you actually fit — same gym, same hours, same level.",
    shot: "02-match.webp",
  },
  {
    id: "S3",
    kicker: "03 · The reasons",
    head: "And it tells you why.",
    sub: "Every reason is a real fact from both profiles. No black box.",
    shot: "03-why-you-match.webp",
  },
  {
    id: "S4",
    kicker: "04 · The plan",
    head: "Make the plan in the chat.",
    sub: "One tap proposes a session. One tap accepts. It's on both your calendars.",
    shot: "04-plan-a-session.webp",
  },
  {
    id: "S5",
    kicker: "05 · The log",
    head: "Afterwards, log it together.",
    sub: "Every set, every rep — and the partner carried straight over from the plan.",
    shot: "tall-logsheet.webp",
  },
  {
    id: "S6",
    kicker: "06 · The record",
    head: "A photo and a note, while it's fresh.",
    sub: "Who you trained with, how it went, and a picture if you took one — a training log you'll still want to read in four years.",
    shot: "tall-logsheet.webp",
  },
  {
    id: "S7",
    kicker: "07 · The proof",
    head: "29 sessions. 6 partners.",
    headEm: brandLine,
    sub: "",
    shot: "tall-profile.webp",
  },
];

/* ─────────────── BETWEEN THE TWO — a full stop, then a reveal ─────────────── */

export const interlude = {
  leadIn: "And if you train for the university itself —",
  headline: "Varsity",
  headlineEm: "Mode.",
  sub: "The app your squad has been running out of a group chat.",
};

/* ───────────────────── V1–V6 · THE VARSITY STORY ───────────────────── */

export const varsityStory: Beat[] = [
  {
    id: "V1",
    kicker: "V1 · The plan",
    head: "The coach's plan, on every phone.",
    sub: "Water, erg, weights — the week your coach actually built. Not a screenshot of a spreadsheet.",
    shot: "tall-vhome.webp",
  },
  {
    id: "V2",
    kicker: "V2 · The boat",
    head: "Your name, in the boat.",
    sub: "The lineup your coach published, seat by seat, the night before you row it — the four in the morning, the pair after lunch.",
    shot: "tall-vhome.webp",
  },
  {
    id: "V3",
    kicker: "V3 · The race",
    head: "The next race, and what to fix before it.",
    sub: "Head of the Charles, 63 days out — and one note from your coach sitting under it until you've sorted it.",
    shot: "tall-vhome.webp",
  },
  {
    id: "V4",
    kicker: "V4 · The week",
    head: "Log straight off the plan.",
    sub: "Your whole week across the top — every session the coach set, waiting to be logged.",
    shot: "13-varsity-log-list.webp",
  },
  {
    id: "V5",
    kicker: "V5 · The calendar",
    head: "Keep track of every session.",
    sub: "Each workout you log lands on the calendar by itself — your season's training history, paired with live statistics.",
    shot: "14-varsity-calendar.webp",
  },
  {
    id: "V6",
    kicker: "V6 · The season",
    head: "129 km this week.",
    sub: "Metres rowed, week by week, all season — consistency you can actually see.",
    shot: "tall-vprofile.webp",
  },
];

/* ─────────────────────────── THE CLOSE ─────────────────────────── */

export const finalCta = {
  headline: "One app per university.",
  headlineEm: "Yours next.",
  sub: "Live now at one university. New campuses are onboarded one at a time — colours, gyms and houses included.",
  button: "Bring it to your university",
};

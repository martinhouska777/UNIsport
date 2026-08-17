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

  Motion fields — pan, hold, enter, tap — deliberately stay in build-story.mjs.
  They are mechanics, not text, and this file is meant to stay readable by
  someone who does not read code. Annotations DO live here: the little labels
  that point into the phone are words a reader reads, so they get reviewed with
  the rest of the copy. Only their placement stays in the build script.
*/

/** A label pointing into the phone screen. `top` is a % down the frame. */
export type Annotation = { side: "left" | "right"; top: number; text: string };

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
  /** Labels pointing at what's on that screen. */
  ann: Annotation[];
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
    head: "Find every gym on campus in one app.",
    sub: "Opening hours, ratings, equipment that nobody has a map of, live crowd meter.",
    shot: "01-gyms.webp",
    ann: [
      { side: "right", top: 14, text: "Live ratings" },
      { side: "left", top: 68, text: "House gyms too" },
    ],
  },
  {
    id: "S2",
    kicker: "02 · The people",
    head: "Find training partners, make friends, establish contacts.",
    sub: "Matching sorted by how well you actually fit — same gym, hours, level and much more.",
    shot: "02-match.webp",
    ann: [{ side: "right", top: 24, text: "Ranked by real fit" }],
  },
  {
    id: "S3",
    kicker: "03 · The reasons",
    /* "Life goals" was in the owner's line and is not in the product — the
       profile stores concentration, hometown, languages, interests and a bio. */
    head: "View a person's profile for hobbies, interests, concentrations.",
    sub: "Or get mentored by more experienced people.",
    shot: "03-why-you-match.webp",
    ann: [{ side: "left", top: 56, text: "Facts, not guesses" }],
  },
  {
    id: "S4",
    kicker: "04 · The plan",
    head: "Plan your session in the chat with one tap.",
    sub: "One tap proposes the session, one accepts, it's in both calendars.",
    shot: "04-plan-a-session.webp",
    ann: [{ side: "right", top: 52, text: "One tap to accept" }],
  },
  {
    id: "S5",
    kicker: "05 · The log",
    head: "Afterwards, log it together.",
    sub: "Every set, every rep — and the partner carried straight over from the plan.",
    shot: "tall-logsheet.webp",
    ann: [{ side: "right", top: 30, text: "Set by set" }],
  },
  {
    id: "S6",
    kicker: "06 · The record",
    /* "Track your partner's calendar" was in the owner's line and is not in
       the product — /people/[id] renders a profile, match reasons and photos,
       and no calendar. */
    head: "Make memories stored in the calendar.",
    sub: "Who you trained with, how it went, and a picture to make memories that last forever.",
    shot: "tall-logsheet.webp",
    ann: [{ side: "left", top: 50, text: "Photo + note" }],
  },
  {
    id: "S7",
    kicker: "07 · The proof",
    /* Not `brandLine`: the story closes on the owner's "never train alone
       AGAIN", while the brand line under the logo stays at three words. */
    head: "29 sessions. 6 partners.",
    headEm: "Never train alone again.",
    sub: "Participate in college leaderboards.",
    shot: "tall-profile.webp",
    ann: [
      { side: "right", top: 30, text: "Leaderboards" },
      { side: "left", top: 76, text: "Every day you trained" },
    ],
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

/*
  Two open questions on this story, both raised and neither yet decided:

  1. It ends on a statistics graph (V6), which the brief argues against by
     name: a stats screen is the one screen every fitness app already has,
     while a seat in a named boat, published by a coach, is the one none of
     them can show. That screen is V2, currently buried mid-story.
  2. V5's headline is the only line in either story written in the generic
     voice — "keep track of every session" names nothing and could sit on any
     fitness app ever shipped.

  And one beat that is written but cannot be shot yet — V7, the squad:

      head: "See how the squad is training."
      sub:  "92% consistency, 19 hours, five extra sessions — every teammate's
             month, and where yours sits next to it."

  Those numbers are read off 11-varsity-teammate.webp, which already exists.
  The problem is that it is a DARK-mode capture from the old shot day, and
  every frame in both stories is now light — a dark screen inside the light
  phone chrome reads as a bug. It needs a re-shoot through capture-light.mjs
  before this beat can ship.
*/
export const varsityStory: Beat[] = [
  {
    id: "V1",
    kicker: "V1 · The plan",
    /* "Always actual" was the owner's word — aktuální, a Czech false friend.
       "Current" is the meaning; English "actual" means real-not-fake. The
       sub is the one that was already here: the owner gave V1 a headline
       only, and deleting a line nobody asked to delete is the bigger edit. */
    head: "Training plan always at hand, always current.",
    sub: "Water, erg, weights — the week your coach actually built. Not a screenshot of a spreadsheet.",
    shot: "tall-vhome.webp",
    ann: [{ side: "right", top: 18, text: "Week 6 of 15" }],
  },
  {
    id: "V2",
    kicker: "V2 · The boat",
    head: "Find your lineup in a second.",
    sub: "Never look through 40 names in an Excel sheet again. Your name pops right in a boat.",
    shot: "tall-vhome.webp",
    ann: [{ side: "left", top: 42, text: "You, 3 seat" }],
  },
  {
    id: "V3",
    kicker: "V3 · The race",
    /* "Always on your eyes" is před očima taken literally. */
    head: "Keep your focus up.",
    sub: "Countdown to the next race and coach's note on what to fix, always in front of you.",
    shot: "tall-vhome.webp",
    ann: [
      { side: "right", top: 52, text: "Counting down" },
      { side: "left", top: 70, text: "Straight from the coach" },
    ],
  },
  {
    id: "V4",
    kicker: "V4 · The week",
    /* "Logging IN workouts" was the owner's phrase — logging in is signing
       in, a different thing. All three routes named here are on the capture:
       a Log button per prescribed session, the "Scan C2 / RP3 monitor" card,
       and "Add extra session" at the bottom. */
    head: "Logging workouts has never been easier.",
    sub: "Log your workout straight from your training plan, scan your erg for instant extraction, add extra workouts.",
    shot: "13-varsity-log-list.webp",
    ann: [
      { side: "right", top: 16, text: "Your week, at a glance" },
      { side: "left", top: 44, text: "Tap to log" },
    ],
  },
  {
    id: "V5",
    kicker: "V5 · The calendar",
    head: "Keep track of every session.",
    sub: "Each workout you log lands on the calendar by itself — your season's training history, paired with live statistics.",
    shot: "14-varsity-calendar.webp",
    ann: [
      { side: "right", top: 34, text: "Session dots" },
      { side: "left", top: 64, text: "Today" },
    ],
  },
  {
    id: "V6",
    kicker: "V6 · The season",
    /* "Check how your teammates are doing" is a real feature but NOT on this
       frame — tall-vprofile is your own season. The squad screen exists
       (11-varsity-teammate.webp) and is a dark-mode capture, so until it is
       re-shot this clause is the one line in either story with no picture
       behind it. */
    head: "See your statistics.",
    sub: "Track consistency, check how your teammates are doing, inspire yourself.",
    shot: "tall-vprofile.webp",
    ann: [{ side: "right", top: 40, text: "Eight weeks of work" }],
  },
];

/* ─────────────────────────── THE CLOSE ─────────────────────────── */

export const finalCta = {
  headline: "One app per university.",
  headlineEm: "Yours next.",
  sub: "Live now at one university. New campuses are onboarded one at a time — colours, gyms and houses included.",
  button: "Bring it to your university",
};

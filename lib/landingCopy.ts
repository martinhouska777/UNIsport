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
    head: "Find every gym on campus. In one app.",
    /* Equipment carries the weight here, and it sits last so it lands last.
       It also travels: "the house gyms nobody has a map of" was the better
       line, but houses are a Harvard word and the sentence died at school two.
       Every campus has rooms whose contents are a mystery. */
    sub: "Opening hours, ratings, a live crowd meter — and the equipment nobody has a map of.",
    shot: "01-gyms.webp",
    ann: [
      { side: "right", top: 14, text: "Live ratings" },
      { side: "left", top: 68, text: "Full equipment list" },
    ],
  },
  {
    id: "S2",
    kicker: "02 · The people",
    /* "61 people · sorted by compatibility" is printed on the screenshot, so
       the number is read off the app rather than invented. */
    head: "Then it finds your people.",
    sub: "61 people, ranked by how well you actually fit — same gym, same hours, same level, and more you'd never think to filter for.",
    shot: "02-match.webp",
    ann: [{ side: "right", top: 24, text: "Ranked by real fit" }],
  },
  {
    id: "S3",
    /* The strongest beat on the page: every rival can show a profile, almost
       none can explain its own matching. So the headline stays on the
       explanation, and the profile's contents — interests, concentration,
       languages, the mentor pairing — ride underneath it. They are the same
       screen, so nothing had to be traded away for the mentor to appear. */
    kicker: "03 · The reasons",
    head: "And it tells you why.",
    sub: "Every reason is a real fact off both profiles — shared interests, the same concentration, a language you both speak. Including the one that says one of you is here to teach the other.",
    shot: "03-why-you-match.webp",
    ann: [
      { side: "right", top: 34, text: "Mentor fit" },
      { side: "left", top: 56, text: "Facts, not guesses" },
    ],
  },
  {
    id: "S4",
    kicker: "04 · The plan",
    /* The fear this beat answers is not "how do I schedule" — it is "are they
       actually going to turn up". So the sub ends on the certainty. */
    head: "Make the plan in the chat.",
    sub: "One tap proposes it. One tap accepts. It's on both calendars — nobody has to ask “are we still on?”",
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
    head: "A photo and a note, while it's fresh.",
    sub: "Who you trained with, how it went, and a picture if you took one — a session you'll have forgotten by March, still there in four years.",
    shot: "tall-logsheet.webp",
    ann: [{ side: "left", top: 50, text: "Photo + note" }],
  },
  {
    id: "S7",
    kicker: "07 · The proof",
    /* The finale keeps no sub-line on purpose — the two numbers and the brand
       line are the whole beat, and silence under them is what gives them room.
       The leaderboards the pan travels past are named by the annotation
       instead, which is why they do not need a sentence. */
    head: "29 sessions. 6 partners.",
    headEm: brandLine,
    sub: "",
    shot: "tall-profile.webp",
    ann: [
      { side: "right", top: 30, text: "Campus leaderboards" },
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
    /* Two promises, and the second is the one a squad actually cares about:
       not just that the plan is on your phone, but that it is the current
       one. A PDF in a group chat is out of date the first time it changes. */
    head: "The coach's plan, always on you.",
    sub: "Water, erg, weights — the week your coach actually built, changing the moment they change it. Not a screenshot of a spreadsheet.",
    shot: "tall-vhome.webp",
    ann: [{ side: "right", top: 18, text: "Week 6 of 15" }],
  },
  {
    id: "V2",
    kicker: "V2 · The boat",
    /* The headline stays on the image — a name in a boat — and the misery it
       replaces goes first in the sub, where the contrast does the work. */
    head: "Your name, in the boat.",
    sub: "No scrolling 40 names in a spreadsheet — the lineup your coach published, seat by seat, the night before you row it. The four in the morning, the pair after lunch.",
    shot: "tall-vhome.webp",
    ann: [{ side: "left", top: 42, text: "You, 3 seat" }],
  },
  {
    id: "V3",
    kicker: "V3 · The race",
    head: "The next race, and what to fix before it.",
    sub: "Head of the Charles, 63 days out — and one note from your coach sitting under it until you've sorted it.",
    shot: "tall-vhome.webp",
    ann: [
      { side: "right", top: 52, text: "Counting down" },
      { side: "left", top: 70, text: "Straight from the coach" },
    ],
  },
  {
    id: "V4",
    kicker: "V4 · The week",
    /* All three routes into a log are on this one capture and the copy used
       to mention only the first: a Log button on each prescribed session, the
       "Scan C2 / RP3 monitor" card, and "Add extra session" at the bottom.
       The erg scan is the most distinctive thing Varsity Mode does and this
       is the only beat that shows it. "Never been easier" was cut — it is
       the exact ad voice the brief bans. */
    head: "Log straight off the plan.",
    sub: "Every session your coach set, waiting with a Log button. Snap the C2 or RP3 monitor and the splits read themselves. Anything extra you did goes on underneath.",
    shot: "13-varsity-log-list.webp",
    ann: [
      { side: "right", top: 40, text: "Scan the erg" },
      { side: "left", top: 58, text: "Log from the plan" },
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
    head: "129 km this week.",
    sub: "Metres rowed, week by week, all season — consistency you can actually see.",
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

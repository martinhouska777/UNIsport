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

/* The two small scroll cues — under the hero, and under the interlude. */
export const cues = {
  hero: "Scroll",
  interlude: "Keep going",
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

/* ─────────────────────────── THE TWO CLOSERS ───────────────────────────

  Each story ends on a closer: the phone from the story lands in a static piece
  that cycles through eight universities' colours. Campus Colours closes the
  student story (S7 → the Gyms screen, recoloured per school, beside a giant
  letter); Blade Lock closes the varsity story (V6 → Varsity Home, recoloured
  and renamed per school, with eight rowing blades fanned behind it).

  The words below were carried over verbatim from the two Claude Design pieces
  (webpage/UNIsport Campus Colours.html, webpage/Blade Lock Light.html) — with
  ONE change, marked. The eight schools' names live with their colours in
  lib/landingSchools.ts; the line under the varsity phone reads
  "{SCHOOL} ROWING".
*/

export const closers = {
  campus: {
    leadIn: "One app per university —",
    headline: "Your campus,",
    headlineEm: "your colours.",
    /* The design read "Same app. Eight campuses. Yours next." — but the app is
       live at ONE university (the final CTA says so). The eight here show what
       white-labelling looks like; they are not eight live campuses. The claim
       is dropped rather than softened: "Same app. Yours next." */
    sub: "Every gym on campus, in the colours of the university it belongs to. Same app. Yours next.",
  },
  blades: {
    leadIn: "One boathouse at a time —",
    headline: "Every crew.",
    headlineEm: "One system.",
    sub: "Built for Harvard rowing. Ready for every boathouse after it — in its own colours, read straight off the blade.",
    /* Under the phone: "HARVARD ROWING", "YALE ROWING", … */
    label: "Rowing",
  },
};

/* ───────────────────── THE COACH SECTION ─────────────────────

  The third door. Ported from the "One Coach, Forty Athletes" design piece,
  which sits after the varsity story — its own bridge line refers to "the story
  you just scrolled", so the order is load-bearing.

  ── On the colour ────────────────────────────────────────────────────────
  The design piece used crimson (#a51c30). That is Harvard's colour, and Zone 1
  is neutral-brand only (rule 2) — so it would have been both a university
  colour in the pre-login zone and a third accent competing with the blue/gold
  system. This section uses the GOLD varsity accent instead: the Coach Console
  lives at /varsity/coach, and everything it publishes lands in the varsity
  story. One token swap reverses this if the owner wants crimson.
*/

/** A run of body text; `bold` lifts it to full-strength text colour. */
export type Segment = { text: string; bold?: boolean };

export type CoachStep = {
  n: string;
  /** The small label above the headline — "1 · Create". */
  step: string;
  head: string;
  body: Segment[];
  shot: string;
  /** Read aloud by screen readers, so it describes the screen, not the file. */
  alt: string;
};

export const coach = {
  badge: "UNIsport · for coaches & athletic departments",
  leadIn: "And for the person who runs the squad —",
  headline: "The Coach's",
  headlineEm: "Console.",
  sub: [
    { text: "Students use the app. " },
    { text: "Coaches run it.", bold: true },
    {
      text: " From an empty season to a published lineup in five screens — the plan, the boats and the notes the varsity story above depends on, all built here. These are real screens from the console as it works today.",
    },
  ] as Segment[],

  steps: [
    {
      n: "1",
      step: "1 · Create",
      head: "Start with the race.",
      body: [
        { text: "Name the block, set the dates, add the race you're pointing at. That's the whole setup — " },
        { text: "one screen, under a minute", bold: true },
        { text: ". The app works out the weeks and starts the countdown your athletes will see." },
      ],
      shot: "coach-1-create.webp",
      alt: "The new training block form: block name, from and to dates, and an optional goal race with its date",
    },
    {
      n: "2",
      step: "2 · Build",
      head: "Two taps per session.",
      body: [
        { text: "Pick the type — water, erg, weights. Pick the intensity. Then tap one of the " },
        { text: "five workouts this squad actually uses", bold: true },
        { text: " and the session fills itself in. A full training week takes minutes, not an evening." },
      ],
      shot: "coach-2-build.webp",
      alt: "The session builder: type and intensity pickers, the five most-used workouts as tap-to-fill chips, and a Confirm session button",
    },
    {
      n: "3",
      step: "3 · Plan",
      head: "Publish the week once.",
      body: [
        { text: "The season is one block — fourteen weeks, counting down to the race. Water, erg and weights for every AM and PM, colour-coded by intensity. " },
        { text: "Publish, and it's on every athlete's phone.", bold: true },
        { text: " No more screenshots of a spreadsheet in the group chat." },
      ],
      shot: "coach-3-plan.webp",
      alt: "The Training Plan screen: week 6 of the Fall 2026 block, with colour-coded AM and PM sessions for every day",
    },
    {
      n: "4",
      step: "4 · Lineup",
      head: "Publish the boats.",
      body: [
        { text: "Seat by seat, cox to bow. Port shows red and starboard green, straight from each rower's profile — " },
        { text: "stroke on strokeside, seven on bowside", bold: true },
        { text: ", the way the boat is actually rigged. One tap and the lineup is on every phone " },
        { text: "the night before", bold: true },
        { text: ", not shouted across the dock." },
      ],
      shot: "coach-4-lineup.webp",
      alt: "The Lineup screen: the 1V eight seated cox to bow, port seats in red and starboard seats in green",
    },
    {
      n: "5",
      step: "5 · Notes",
      head: "Keep every athlete on track.",
      body: [
        { text: "One short technical note per athlete. It sits on their Home — under their race countdown — until it's fixed. Everyone else sees a green " },
        { text: "“Good job”", bold: true },
        { text: ". Forty athletes, one glance, no noise." },
      ],
      shot: "coach-5-notes.webp",
      alt: "The Athlete Notes screen: the roster with a short technical note per athlete, and a green Good job for everyone without one",
    },
  ] as CoachStep[],

  bridge: "Everything the console publishes is the story you just scrolled — the plan on their Home, their name in the boat, the note under their race.",
  bridgeSub:
    "A student who signs up brings one user. A coach who adopts brings the whole squad. That's why the console exists — and why it's already built.",

  facts: [
    { title: "1 plan → 40 phones", body: "Publish once; every athlete's Home updates itself." },
    { title: "Boats, the night before", body: "Lineups land on phones before anyone reaches the dock." },
    { title: "The spreadsheet, retired", body: "Plan, lineups and feedback live in one place, not a group chat." },
  ],
};

/* ─────────────────────────── THE CLOSE ─────────────────────────── */

export const finalCta = {
  headline: "One app per university.",
  headlineEm: "Yours next.",
  sub: "Live now at one university. New campuses are onboarded one at a time — colours, gyms and houses included.",
  button: "Bring it to your university",
};

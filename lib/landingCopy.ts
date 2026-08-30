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
  /* The pill above the headline. It read "The universal college fitness
     platform" — a claim. This is the one fact the page can stand behind, and
     it now sits where the badge did, in the first thing a visitor reads.
     (2026-08-18 review: facts convert better than claims.) */
  badge: "Live now at Harvard",
  /* The page headline. Describes the product, and lives only here. */
  headline: ["Your campus.", "Your gym.", "Your people."],
  kicker: {
    lead: "For every student.",
    tail: "With a dedicated mode for varsity athletes.",
  },
  /* FOUR ACTIONS, in the order the app is actually used: find a gym, match
     with someone, plan it, log it (S1 → S2 → S4 → S5). The owner, 2026-08-30:
     "dont just shout out random words, make it targeted to the user — like
     find … match … log … like actions."
     Two words are gone on purpose. "A verified training partner" said the
     PERSON was vetted; what the app verifies is the .edu address at signup
     (lib/universityEmail.ts), so the line now says which. And "see where you
     rank" is out — the owner called it too generic, and the leaderboards
     still get their own beat at S7. The old line, for a one-line revert:
       "Every gym on campus, a verified training partner, every session
        logged — and where you rank." */
  body: "Find every gym on campus. Match with students verified by their .edu email. Plan the session in the chat. Log it together.",
  primaryCta: "Get started with .edu",
  /* Two doors, because the kicker promises two. */
  studentCta: "See the student app",
  varsityCta: "See Varsity Mode",
  inviteNote: "Got a link from your team?",
  inviteCta: "Join with your invite",
  schools: ["Harvard", "Yale", "MIT", "Princeton"],
};

/* ─────────────────── THE LINK CARD (title tag, OG, X) ─────────────────── */

/* What a pasted link shows before anyone taps it — the browser tab title,
   the card in a group chat. The image (public/og.png) is drawn by
   scripts/landing/make-og.mjs from the same headline and pill. */
export const social = {
  title: `UNIsport — ${hero.headline.join(" ")}`,
  description: "Every gym on campus, training partners ranked by real fit, and a Varsity Mode for teams. Live at Harvard.",
  imageAlt: "UNIsport — Your campus. Your gym. Your people. The Gyms screen in a phone beside the headline.",
};

/* ─────────────────────────── THE TOP BAR ─────────────────────────── */

export const nav = {
  login: "Log in",
  /* Also the hero's primary button — the same door, twice. */
  cta: hero.primaryCta,
};

/* THE VIEWS — the tabs in the top bar, like a regular website's (owner,
   2026-08-18). "/" is the whole page in order; each tab shows ONE audience's
   part of it (the shared intro, that audience's story or console, the FAQ,
   the close) or one of the two short pages, and each has its own address so
   a coach can be sent a link that opens straight on the coach view — the
   varsity story says the app spreads through group chats.
   `/varsity` is the app's own varsity area (post-login), so the audience
   views live under `/for/…`. */
export type LandingView = "all" | "students" | "varsity" | "coaches" | "about" | "contact";
export const views: { view: LandingView; label: string; href: string; title: string }[] = [
  /* Home = the whole page, first in the row (owner, 2026-08-18). Its title
     is the page's own, so the link card on "/" is unchanged. */
  { view: "all", label: "Home", href: "/", title: social.title },
  { view: "students", label: "Students", href: "/for/students", title: "UNIsport for students" },
  { view: "varsity", label: "Varsity", href: "/for/varsity", title: "UNIsport for varsity athletes" },
  { view: "coaches", label: "Coaches", href: "/for/coaches", title: "UNIsport for coaches" },
  { view: "about", label: "About", href: "/about", title: "About UNIsport" },
  { view: "contact", label: "Contact", href: "/contact", title: "Contact UNIsport" },
];

/* At the foot of every tabbed view, above the footer: the way back to the
   whole page, for the visitor who came in on a link to one part. */
export const seeAll = {
  lead: "This is one part of the page.",
  cta: "See the whole page",
};

/* THE THREE DOORS under the hero — Student · Varsity athlete · Coach — the
   same three views as the tabs, so pressing "Coach" here or "Coaches" in the
   bar opens the same page (one mechanism, not two). Shown on "/" only: on a
   view you have already chosen. The one-liners reuse lines that already
   exist above/below. */
export const doors = [
  { label: "Student", sub: hero.kicker.lead, href: "/for/students" },
  { label: "Varsity athlete", sub: hero.kicker.tail, href: "/for/varsity" },
  { label: "Coach", sub: "For the person who runs the squad.", href: "/for/coaches" },
];

/* THE AVAILABILITY LINE — directly under the primary button, at a readable
   size (it used to be 11px in the faintest grey, under the doors, below the
   fold). "Live now at Harvard" moved up into the pill above the headline
   (hero.badge), so this is the second half of that sentence. */
export const availability = "New campuses are onboarded one at a time — colours, gyms and houses included.";

/* THE BRAND LINE — the slogan, set under the wordmark like "Škoda · Simply
   Clever" (the owner, 2026-08-30). A promise rather than a description: it
   goes under the logo, on the splash, in a store listing. Distinct from the
   hero headline above, which describes and only ever appears on this page.
   It is now the SAME sentence S7 closes the student story on, deliberately:
   the intro makes the promise, and seven screens later the story hands it
   back as something the reader has just watched happen. */
export const brandLine = "Never train alone again.";

/* ─────────────── BEFORE THE STUDENT STORY — a title card ─────────────── */

/*
  The owner, 2026-08-30: pressing "Student" used to land you on the hero again
  with the three doors deleted — "it just refreshes the page". And on "/" the
  student story began cold, on a phone screenshot labelled 01, while the
  varsity story got a whole screen of ceremony first (see `interlude`). The
  app's main audience had the coldest opening on the page.

  So the student story gets its own statement, the way varsity and the coach
  console already have one. It is deliberately a TITLE CARD, not a reveal:
  "Varsity Mode." works because it is a surprise, and the student app is the
  thing the visitor came for. On "/" it is one short band between the intro
  and the story; on /for/students it opens the page and carries the way in.

  The sub-line says what is about to happen — phone screens, in the order you
  would use them — so the first screenshot is introduced rather than sprung.
*/
export const studentIntro = {
  /* On "/" it follows the intro and is answered later by the interlude's
     "And if you train for the university itself —", so the two read as a
     sequence. On /for/students nothing comes before it. */
  leadIn: "First, for every student —",
  leadInSolo: "For every student —",
  headline: "The student",
  headlineEm: "app.",
  sub: "What it looks like on a phone, from finding a gym to logging the session with the person you found.",
  /* The way past the story for someone who wants the list rather than the
     walk (owner, 2026-08-30). It points AT the feature block beside Campus
     Colours rather than repeating it here — the overview exists once. */
  overview: { label: "Or see everything it does", href: "#campus-colours" },
};

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
  /* On the Varsity view (/for/varsity) nothing comes before it, so the "And"
     that joins it to the student story goes. Same line otherwise. */
  leadInSolo: "If you train for the university itself —",
  headline: "Varsity",
  headlineEm: "Mode.",
  sub: "The app your squad has been running out of a group chat.",
  /* Same door as the student card's: the varsity feature block beside Blade
     Lock, which is where the overview lives — once. */
  overview: { label: "Or see everything it does", href: "#blade-lock" },
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

  PARKED 2026-08-19, and not over the screenshot. Those numbers are read off
  11-varsity-teammate.webp, which is a dark-mode capture from the old shot day
  sitting in the light folder — but re-shooting it is the small problem. The
  screen itself is DEMO DATA: lib/varsity/teamTraining.ts and teamProfiles.ts
  derive a teammate's calendar, consistency, hours and personal bests from
  their id, because accounts aren't linked to the squad yet. Advertising it
  would put invented training on the landing page. The beat ships when a
  teammate's month comes from their real logged sessions; the capture rig
  (scripts/landing/capture-teammate.mjs) is written and waiting.
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

/* ─────────────── THE FEATURE LISTS beside each closer ───────────────

  Left of Campus Colours: what the student app does, one row per feature, a
  "+" opens the detail. Left of Blade Lock: the same for Varsity Mode. Every
  row names something the app does TODAY — checked against the code, the
  route or the capture named in the comment. DRAFT for the owner: these are
  the first written words for this block; the stories above say the same
  things in the owner's voice, and these rows keep to it.

  "What's coming" for students / varsity / coaches is NOT here on purpose:
  it is a roadmap, and only the owner knows it. Add a `coming` array to each
  block when the words exist and the page will show it.
*/

/** `icon` names one of the line icons in components/landing/FeatureIcon.tsx. */
export type FeatureRow = { icon: string; title: string; detail: string };

/** The button under a feature list — every door ends where it started, with
    its own way in (2026-08-18 review: the lists used to end in a hairline). */
export type FeatureCta = { label: string; href: string };

export const studentFeatures: { kicker: string; rows: FeatureRow[]; cta: FeatureCta } = {
  kicker: "The student app",
  cta: { label: hero.primaryCta, href: "/login" },
  rows: [
    {
      /* /gyms — hours, ratings, equipment lists, favourites, the crowd meter (lib/gymSocial.ts) */
      icon: "gym",
      title: "Every gym on campus, in one list.",
      detail: "Opening hours, ratings, the equipment in each room, and a live crowd meter — the main gyms and the house gyms nobody has a map of.",
    },
    {
      /* /match — ranked by compatibility; /people/[id] — the Why-you-match facts */
      icon: "partners",
      title: "Training partners, ranked by real fit.",
      detail: "Same gym, same hours, same level — plus interests, hometown, languages, and whether one of you wants a mentor. Every reason is a fact off both profiles.",
    },
    {
      /* messages/PlanCard.tsx — propose, accept, both calendars */
      icon: "chat",
      title: "Plan a session inside the chat.",
      detail: "One tap proposes it, one tap accepts, and it is on both your calendars.",
    },
    {
      /* the Log Session sheet (tall-logsheet capture): sets and reps, the partner carried over, photos and a note */
      icon: "log",
      title: "Log it together, set by set.",
      detail: "Every set and rep, the partner carried straight over from the plan, a photo and a note — the memory of the session, not just the numbers.",
    },
    {
      /* PlanCard's confirmation → verified session; lib/supabase/workouts.ts streakStats */
      icon: "verified",
      title: "Verified sessions and streaks.",
      detail: "You both confirm the session happened; verified days build your streak.",
    },
    {
      /* /leaderboards — lib/leaderboards.ts: campus, house, partners, year */
      icon: "leaderboard",
      title: "Leaderboards for the whole college.",
      detail: "See where you rank across campus, in your house, among your partners and your year.",
    },
    {
      /* /messages — the open channels (components/messages/ChannelThread.tsx) */
      icon: "channels",
      title: "Open campus channels.",
      detail: "Everyone at your school is already in — no followers, no requests.",
    },
  ],
};

export const varsityFeatures: { kicker: string; rows: FeatureRow[]; cta: FeatureCta } = {
  kicker: "Varsity Mode",
  cta: { label: hero.inviteCta, href: "/join" },
  rows: [
    {
      /* /varsity/home — the week the coach published (V1) */
      icon: "plan",
      title: "The training plan, always current.",
      detail: "Water, erg, weights — the week your coach actually built, on your phone the moment it is published. Not a screenshot of a spreadsheet.",
    },
    {
      /* /varsity/home lineup card (V2), coach lineups (coach step 4) */
      icon: "boat",
      title: "Your name, in the boat.",
      detail: "Lineups published by the coach, seat by seat, the night before — your seat lights up.",
    },
    {
      /* race countdown + coach's note on Home (V3, coach step 1 & 5) */
      icon: "race",
      title: "The next race, and the note to fix.",
      detail: "A countdown to the race the block points at, and your coach's one technical note, in front of you until it is fixed.",
    },
    {
      /* /varsity/log — Log per prescribed session, Scan C2/RP3, Add extra session (V4) */
      icon: "logplan",
      title: "Log straight off the plan.",
      detail: "Tap the prescribed session to log it, scan your Concept2 or RP3 monitor to read the numbers off it, or add an extra session.",
    },
    {
      /* /varsity/calendar (V5) and /varsity/profile (V6) */
      icon: "calendar",
      title: "Your season, on the calendar.",
      detail: "Every logged workout lands on the calendar by itself — your training history, with your consistency beside it.",
    },
    {
      /* /varsity/team — the squad's month (11-varsity-teammate capture) */
      icon: "squad",
      title: "How the squad is training.",
      detail: "Every teammate's month, and where yours sits next to it — without having to ask anyone.",
    },
    {
      /* /join — the invite; a captain's or coach's link unlocks the mode */
      icon: "lock",
      title: "Gated by your team.",
      detail: "Varsity Mode opens from a link your captain or coach sends. Nobody else sees it.",
    },
  ],
};

/* ─────────────────────────── FAQ ─────────────────────────── */

/* DRAFT for the owner. Every answer states only what the app does today.
   The .edu question is now CLOSED: signing up requires a university address
   (lib/universityEmail.ts), on the email form and through Google alike, so
   "sign up with their university email" below is true. Still OPEN: whether
   the app is free (the old page said "Free for students"; nobody has
   confirmed it). */
export const faqTitle = "Questions";
/* `on`: which tabbed views ask this question. "/" shows every question; a
   coach on /for/coaches is not asked "What does the app know about me?".
   Views: "students" | "varsity" | "coaches" — see `views` above. */
type FaqAudience = "students" | "varsity" | "coaches";
export const faq: { q: string; a: string; on: FaqAudience[] }[] = [
  {
    on: ["students", "varsity", "coaches"],
    q: "Which universities is it live at?",
    a: "Harvard, today. New campuses are onboarded one at a time — each with its own colours, gyms and houses — so the app you sign up to is already yours.",
  },
  {
    on: ["students", "varsity", "coaches"],
    q: "Who can join?",
    a: "Students at a live university sign up with their university email. Varsity athletes join through the link their captain or coach sends; coaches get the console with their team.",
  },
  {
    on: ["students", "varsity"],
    q: "What is Varsity Mode?",
    a: "A gated part of the same app for varsity teams: the coach's training plan, boat lineups, the race countdown and the coach's notes on the athlete's phone, plus logging straight off the plan. It opens from a team invite.",
  },
  {
    on: ["varsity", "coaches"],
    q: "What does a coach get?",
    a: "The Coach's Console: build a training block around a race, publish the week's sessions once to every athlete, publish lineups seat by seat, and leave one technical note per athlete.",
  },
  {
    on: ["students", "varsity"],
    q: "What does the app know about me?",
    a: "What you put in your profile — concentration, hometown, languages, interests, a bio — and the sessions you log. Matches are explained from those facts. The privacy policy has the full list.",
  },
  {
    on: ["students", "varsity", "coaches"],
    q: "Is it official?",
    a: "No. UNIsport is an independent app, officially unaffiliated with Harvard University.",
  },
];

/* ─────────────────────── ABOUT · CONTACT ─────────────────────── */

/* DRAFT for the owner. The contact address is the one already published on
   /privacy and /terms. */
export const about = {
  kicker: "About",
  headline: "Built at Harvard,",
  headlineEm: "for every campus.",
  body: "UNIsport started as the app one campus was missing: every gym in one place, the people worth training with, and the plan that gets you both there — then a mode for the squads that train for the university itself, and a console for the coaches who run them. One app per university, in that university's colours.",
  email: "martinhouska777@gmail.com",
  /* On "/" the About section is the paragraph above and this link; the full
     "why" lives on the About tab. */
  readWhy: "Read why we built it",
};

/* WHY WE BUILT IT — the About tab (owner, 2026-08-18: "the motivation part,
   why we did it"). DRAFT, written from the brief's positioning ("every fitness
   app treats you as one person alone with a log; on a campus, training is
   neither solitary nor unstructured") and from what the app does — NOT from
   the owner's own story, which only they can tell. Owner: rewrite freely,
   add a line about who you are if you want one; each entry is a paragraph.
   The brief's voice: plain, specific, no "journey", no invented numbers. */
export const aboutWhy = {
  kicker: "Why",
  headline: "Why we",
  headlineEm: "built it.",
  paragraphs: [
    "Every fitness app treats you as one person alone with a log. That is not what training on a campus is like. It happens in specific buildings — the main gym, the house gyms nobody has a map of — with specific people, on a schedule someone else often sets. The apps knew none of that. They knew your step count.",
    "So the people were the first problem. On a campus of thousands you walk past the ones who train at your hour, at your level, on your side of the river — and never meet them. Every match in UNIsport is explained from real facts off two profiles, so a training partner is a person you can trust, not a stranger from a feed.",
    "The teams were the second. Varsity squads were running a season out of a group chat: the coach's plan as a screenshot of a spreadsheet, the boat lineups as a photo, the race countdown in someone's head. We built Varsity Mode so all of it lands on every athlete's phone, and the Coach's Console so the coach publishes it once.",
    "And the campus itself was the third. One app cannot serve every university at once — the gyms are different, the houses are different, the colours are different. So it is one app per university, in that university's colours, built at Harvard first because that is where we were, and brought to the next campus one at a time.",
  ],
};

/* CONTACT — its own tab (owner, 2026-08-18): the address, and the places
   the app will be. The socials are DATA: a row renders as a link once it has
   an `href`; until then it shows as "coming soon", so an account that does
   not exist yet is never a dead link. Fill `href` in when the account is
   made (e.g. "https://instagram.com/<handle>"), and put the handle in
   `handle`. Delete a row to drop the platform. DRAFT for the owner. */
export type SocialLink = { name: string; handle: string; href: string | null; icon: "instagram" | "tiktok" | "x" };
export const contact = {
  kicker: "Contact",
  headline: "Say hello.",
  body: "A question, a campus that should be next, a team that wants in — write, or find us where the app is talked about.",
  emailLabel: "Email",
  socialsLabel: "Find us",
  comingSoon: "coming soon",
  socials: [
    { name: "Instagram", handle: "", href: null, icon: "instagram" },
    { name: "TikTok", handle: "", href: null, icon: "tiktok" },
    { name: "X", handle: "", href: null, icon: "x" },
  ] as SocialLink[],
};

/* ─────────────────────────── FOOTER ─────────────────────────── */

export const footer = {
  tagline: "Built at Harvard, for every campus",
  privacy: "Privacy",
  terms: "Terms",
  unaffiliated: "Officially unaffiliated with Harvard University",
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
  /* On the Coach view (/for/coaches) there is no varsity story above, so the
     two lines that lean on it change: the "And" goes, and "the varsity story
     above depends on" becomes what the athletes see. DRAFT for the owner. */
  leadInSolo: "For the person who runs the squad —",
  subSolo: [
    { text: "Students use the app. " },
    { text: "Coaches run it.", bold: true },
    {
      text: " From an empty season to a published lineup in five screens — the plan, the boats and the notes your athletes open on their phones, all built here. These are real screens from the console as it works today.",
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
  /* On the Coach view there is no story above to point back to. DRAFT. */
  bridgeSolo: "Everything the console publishes lands on the athletes' phones — the plan on their Home, their name in the boat, the note under their race.",
  bridgeSub:
    "A student who signs up brings one user. A coach who adopts brings the whole squad. That's why the console exists — and why it's already built.",

  facts: [
    { title: "1 plan → 40 phones", body: "Publish once; every athlete's Home updates itself." },
    { title: "Boats, the night before", body: "Lineups land on phones before anyone reaches the dock." },
    { title: "The spreadsheet, retired", body: "Plan, lineups and feedback live in one place, not a group chat." },
  ],

  /* The coach's own way in. There is no self-serve console yet — a coach gets
     it with their team, by asking — so this opens a mail with the subject
     already written. (2026-08-18 review: the section that the copy calls the
     biggest lever ended with nothing to click.) */
  cta: {
    lead: "Run a squad?",
    label: "Get the console for your team",
    mailSubject: "The Coach's Console for my team",
    mailBody: "Hi Martin,\n\nI coach ______ at ______ and I'd like to run the squad on UNIsport.\n\n",
  },
};

/* ─────────────────────────── THE CLOSE ─────────────────────────── */

export const finalCta = {
  headline: "One app per university.",
  headlineEm: "Yours next.",
  sub: "Live now at one university. New campuses are onboarded one at a time — colours, gyms and houses included.",
  button: "Bring it to your university",
  /* The button opens a mail with the subject and the first line written, so a
     tap on a phone is never a blank draft (it used to be a bare mailto:). */
  mailSubject: "Bring UNIsport to my university",
  mailBody: "Hi Martin,\n\nI'm at ______ and I'd like UNIsport on our campus.\n\n",
};

/** mailto: with the subject and body already filled in. */
export const mailtoHref = (subject: string, body: string) =>
  `mailto:${about.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

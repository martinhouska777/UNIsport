/*
  EVERY WORD ON THE LANDING PAGE — the single source of truth.

  Rule 7: content is data, never hardcoded in a component. This file is where
  landing copy gets decided and reviewed. It reads top-to-bottom in the order a
  visitor meets it, so the whole page can be read as prose without opening a
  single component.

  ── Beat numbering ────────────────────────────────────────────────────────
  The two scroll animations are numbered the way we talk about them:
    S1…S4  the student story  (people → plan → profile → gyms)
    V1…V5  the varsity story  (home → log → calendar → workouts → statistics)

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
  /** S1…S4 / V1…V5 — how we refer to this beat in conversation. */
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
  /** What this part of the app does, one row each: an icon (FeatureIcon), the
      feature's name and one short line explaining it. */
  points?: BeatPoint[];
};

/** One feature under a beat's sub-line. */
export type BeatPoint = { icon: string; title: string; text: string };

/* ─────────────────────────── THE HERO ─────────────────────────── */

export const hero = {
  /* The pill above the headline. It read "The universal college fitness
     platform" — a claim. Facts convert better than claims (2026-08-18), so it
     became "Live now at Harvard", and on 2026-09-01 it took the second fact
     with it: the app is FREE for students, and the page had never once said
     so. Free is the reader's first objection, answered in the first line they
     read.

     2026-09-06 — "live now at Harvard" TAKEN OUT, and it comes back. Nothing
     changed about the plan; the claim simply runs ahead of the facts while the
     only people inside are testers, and "live at X" is an advertising claim,
     not a mood. It goes back the day real Harvard students are using it
     (owner: "zatim smaz to live at harvard pak vratime"). The same sentence
     also lived in `social.description` and in the FAQ below, and in the pill
     baked into public/og.png by scripts/landing/make-og.mjs — all four moved
     together, so putting it back means putting it back in all four. */
  badge: "Free for students",
  /* The page headline. Describes the product, and lives only here. */
  headline: ["Your campus.", "Your gym.", "Your people."],
  /* FOUR ACTIONS, in the order the app is actually used: find a gym, match
     with someone, plan it, log it (S1 → S2 → S4 → S5). The owner, 2026-08-30:
     "dont just shout out random words, make it targeted to the user — like
     find … match … log … like actions."

     Rewritten 2026-09-01 into an offer-plus-reason line, and PUT BACK the same
     day: the owner read both and chose this one ("to se mi libi vic"). It is
     their line and it stays. For the record, the rejected alternative was:
       "Every gym on campus, and the people in them. Somebody trains at your
        hour, at your level, in your building — you have never met them."
     The pill above it now carries "free for students", which is what that pass
     was really for. */
  body: "Find every gym on campus. Match with students verified by their .edu email. Plan the session in the chat. Log it together.",
  primaryCta: "Get started with .edu",
  /* Where "Get started" goes. The sign-in page opens on LOG IN by default,
     which greeted every new student with "Welcome back" (website review,
     2026-09-10). "Get started" is a new-account promise, so every button that
     carries those words opens the page in its sign-up state; the bar's
     "Log in" link keeps the plain address. One value, used everywhere. */
  primaryHref: "/login?mode=signup",
  inviteNote: "Got a link from your team?",
  inviteCta: "Join with your invite",
  /* The way to the story behind the app, on the FIRST screen (owner,
     2026-09-04: "i want the link to be from the home screen because i think
     its important for students"). It points DOWN this page, not at /about,
     because the home page now carries the opening of the Why itself. The
     label is about.readWhy — one wording everywhere it appears. */
  whyHref: "#why",
};

/* ─────────────────── THE LINK CARD (title tag, OG, X) ─────────────────── */

/* What a pasted link shows before anyone taps it — the browser tab title,
   the card in a group chat. The image (public/og.png) is drawn by
   scripts/landing/make-og.mjs from the same headline and pill. */
export const social = {
  title: `UNIsport — ${hero.headline.join(" ")}`,
  description: "Find the gym. Find someone to go with. Free for students.",
  imageAlt: "UNIsport — Your campus. Your gym. Your people. The Gyms screen in a phone beside the headline.",
};

/* ─────────────────────────── THE TOP BAR ─────────────────────────── */

export const nav = {
  login: "Log in",
  /* Also the hero's primary button — the same door, twice. */
  cta: hero.primaryCta,
  /*
    WHAT THE BAR SAYS TO SOMEONE WHO IS ALREADY IN. Both doors are for people
    who are not: a signed-in visitor was being offered "Log in" and "Get
    started with .edu" on a page they had already come through (audit,
    2026-09-19). They get one button instead, and it goes to the app.
  */
  openApp: "Open the app",
  openAppHref: "/gyms",
  /* The phone menu button (opens the tabs from the left) and its close. */
  menu: "Menu",
  closeMenu: "Close menu",
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
/* `description`: the line under the title in a search result or a pasted
   link. Every view used to carry the home page's ("Find the gym. Find someone
   to go with. Free for students.") — under the Coaches page too (website
   review, 2026-09-10). One sentence each, saying what THAT page is, in the
   page's own words; the home page keeps social.description. DRAFT for the
   owner — review in a search result or a pasted link, not here. */
export const views: { view: LandingView; label: string; href: string; title: string; description: string }[] = [
  /* Home = the whole page, first in the row (owner, 2026-08-18). Its title
     is the page's own, so the link card on "/" is unchanged. */
  { view: "all", label: "Home", href: "/", title: social.title, description: social.description },
  {
    view: "students",
    label: "The app",
    href: "/for/students",
    title: "UNIsport — the app",
    description: "Every gym on campus, training partners matched by fit, sessions planned in the chat and logged together. Free for students.",
  },
  {
    view: "varsity",
    label: "Varsity Mode",
    href: "/for/varsity",
    title: "UNIsport — Varsity Mode",
    description: "Your coach's training plan, the lineups, the race countdown and their notes on your phone — and logging straight off the plan. For rowing, by team invite.",
  },
  {
    view: "coaches",
    label: "Coaches",
    href: "/for/coaches",
    title: "UNIsport — the Coach's Console",
    description: "Build a training block around a race, publish the week and the lineups to every athlete's phone, keep every result. For college rowing programs.",
  },
  {
    view: "about",
    label: "About",
    href: "/about",
    title: "About UNIsport",
    description: "Who built UNIsport and why: a Harvard heavyweight rower who kept arriving at the gym with nobody to train with.",
  },
  {
    view: "contact",
    label: "Contact",
    href: "/contact",
    title: "Contact UNIsport",
    description: "Write to bring UNIsport to your university or to use it for your team. All feedback and suggestions are welcome.",
  },
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
  /* The owner's own three lines, dictated 2026-09-01 and re-dictated
     2026-09-04. The student door now OPENS on the social side and names the
     match second, and the other two end on the thing that keeps a team there:
     the app shaped to your own college program, and statistics that do not
     disappear at the end of a season. Transcribed, grammar only. */
  { label: "Student", sub: "Sport is better with friends. Match with people who train like you and share your interests.", href: "/for/students" },
  { label: "Varsity athlete", sub: "Your training plan, lineups, statistics, workouts and much more, all in one app customized to your college program.", href: "/for/varsity" },
  { label: "Coach", sub: "Build plans and lineups easier than ever. Track your athletes and workouts with statistics that last forever.", href: "/for/coaches" },
];

/* THE AVAILABILITY LINE — directly under the primary button, at a readable
   size (it used to be 11px in the faintest grey, under the doors, below the
   fold). "Live now at Harvard" moved up into the pill above the headline
   (hero.badge), so this is the second half of that sentence. */
/* The owner's sentence, dictated 2026-09-02 — "tuhle vetu tam chci". It opens
   on what the app IS (customized per campus) instead of on how few campuses
   there are; "Yours can be next." is the half it has always ended on. The
   second "each" is dropped on their own instruction ("you can drop the middle
   each if its fine with english") — it is, and the line reads lighter without
   two of them in nine words. */
export const availability = "Customized for each campus, with its own gyms, houses and colours. Yours can be next.";

/* THE BRAND LINE — the slogan, set under the wordmark like "Škoda · Simply
   Clever" (the owner, 2026-08-30). A promise rather than a description: it
   goes under the logo, on the splash, in a store listing.

   THREE WORDS AGAIN, 2026-09-01. It had been lengthened to "Never train alone
   again." to match the line S7 closed the student story on, seven screens
   away. Then the card that opens the walk took that longer line — one screen
   below this one — and the same sentence twice in two screens reads as a
   stutter, not a motif. So the slogan goes back to three words and the page
   escalates instead: the mark states the rule, the card promises it to you,
   and the word that arrives in between is "again". */
export const brandLine = "Never train alone.";

/* ─────────────── BEFORE THE STUDENT STORY — a title card ─────────────── */

/*
  The owner, 2026-08-30: pressing "Student" used to land you on the hero again
  with the three doors deleted — "it just refreshes the page". And on "/" the
  student story began cold, on a phone screenshot labelled 01, while the
  varsity story got a whole screen of ceremony first (see `interlude`). The
  app's main audience had the coldest opening on the page. So it got a card.

  STRIPPED TO TWO LINES, 2026-09-01, the owner's call, in two steps.

  First the NAME went. "The student app." read as a separate product for
  students — "i dont want to distinguish students and varsity people, the
  varsity mode is just for the athletes". It is one app; Varsity Mode is a
  mode on top of it. So the card stopped naming a product and started making
  a promise: the owner asked for "never train alone again ze shora" — the
  line that used to sit unread at S7, lifted to where it is met first.

  Then the lead-in and the descriptive line went with it ("cutneme to
  ostatni"). The seven steps, the overview link and the "Scroll" cue went too
  — and came straight back the same day, because two lines on a full-height
  card leave it looking empty: "ale jinak se mi to libilo a to vyplni ten
  screen". So the card is the quote, one instruction, and the walk laid out
  underneath it. What it no longer does is name a product.

  Settled 2026-09-01: S7 no longer repeats it. The card makes the promise,
  the last beat reports the result ("Nobody trained alone.").
*/
/*
  ONE STEP ON A TITLE CARD — the number the reader will see on the beat, one
  word for it, and one of the line icons in components/landing/FeatureIcon.tsx.

  These MIRROR the beats below (S1…S4 / V1…V5) and have to be changed with
  them — the chip and its beat's kicker are now the SAME words, which is what
  mirroring was always meant to mean (2026-09-01: the kickers dropped their
  definite article, because "The why you match" cannot be written and a set
  where one label refuses the article should not carry it anywhere). They are written out rather than parsed off the beats' kickers so the
  card's words stay reviewable here, in one place, like the rest of the page.

  SEVEN CHIPS OVER FOUR CHAPTERS (owner, 2026-09-17: "now there are only four
  and it doesn't look good — I want there to be seven, just the single
  features"). A chip is no longer one chapter: it is one FEATURE, named with
  the same word the chapter's own point list uses, so the card reads as what
  the app does rather than as a table of contents. Several chips therefore
  open the same beat, which is what `to` is for — the BEAT INDEX this chip
  scrolls to, counted from nought in the story below. Without it a chip still
  links at its own position, which is only right while chips and beats match
  one for one. Wrong `to` = a chip that opens the wrong chapter, so re-order a
  beat and re-check every `to` here.
*/
export type OpeningStep = { n: string; icon: string; word: string; to?: number };

export const studentIntro = {
  /* Two lines and nothing else. The quote is the headline — it is the best
     sentence on the page and it used to be seven screens down. */
  headline: "Never train",
  headlineEm: "alone again.",
  /* "Scroll down to explore the app." used to be the sub here; it is the
     card's scroll cue now (`cues.student`, owner 2026-09-13). */
  /* The walk, laid out under the quote — the features, each jumping to the
     chapter it belongs to. It also fills a card that is two lines tall on a
     full-height section, and reads 4 + 4 from sm up.

     EIGHT, NOT SEVEN (owner, 2026-09-17: "instead of buddy board do log and
     calendar"). The Buddy Board came out and the two halves of keeping your
     own training went in, both on the Profile chapter, where the calendar and
     the logged sessions are. The varsity card's seven stand as they are.
       01–02 → Match (b0) · 03 → Plan (b1) · 04–07 → Profile (b2) · 08 → Gyms (b3) */
  steps: [
    { n: "01", icon: "partners", word: "Match", to: 0 },
    { n: "02", icon: "mentor", word: "Mentors", to: 0 },
    { n: "03", icon: "chat", word: "Plan", to: 1 },
    { n: "04", icon: "log", word: "Log", to: 2 },
    { n: "05", icon: "calendar", word: "Calendar", to: 2 },
    { n: "06", icon: "leaderboard", word: "Leaderboards", to: 2 },
    { n: "07", icon: "memories", word: "Memories", to: 2 },
    { n: "08", icon: "gym", word: "Gyms", to: 3 },
  ] as OpeningStep[],
  /* The way past the story for someone who wants the list rather than the
     walk. It points AT the feature block beside Campus Colours rather than
     repeating it here — the overview exists once. */
  overview: { label: "See every feature", href: "#campus-colours" },
};

/* ───────────────────── S1–S4 · THE STUDENT STORY ───────────────────── */

export const studentStory: Beat[] = [
  /*
    FOUR CHAPTERS, ONE APP SCREEN EACH (owner, 2026-09-15), same screens.

    RESTRUCTURED 2026-09-17 (owner, after a Hevy "Log workouts" example): the
    long paragraphs are gone. Each chapter is a short heading, one short line,
    then the FEATURES in it — an icon, the feature's name, one line on what it
    does — so a reader sees "Leaderboards", "Memories", "Calendar" instead of
    just "Profile". Four chapters stay four (owner: "the idea is to have four").
    Mentoring is the 4th point in Match. "Connect your calendar" is listed
    under Plan on the owner's word — it is NOT built yet, "we will build it
    immediately later".
  */
  {
    id: "S1",
    kicker: "01 · Match",
    head: "Find training partners. Make friends.",
    sub: "Browse sorts everyone by how well you fit with them, based on interests, concentration, experience and hours.",
    shot: "02-match.webp",
    ann: [],
    points: [
      { icon: "partners", title: "Browse", text: "Everyone sorted by how well you fit: interests, concentration, level and hours." },
      { icon: "clock", title: "Find by time", text: "Pick when you want to train and see who goes then." },
      { icon: "board", title: "Buddy Board", text: "Post your session and see who wants to join." },
      { icon: "mentor", title: "Mentors", text: "Get help from an experienced student or an upperclassman in your concentration." },
    ],
  },
  {
    id: "S2",
    kicker: "02 · Plan",
    head: "Plan sessions easily in the chat.",
    sub: "You send a card with the gym, the day and the time, and once the other one accepts it goes to both calendars.",
    shot: "04-plan-a-session.webp",
    ann: [],
    points: [
      { icon: "chat", title: "Plan card", text: "Send the gym, the day and the time." },
      { icon: "calendar", title: "Both calendars", text: "Once they accept, it goes into both of your calendars." },
      { icon: "link", title: "Your calendar", text: "Connect it to Google or Apple Calendar." },
    ],
  },
  {
    id: "S3",
    kicker: "03 · Profile",
    head: "Track your statistics. See how you do in the leaderboards.",
    sub: "Your profile counts the sessions you logged and the partners you trained with.",
    /* A plain phone screen, not a tall strip cut under Memories — "just how
       it is normally on phone screen so it looks realistic" (owner, 2026-09-16). */
    shot: "05-profile.webp",
    ann: [],
    points: [
      { icon: "leaderboard", title: "Leaderboards", text: "See how you, your house and your year rank on campus." },
      { icon: "calendar", title: "Calendar", text: "Every session you log marks its day." },
      { icon: "memories", title: "Memories", text: "Photos from your sessions, saved to come back to." },
    ],
  },
  {
    id: "S4",
    kicker: "04 · Gyms",
    head: "See every gym on your campus in one place.",
    sub: "Explore what equipment each gym has, its rating and how busy it is.",
    shot: "01-gyms.webp",
    ann: [],
    points: [
      { icon: "list", title: "Equipment", text: "See what each gym has." },
      { icon: "star", title: "Ratings", text: "Know which gyms students rate best." },
      { icon: "crowd", title: "How busy", text: "Check how full it is right now." },
    ],
  },
];

/* ─────────────── BETWEEN THE TWO — a full stop, then a reveal ─────────────── */

export const interlude = {
  leadIn: "And if you do sport for the university itself —",
  /* On the Varsity view (/for/varsity) nothing comes before it, so the "And"
     that joins it to the student story goes. Same line otherwise. */
  leadInSolo: "If you do sport for the university itself —",
  headline: "Varsity",
  headlineEm: "Mode.",
  /* THE REVEAL'S WORDS ARE THE OWNER'S, dictated over two messages on
     2026-09-02 — "and if you do sport for the university itself, designed
     specifically for each college sport, now available for rowing … this is
     how you write it", then the arrangement: the sentence, the sport under
     the sentence, the steps under that. They stand as given (only "available"
     is respelled), and are not to be improved on without being asked.

     What this line replaced, and why it is worth not writing back in: it said
     "The app your squad has been running out of a group chat", which called
     the mode an APP — the reading taken off the student card the day before
     ("the varsity mode is just for the athletes") — and "running out of" is
     read as "running low on" before it resolves. The group-chat idea was
     dropped, not moved (their call): the seven steps below already say what
     the mode replaces. */
  sub: "An extra mode for varsity athletes, designed specifically for each college sport.",
  /* THE SPORT, on its own line UNDER the sentence (the owner's arrangement —
     it was a pill above the lead-in for one commit). The reader needs it at
     exactly this point, because the next thing they meet is seven steps
     reading Lineups, Workouts, Coach's notes: a swimmer who scrolls into
     those without having been told has been misled by the page. Drawn as the
     hero's pill in gold, which is how this page marks a fact. */
  availability: "Now available for rowing",
  /* Seven now — the squad board joined on 2026-09-01. Renamed the same day to
     the owner's list — the labels now name the thing on the screen rather
     than a mood. "Boat" became "Lineups" (what the coach publishes), "Week"
     became "Log" (the beat is the logging list, not a week view), "Season"
     became "Statistics", and "Race" — which the owner was unsure about
     ("maybe focus, or technique or coaches notes") — became "Coach's notes",
     the half of that frame no other app can show. The countdown is still in
     the beat's own sub.

     "SQUAD BOARD" BECAME "WORKOUTS" on 2026-09-06 (the owner: "v6 u varsity
     bude workouts"). It is the name of the screen the beat is shot on — Team →
     Workouts — and the beat now says what you can read there rather than
     naming one board.

     THE ORDER HERE IS THE STORY'S ORDER, and it has to be kept by hand: each
     step links at `#story2-b<its position>`, so a step in the wrong place both
     prints the wrong number and opens the wrong beat. Moving the squad board
     ahead of the calendar (b54b2f5) left this list behind for a day — "05
     Calendar" was pointing at the board. Re-order a beat, re-order this. */
  /*  01–04 → Training plan (b0) · 05 → Log (b1) · 06 → Workouts (b2) ·
      07 → Statistics (b3) */
  steps: [
    { n: "01", icon: "plan", word: "Training plan", to: 0 },
    { n: "02", icon: "boat", word: "Lineups", to: 0 },
    { n: "03", icon: "chat", word: "Coach's notes", to: 0 },
    { n: "04", icon: "video", word: "Crew videos", to: 0 },
    { n: "05", icon: "logplan", word: "Log", to: 1 },
    { n: "06", icon: "leaderboard", word: "Workouts", to: 2 },
    { n: "07", icon: "trend", word: "Statistics", to: 3 },
  ] as OpeningStep[],
  /* Same door as the student card's: the varsity feature block beside Blade
     Lock, which is where the overview lives — once. */
  overview: { label: "See every feature", href: "#blade-lock" },
};

/* The scroll cues at the foot of the two title cards (owner, 2026-09-13:
   "not Keep going, but also scroll down to see something"). */
export const cues = {
  student: "Scroll down to explore the app.",
  varsity: "Scroll down to explore Varsity Mode.",
};

/* ───────────────────── V1–V7 · THE VARSITY STORY ───────────────────── */

/*
  ORDER (owner's call, 2026-09-01): plan · lineup · notes · log · WORKOUTS ·
  calendar · statistics. The workouts beat used to come last, after the two
  "your own season" beats; now the log beat hands straight over to the squad,
  and the calendar and the statistics — both of them your own training — close
  the story side by side.

  One open question on this story, raised and not yet decided:

  1. It ends on a statistics graph (V7), which the brief argues against by
     name: a stats screen is the one screen every fitness app already has,
     while a seat in a named boat, published by a coach, is the one none of
     them can show. That screen is V2, currently buried mid-story.

  (The second question — V6's headline being the one generic line in either
  story — is closed: the owner dictated both of its lines on 2026-09-06.)

  And one beat that is written but cannot be shot yet — the TEAMMATE beat (a
  different thing from V5's squad board, which ships):

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
  /*
    FIVE CHAPTERS, ONE APP SCREEN EACH (owner, 2026-09-15) — see the note on
    studentStory. The Home screen is deliberately one crowded chapter: the
    training plan, the lineup, the race countdown and the coach's note all sit
    on it, so the three old beats that panned it (V1, V2, V3) are now three
    sentences under one headline. Every line is carried over verbatim.

    Order: Home → Log → Calendar → Workouts → Statistics. Ends on the squad and
    the numbers, which is the door to "Join with your invite".

    Captures still to re-shoot for this structure: Home (to show the video
    strip), Log (its top is lighter now), Calendar (the coach's spreadsheet
    colours), and Statistics — the owner's screenshot is the full-screen
    "Metres rowed" graph, not the profile card the current capture shows.
  */
  {
    id: "V1",
    kicker: "01 · Training plan",
    /* 2026-09-17: the owner's OWN heading and first sentences as the summary
       ("use words that I used before, I don't want slop there"), then the
       features. The full old paragraph is in git history. */
    head: "Training plan always at hand.",
    sub: "Your training plan that updates in real time. Tap any day to see the full workout description.",
    shot: "tall-vhome.webp",
    ann: [],
    points: [
      { icon: "calendar", title: "Training calendar", text: "Today's sessions, updated in real time. Tap a day for the full workout." },
      { icon: "boat", title: "Lineups", text: "No more Excel sheet. Your name pops right in your boat." },
      { icon: "chat", title: "Coach's notes", text: "What to improve, straight from your coach." },
      { icon: "race", title: "Race countdown", text: "Always see how long until the next race." },
      { icon: "video", title: "Video storage", text: "Your crew videos, saved to Google Drive." },
    ],
  },
  {
    id: "V2",
    kicker: "02 · Log",
    /* The capture is the (+) log sheet risen over the Calendar tab. */
    /* 2026-09-17: the owner's OWN heading and first sentences as the summary
       ("use words that I used before, I don't want slop there"), then the
       features. The full old paragraph is in git history. */
    head: "Log a session in a few taps.",
    sub: "Log your workout straight from your training plan. Take a picture of your erg screen to extract your numbers instantly, or add extra workouts.",
    shot: "13-varsity-log-sheet.webp",
    ann: [],
    points: [
      { icon: "plan", title: "From the plan", text: "Log straight from your training plan." },
      { icon: "scan", title: "Scan the monitor", text: "Snap your C2 or RP3 screen and get the numbers instantly." },
      { icon: "logplan", title: "Extra sessions", text: "Add the workouts you did on your own." },
    ],
  },
  {
    id: "V4",
    kicker: "03 · Workouts",
    /* The capture is DRIVEN, not a URL: Team → Workouts → tap the 2k test.
       scripts/landing/capture-light.mjs --only=15-varsity-board re-shoots it. */
    /* 2026-09-17: the owner's OWN heading and first sentences as the summary
       ("use words that I used before, I don't want slop there"), then the
       features. The full old paragraph is in git history. */
    head: "Look at statistics for every team workout.",
    sub: "Compare to previous workouts and see how you improved from last time, and where you stand in the rankings, with filters for split, time, watts and watts per kilo.",
    shot: "15-varsity-board.webp",
    ann: [],
    points: [
      { icon: "leaderboard", title: "Team rankings", text: "See where you stand on every workout." },
      { icon: "filter", title: "Smart filters", text: "Sort by split, time, watts or watts per kilo." },
      { icon: "trend", title: "Your progress", text: "Compare to last time and see how you improved." },
    ],
  },
  {
    id: "V5",
    kicker: "04 · Statistics",
    /* 2026-09-17: the owner's OWN heading and first sentences as the summary
       ("use words that I used before, I don't want slop there"), then the
       features. The full old paragraph is in git history. */
    head: "See your statistics.",
    sub: "One screen counts your metres rowed, your hours and your consistency over eight weeks, with a graph for each.",
    shot: "16-varsity-stats.webp",
    ann: [],
    points: [
      { icon: "boat", title: "Distance", text: "Every metre you rowed." },
      { icon: "clock", title: "Time", text: "The hours you trained." },
      { icon: "log", title: "Consistency", text: "How closely you followed the plan." },
    ],
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
  /* REWRITTEN BY THE OWNER, 2026-09-04: "discard the sentence above your
     campus your colors, and write under it: the app is customized to your
     university gyms and colours, bring it to yours next — and make it a
     different colour so u can tap it and it will go to write an email to me".

     - THE LEAD-IN IS GONE, like Blade Lock's: no hanging dash over the block,
       the headline opens the piece. Kept as "" rather than deleted so the two
       closers keep the same shape; CampusColours skips the line when empty.
     - The old sub is replaced, not extended. It said the same thing about the
       colours in more words, and it ended on "Yours next." — which is now the
       thing you press.
     - "Bring it to yours next." is the CTA: the school's own colour, and it
       opens a mail to the owner, the same door the Coach's Console offers a
       coach. The student closer had nothing to press before this. */
  campus: {
    leadIn: "",
    headline: "Your campus,",
    headlineEm: "your colours.",
    sub: "The app is customized to your university, gyms and colours.",
    cta: "Bring it to yours next.",
    /* NOT a mailto (the owner, 2026-09-04: "i want when u click it to take you
       somewhere to send an email, not straight email"). A mailto throws the
       visitor at whatever mail app the machine has, or at nothing; this lands
       them on Contact, where the address and the socials are. */
    ctaHref: "/contact",
  },
  /* REWRITTEN BY THE OWNER, 2026-09-02: "Your crew, your blade. your colors
     instead of every crew one system on top and dont do the thing with the
     dash on top. then as text every program gets their screen customized to
     their own colors".

     Three things went with it:
     - "One system." is gone. The page spent commits taking the word *app* off
       Varsity Mode (it is a MODE for the athletes, not a second product), and
       "system" was the same reading in enterprise clothing.
     - THE LEAD-IN IS GONE, not reworded — no hanging dash over this block. It
       is the one place on the page that had one and did not need it; the
       headline opens the piece on its own now. Kept as "" rather than deleted
       so CampusColours' shape is untouched; BladeLock skips the line when it
       is empty.
     - "Built for Harvard rowing." went with the old sub and is NOT replaced
       here. The same fact is stated in the hero pill, in the FAQ ("Which
       universities is it live at?") and in the About story, so the block is
       not the only place a reader could learn it.

     Written with "colours", the page's own spelling everywhere else. */
  blades: {
    leadIn: "",
    headline: "Your crew, your blade,",
    headlineEm: "your colours.",
    sub: "Every program gets their screen customized to their own colours.",
    /* Under the phone: "HARVARD ROWING", "YALE ROWING", … */
    label: "Rowing",
  },
};

/* ─────────────── THE FEATURE LISTS beside each closer ───────────────

  Left of Campus Colours: what the student app does, one row per feature, a
  "+" opens the detail. Left of Blade Lock: the same for Varsity Mode. Every
  row names something the app does TODAY — checked against the code, the
  route or the capture named in the comment. Rewritten 2026-09-03 into the
  voice settled on the stories above: a short, verb-led title that speaks to
  the reader, one factual sub-line. DRAFT for the owner — review in the
  browser, not here.

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
  kicker: "The app",
  cta: { label: hero.primaryCta, href: hero.primaryHref },
  rows: [
    {
      /* /gyms — hours, ratings, equipment lists, favourites, the crowd meter (lib/gymSocial.ts) */
      icon: "gym",
      title: "Overview of all gyms on campus.",
      detail: "See the opening hours, equipment, rating and how busy it usually is, including the house gyms. Or find a partner who trains directly at your gym.",
    },
    {
      /* /match — ranked by compatibility; /people/[id] — the Why-you-match facts */
      icon: "partners",
      title: "Find your ideal training partner.",
      detail: "Get matched with people based on your interests, hobbies, concentrations, level, language, hometown or much more.",
    },
    {
      /* onboarding.ts peerAdvising (mentorFreshmen/beMentored, matched on concentration)
         + gymMentorship (helpOthers/getHelp, gym form & programming) — two real
         toggles, one row. New 2026-09-03, owner-dictated. */
      icon: "mentor",
      title: "New to the gym or campus?",
      /* REWORDED with the owner's go-ahead (2026-09-11; website review). The
         dictated line changed subject halfway ("the app has … or get matched")
         and "has a feature of mentoring" is how a developer talks. Same two
         offers — a gym mentor, an upperclassman in your concentration — in
         the page's voice. The old line, for the record: "Newcomers start
         easily. The app has a feature of mentoring in the gym by more advanced
         people who are interested in helping out, or get matched with an
         upperclassman with a similar concentration to mentor you." */
      detail: "Start with someone beside you. Get paired with an experienced student who has offered to help in the gym, or with an upperclassman in your concentration who can show you the ropes.",
    },
    {
      /* messages/PlanCard.tsx — propose, accept, both calendars */
      icon: "chat",
      title: "Plan a session easily in the chat.",
      detail: "Simply tap the calendar button in the chat and set up a time. Once the other accepts it, it will go into both of your calendars.",
    },
    {
      /* the Log Session sheet (LogSessionSheet.tsx): pick an exercise, record sets/reps/weight per set */
      icon: "log",
      title: "Log the session without leaving the app.",
      detail: "Pick the exercises and record the sets, reps and weight. No separate app needed.",
    },
    {
      /* components/profile/MemoriesStrip.tsx, MemoryViewer.tsx — photo attached to a logged session */
      icon: "memories",
      title: "Build memories.",
      detail: "Take a picture with your training partner while you log the workout, and it goes straight to Memories that you can always come back to.",
    },
    {
      /* /leaderboards — lib/leaderboards.ts: campus, house, partners, house/year group boards */
      icon: "leaderboard",
      title: "Leaderboards.",
      detail: "Your profile counts every session you logged and the people you met. Take part in your college leaderboards and see where you rank on campus, how your house or year is doing compared to others, and who has made the most friends.",
    },
    {
      /* /messages — the open channels (components/messages/ChannelThread.tsx); real seeded
         channels in db/messages.sql: general, form & programming, nutrition, wins & PRs, running */
      icon: "channels",
      title: "Community channels.",
      /* "etc." was the one abbreviation on the page (website review, 2026-09-10). */
      detail: "Take part in community channels and get advice from your peers on nutrition, form, personal bests and more.",
    },
  ],
};

export const varsityFeatures: { kicker: string; rows: FeatureRow[]; cta: FeatureCta } = {
  kicker: "Varsity Mode",
  cta: { label: hero.inviteCta, href: "/join" },
  rows: [
    {
      /* /varsity/home — the week the coach published (V1), plus the month
         overview in lib/varsity/athleteHome.ts. Owner-dictated 2026-09-03;
         "week tab" confirmed by the owner over "week menu". */
      icon: "plan",
      title: "Training plan.",
      detail: "View what training plan your coach posted in the week tab. Expand to see the whole month or tap any day to see the full description and lineups.",
    },
    {
      /* /varsity/home lineup card (V2), coach lineups (coach step 4).
         Owner-dictated 2026-09-03. */
      icon: "boat",
      title: "Lineups.",
      detail: "Your coach sets the lineups and publishes them. Your name is highlighted in the boat you are sitting in, so you will never have to search for it again.",
    },
    {
      /* race countdown + the coach's note on Home (V3, coach step 1 & 5).
         Owner-dictated 2026-09-03. */
      icon: "race",
      /* Grammar only (website review, 2026-09-10): the articles, and "in front
         of your eyes" → "in front of you". The sense is the owner's. */
      title: "Countdown to the next race, and your coach's note.",
      detail: "Keep your focus up: your next race and your coach's note on what to fix are always in front of you.",
    },
    {
      /* /varsity/log — one tap per prescribed session, "Add extra session", and
         the Scan C2 / RP3 button. Owner-dictated 2026-09-03: the owner chose to
         claim the photo read even though LogScreen's scan button is still a
         PLACEHOLDER. Ship the feature before this line goes live. */
      icon: "logplan",
      title: "Log workouts straight from the plan.",
      detail: "Tap a workout from the plan to log it instantly. Take a photo of your C2 or RP3 to instantly extract the numbers, or add extra sessions.",
    },
    {
      /* /varsity/calendar (V5) — own logs, month grid, per-day detail, month
         totals + the consistency figure. Owner-dictated 2026-09-03;
         "week/month" is their own wording, left as given. */
      icon: "calendar",
      title: "Calendar.",
      detail: "Every workout you log goes straight to the calendar. Tap any day to look at your workouts or see the statistics for your week/month alongside your consistency.",
    },
    {
      /* /varsity/team → Workouts tab (TeamWorkouts + BoardTable): every team
         result with Split / Watts / W/kg columns and the change since last time
         (Delta.tsx). Owner-dictated 2026-09-03. */
      icon: "leaderboard",
      title: "Statistics and leaderboards.",
      detail: "Every workout you did is saved in the workouts tab. Tap to see how much you have improved from last time and where you rank compared to others, with filters for split time, watts and watts per kilo.",
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
    /* Was "Which universities is it live at?" / "Harvard, today." — the same
       live-at-Harvard claim as the pill, so it came out with it (2026-09-06)
       and goes back with it. The second sentence is untouched. */
    q: "Which universities is it for?",
    a: "Harvard first. New campuses come on one at a time, each with its own colours, gyms and houses, so the app you sign up to is already yours.",
  },
  {
    on: ["students", "varsity", "coaches"],
    q: "Who can join?",
    a: "Students at a live university sign up with their university email. Varsity athletes join through the link their captain or coach sends; coaches get the console with their team.",
  },
  {
    on: ["students", "varsity", "coaches"],
    /* The pill above the headline says "Free for students" and the FAQ never
       confirmed it (website review, 2026-09-10). Says what the page already
       claims, in a full sentence, and no more: the varsity and coach halves
       state how those doors OPEN, not what they cost — the owner has not
       said. DRAFT for the owner. */
    q: "Is it free?",
    a: "Yes, for students. Varsity Mode opens from your team's invite; for the Coach's Console, write to me.",
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
    a: "Your profile holds your concentration, hometown, languages, interests and a bio, and the app stores the sessions you log. Matches are explained from those facts. The privacy policy has the full list.",
  },
  {
    on: ["students", "varsity", "coaches"],
    q: "Is it official?",
    a: "No. UNIsport is an independent app, officially unaffiliated with Harvard University.",
  },
];

/* ─────────────────────── ABOUT · CONTACT ─────────────────────── */

/* The owner's own words (owner, 2026-09-03), transcribed as dictated with
   grammar corrected and nothing rephrased. The contact address is the one
   already published on /privacy and /terms. */
export const about = {
  kicker: "About",
  /* The old "Built at Harvard, for every campus." headline sat above a
     product paragraph; the paragraph is personal now, so the headline
     introduces the person instead (the owner's own wording, 2026-09-03).
     That line still closes the page, in footer.tagline. */
  headline: "Who's",
  headlineEm: "behind this.",
  body: "My name is Martin Houska. I am a rower from the Czech Republic, currently rowing for the Harvard heavyweight team.",
  email: "martinhouska777@gmail.com",
  /* On "/" the About section is the paragraph above and this link; the full
     "why" lives on the About tab. */
  readWhy: "Read why I built it",
  /* On "/" the Why is already open and titled, so the link that continues it
     cannot repeat its own heading back at the reader — it says what is on the
     other side of it instead. readWhy is still the wording everywhere the Why
     is somewhere ELSE: the hero, Contact, the bar. */
  readRest: "Read the rest",
};

/* WHY I BUILT IT — the About tab. The owner dictated this in full (owner,
   2026-09-03); it is transcribed word for word with grammar corrected only.
   Do NOT rephrase it — it is their story, in their voice. */
export const aboutWhy = {
  kicker: "Why",
  headline: "Why I",
  headlineEm: "built it.",
  /* HOW MANY OF THEM THE HOME PAGE CARRIES (owner, 2026-09-04: "in about
     and part on the bottom"). The rest wait on /about, behind about.readWhy.
     The first one is the one that does the work for a student: it is the
     situation they are in, before it is anybody's product. */
  onHome: 1,
  paragraphs: [
    "I often found myself in a situation where I didn't have somebody to go work out with. Then I arrived at a gym and met people there, asked for advice, and so on. And I knew many people are like me, or are trying to start in the gym but don't know how, and that there are many people like me who would love to help them out and teach from their experience.",
    "This app's mission is to make working out more sociable and fun, with features like leaderboards or memories, as well as accessible, with features like mentoring newcomers or the gym overview.",
    "By creating a match system based on interests, hobbies, concentration, languages, hometowns, experience level and much more that are not accessible anywhere else, I hope students will find not only somebody to train with, but also make great friendships or establish contacts for the future.",
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
  /* HEADLINE: still the draft "Say hello." — the owner asked for five
     alternatives on 2026-09-04 and is choosing one. Swap this line, nothing
     else. */
  headline: "Say hello.",
  /* THE OWNER'S OWN WORDS, dictated 2026-09-04, grammar only: "every feedback
     and suggestion is appreciated, write me if you are interested to bring it
     to your university, or use it for your team". ("Every feedback" -> "All
     feedback and suggestions", since feedback does not take a plural; and
     "interested to bring" -> "interested in bringing".) It also moves the page
     from "us" to "me" here, which is the voice About and Why already use. */
  body: "All feedback and suggestions are appreciated. Write me if you are interested in bringing it to your university, or in using it for your team.",
  /* The owner, same day: the Why matters to students, so it gets a link here
     as well as in the bar. The label is about.readWhy, so there is one wording
     for this link everywhere it appears. */
  whyHref: "/about#why",
  emailLabel: "Email",
  socialsLabel: "Find us",
  comingSoon: "coming soon",
  /* EMPTY until an account exists (website review, 2026-09-10): three chips
     reading COMING SOON on a marketing page said "not finished", three times.
     The rows are data — add one back the day the account is real, e.g.
       { name: "Instagram", handle: "@unisportcampus", href: "https://instagram.com/unisportcampus", icon: "instagram" }
     and the "Find us" row draws itself again. */
  socials: [] as SocialLink[],
};

/* ───────────────────────── PAGE NOT FOUND ───────────────────────── */

/* A mistyped or outdated link used to land on Next.js's own white "404 —
   This page could not be found." with no wordmark and no way back (website
   review, 2026-09-10). This is what app/not-found.tsx says instead. Neutral
   brand only: a stranger can arrive here before signing in. DRAFT for the
   owner. */
export const notFound = {
  kicker: "404",
  headline: "This page isn’t here.",
  sub: "The link may be old, or mistyped. Everything the app does is one tap away.",
  cta: "Back to the home page",
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
  /** The headline, which carries the number in front of it. The one-word gold
      label that used to stand above it ("2 · PLAN") is GONE — the owner,
      2026-09-05: "cut the '2 · Plan' and just name it with the headline, like
      '2 · Create workout plans easily'". One line per step, not two. */
  head: string;
  body: Segment[];
  shot: string;
  /** Read aloud by screen readers, so it describes the screen, not the file. */
  alt: string;
};

export const coach = {
  /* REWRITTEN 2026-09-03 in the owner's voice, on their instruction ("read the
     text up to the coaches console and copy that tone"). The section had been
     written in a different register from the rest of the page — "not shouted
     across the dock", "Forty athletes, one glance, no noise", "The spreadsheet,
     retired" — while the two stories and both feature lists had settled into
     the owner's own: verbs and explaining sentences, second person, short
     declaratives, no dashes and no noun-list-plus-appositive. Their words in
     the varsity story are the model, right down to the shape of "Never look
     through 40 names in an Excel sheet again."

     Nothing here claims anything new: every step is the same screen, saying
     the same thing in the page's settled voice. */
  badge: "UNIsport · for coaches & athletic departments",
  /* NO LEAD-IN. It used to mirror the interlude's ("And if you are the one who
     runs the squad —"); the owner cut it on 2026-09-05. The badge already says
     who the section is for, and the headline says it again. */
  headline: "The Coach's",
  headlineEm: "Console.",
  /* THE INTRO AND ALL SIX STEPS ARE THE OWNER'S, DICTATED 2026-09-03.
     Transcribed with grammar corrected, not rephrased. Two of their asks were
     answered rather than transcribed, because they asked for them to be:
       • "pick a name for it" (the plan building, the statistics, etc.) →
         RUNNING A SEASON, which is what the console does end to end.
       • "nevím jak to nazvat" (the thing you tap in the session editor) →
         the workout TYPE, which is that field's own label in
         TrainingPlanScreen.tsx (Water / Erg / Weights / Off / Flex).
     The old step 3, "Publish the week once.", is GONE — the owner's call
     ("publish it je zbytečné"); publishing is a sentence inside the lineup
     step now, where they put it. Step 5 (Workouts + telemetry) is new copy
     written to their brief ("zkus zkopírovat můj tón a vymyslet popisek") and
     checked against TeamWorkouts.tsx / TelemetryOuting.tsx. */
  sub: [
    { text: "UNIsport Varsity Mode is designed to make " },
    { text: "running a season", bold: true },
    {
      text: " as efficient and friendly as possible for a college rowing program. The plan, the lineups, the videos and the numbers all live in one console, and the app is customizable to fit your program perfectly. Everything the athletes just scrolled through is built here, on real screens from the console as it works today.",
    },
  ] as Segment[],
  /* On the Coach view (/for/coaches) there is no varsity story above, so the
     line that leans on it changes: the athletes become yours rather than the
     ones the reader has just watched. (There was a `leadInSolo` here too, the
     lead-in without its "And"; it went with the lead-in.) */
  subSolo: [
    { text: "UNIsport Varsity Mode is designed to make " },
    { text: "running a season", bold: true },
    {
      text: " as efficient and friendly as possible for a college rowing program. The plan, the lineups, the videos and the numbers all live in one console, and the app is customizable to fit your program perfectly. Everything your athletes open on their phones is built here, on real screens from the console as it works today.",
    },
  ] as Segment[],

  /* THE WAY INTO THE SIX SCREENS.

     It was first a heading and a sentence standing between the opener and the
     phones — "How it works." + "Six screens from the console, in the order a
     season is run." — from the owner's "give it a section name too"
     (2026-09-05). Looked at on a phone the same day, they wanted it the way
     the VARSITY intro already does it instead: the name is a link on the
     opening screen and then you just scroll and see. So the heading block and
     its sentence are gone, and this is the same outlined pill the interlude
     wears (see interlude.overview). The section itself stays static — no
     scroll choreography here; the owner asked for the link, not the film. */
  /* `href` on the Coaches page, where the six screens are right below.
     `teaserHref` on "/", where the section is its opener alone since
     2026-09-11 (the owner: the home page says "The Coach's Console" and "See
     how it works", and that takes you to the coaches' page — "další telefony
     jsou zbytečné"). Same words on both; only where the arrow points differs. */
  overview: { label: "See how it works", href: "#coach-steps", teaserHref: "/for/coaches" },

  steps: [
    {
      n: "1",
      head: "Set up your training blocks.",
      body: [
        { text: "Name the block, set the dates and add " },
        { text: "the race or event it is leading to", bold: true },
        { text: ". The app works out the weeks and starts the countdown your athletes will see." },
      ],
      shot: "coach-1-create.webp",
      alt: "The new training block form: block name, from and to dates, and an optional goal race with its date",
    },
    {
      n: "2",
      /* The owner's own wording for this one, 2026-09-05. */
      head: "Create workout plans easily.",
      body: [
        { text: "Tap a day's AM or PM session to fill it in. Pick the workout type, choose the intensity, and choose from your most used workouts or write your own. For repeating workouts like lifts or off days choose " },
        { text: "repeat every week", bold: true },
        { text: ", and the plan is set for weeks ahead." },
      ],
      shot: "coach-2-build.webp",
      alt: "The session editor: the workout type row, the intensity pickers, the five most-used workouts as tap-to-fill chips, and the repeat-weekly switch",
    },
    {
      n: "3",
      /* The owner's own title for this one, 2026-09-05. */
      head: "Build lineups.",
      body: [
        { text: "Tap a session from the plan to create the lineup for that day. Choose your people from the pool, where everyone carries their side, port, starboard or both, and anyone injured or sick is marked unavailable. " },
        /* The owner, 2026-09-05: end on the publishing, and cut the line after
           it ("Never shout it across the dock again."). */
        { text: "Publish it and the lineup is on every athlete's phone.", bold: true },
      ],
      /* RE-SHOT 2026-09-17 (owner: "i dont like how the lineups are portrayed
         there"). The frame that shipped with the last coach shoot was not a
         lineup at all — the console's Lineup tab bounces to Plan while the
         console tour is walking, so the script photographed the training-block
         list under a step titled "Build lineups". The tour is skipped first
         now, and this is the boat itself: the Hosea eight, seat by seat.

         NO PUBLISH BAR IN EITHER FRAME (owner 2026-09-17: "smaz to live to je
         strasne velke"). The screen's own "Live · Your squad can see this
         lineup · Unpublish" panel floats over the bottom third and, with the
         fixed "Saved" line above it, left barely half a boat in shot. It is
         hidden for the shoot, so the whole eight fits — bow to cox. */
      shot: "coach-4-lineup.webp",
      alt: "The Lineup screen: the Hosea eight seated bow to stroke with the cox at the end, every seat tagged port, starboard or both",
    },
    {
      n: "4",
      /* DICTATED BY THE OWNER 2026-09-05, transcribed with grammar corrected
         and not rephrased. It replaces "Put the footage on the boat." and the
         old body, which named the parts of the title instead of the two things
         a coach actually does: connect the drive once, then tap a boat.

         IT SAYS JUST "YOUR DRIVE", DELIBERATELY. It was dictated as OneDrive;
         what is built and working today is GOOGLE Drive. Asked which, the
         owner's answer (2026-09-05) was neither: "Google Drive or video
         storage, I don't know what other teams may have, we'll just write
         drive." So the page names no vendor — a team reads its own. */
      head: "Upload footage of the boat.",
      body: [
        { text: "Connect to your drive where you store your rowing footage. Then tap a boat to upload a video from the session. " },
        { text: "It automatically renames itself according to the lineup and saves into the right date", bold: true },
        { text: ", so your athletes know right away which piece they are watching." },
      ],
      /* ITS OWN FRAME since 2026-09-11 (website review: this step wore step
         3's picture, so a coach reading six numbered screens saw five).

         IT STOPS AT THE OARS, on the owner's instruction 2026-09-17 ("chci aby
         to tam bylo videt jen po oars … ze oars budou uplne dole"). The frame
         walked back in three steps that day: it was shot with the video strip
         OPEN on "Connect Drive" — an empty label field and a sign-in line
         where the crew should be — then shut to its one "Video" row, and now
         cut above that row entirely. What is left is the boat: seven seats and
         the cox, the hull's stroke cap, the boat's name and its oars, resting
         on the bottom edge. The step's words carry the upload; the picture
         carries what a video gets attached TO. Shot from production as the
         demo coach, light and dark, publish bar hidden (see step 3). */
      shot: "coach-4-video.webp",
      alt: "The foot of the boat's card on the Lineup screen: the crew from 2 seat down to the cox, then the boat's name and the oars it is rigged with",
    },
    {
      n: "5",
      /* DICTATED BY THE OWNER 2026-09-05, transcribed with grammar corrected
         and not rephrased. It replaces "Every number the squad puts up, in one
         list." and a body that spent half its length on water telemetry.

         Checked against what is built: the flag really is ranked-or-average
         (BoardKind in lib/varsity/coachPlan.ts), and "the squad average" is
         that second board's own words. */
      head: "Keep track of your statistics and workouts.",
      body: [
        { text: "Flag a session as a ranked/team workout, and after each athlete logs it, " },
        { text: "it shows itself as a list with rankings and filters", bold: true },
        { text: ", ranked by split, time, watts or watts per kilo. Also look at the squad average and compare to previous workouts." },
      ],
      /* ITS OWN COACH FRAME since 2026-09-17 (owner: reshoot the coach
         screenshots). It used to borrow 15-varsity-board.webp — the right
         screen, but the ATHLETE's frame, shared with the varsity story. This
         is the console's own Workouts tab: every session the squad has been
         set, each with how many have logged it. */
      shot: "coach-6-workouts.webp",
      alt: "The console's Workouts tab: every team workout with the date, the session and how many of the squad have logged it",
    },
    {
      n: "6",
      head: "Keep the athletes on track.",
      body: [
        { text: "Write a note to an athlete on where their technical focus should be. It sits on their Home under the race countdown, so they " },
        { text: "always have it in front of their eyes", bold: true },
        { text: " and stay focused at all times. Everyone else sees a green “Good job”." },
      ],
      /* The notes screen stopped being a screen of its own: a note is the
         pencil in each row of the TEAM tab (2026-09-17), so the picture is
         the squad list the coach writes them from. */
      shot: "coach-5-notes.webp",
      alt: "The Team tab: the whole squad with each rower's side, where the coach taps a row to write that athlete's technical note",
    },
  ] as CoachStep[],

  /* THE FOOT OF THE SECTION, ON THE OWNER'S INSTRUCTION 2026-09-04: "cut the
     bottom part from coaches console, after the last screen we should put
     there some summary and then the bring it to your team".

     What was cut: the bridge line (plus its solo variant), the "one coach
     brings the whole squad" line, and the three fact cards. Three blocks of
     restatement stood between the last screen and the only button — the
     bridge said again what the steps had just shown, and the facts said it a
     third time in a grid.

     What replaced them: ONE summary, then the door. The summary walks the six
     steps in their own order (blocks, plan, lineups, videos, statistics,
     notes) and ends where the coach door on the front page now ends — the
     numbers staying with the program. Written by me to the owner's brief
     ("some summary"), not dictated, so it is theirs to correct. */
  summary: "One console for the whole season.",
  summarySub:
    "You build the block, publish the week, set the lineups, upload the videos, read the statistics and leave your notes. Everything you publish lands on your athletes' phones, and the numbers stay with the program.",

  /* The coach's own way in. There is no self-serve console yet — a coach gets
     it with their team, by asking — so this opens a mail with the subject
     already written. (2026-08-18 review: the section that the copy calls the
     biggest lever ended with nothing to click.) The label is the owner's own
     2026-09-04 phrase, the coach's half of "Bring it to yours next." on the
     student closer. */
  cta: {
    label: "Bring it to your team",
    mailSubject: "The Coach's Console for my team",
    mailBody: "Hi Martin,\n\nI coach ______ at ______ and I'd like to run the squad on UNIsport.\n\n",
  },
};

/* ─────────────────────────── THE CLOSE ───────────────────────────

  THERE IS NO CLOSING CALL TO ACTION ANY MORE. It read:

      One app per university. Yours next.
      Customized for each campus — its own colours, gyms and houses — and
      onboarded one at a time.
      [ Bring it to your university ]

  Cut on 2026-09-02, the owner's call and their reasoning: "now for launch we
  will do it probably just for harvard anyway". A button asking a reader to
  bring the app to their university is a door that cannot be opened at launch,
  and it was also the second place on the page opening on "Customized for each
  campus" — the hero's availability line has that sentence now.

  If a launch ever reaches a second campus, it is one revert away: the section,
  its copy and components/landing/FinalCta.tsx all came out in one commit.
  Until then the page ends on About · Contact, and Contact is where a reader
  who wants it on their campus lands. */

/** mailto: with the subject and body already filled in. */
export const mailtoHref = (subject: string, body: string) =>
  `mailto:${about.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

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
     platform" — a claim. Facts convert better than claims (2026-08-18), so it
     became "Live now at Harvard", and on 2026-09-01 it took the second fact
     with it: the app is FREE for students, and the page had never once said
     so. Free is the reader's first objection, answered in the first line they
     read. */
  badge: "Free for students · live now at Harvard",
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
  description: "Find the gym. Find someone to go with. Free for students, live at Harvard.",
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
  { view: "students", label: "The app", href: "/for/students", title: "UNIsport — the app" },
  { view: "varsity", label: "Varsity Mode", href: "/for/varsity", title: "UNIsport — Varsity Mode" },
  { view: "coaches", label: "Coaches", href: "/for/coaches", title: "UNIsport — the Coach's Console" },
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

  These MIRROR the beats below (S1…S7 / V1…V6) and have to be changed with
  them — the chip and its beat's kicker are now the SAME words, which is what
  mirroring was always meant to mean (2026-09-01: the kickers dropped their
  definite article, because "The why you match" cannot be written and a set
  where one label refuses the article should not carry it anywhere). They are written out rather than parsed off the beats' kickers so the
  card's words stay reviewable here, in one place, like the rest of the page.
*/
export type OpeningStep = { n: string; icon: string; word: string };

export const studentIntro = {
  /* Two lines and nothing else. The quote is the headline — it is the best
     sentence on the page and it used to be seven screens down. */
  headline: "Never train",
  headlineEm: "alone again.",
  sub: "Scroll down to explore the app.",
  /* The walk, laid out under the quote — it says how long the scroll is, and
     each step jumps to its own beat. It also fills a card that is two lines
     tall on a full-height section. */
  steps: [
    { n: "01", icon: "gym", word: "Gyms" },
    { n: "02", icon: "partners", word: "People" },
    { n: "03", icon: "verified", word: "Why you match" },
    { n: "04", icon: "chat", word: "Plan" },
    { n: "05", icon: "log", word: "Log" },
    { n: "06", icon: "calendar", word: "Calendar" },
    { n: "07", icon: "leaderboard", word: "Rankings" },
  ] as OpeningStep[],
  /* The way past the story for someone who wants the list rather than the
     walk. It points AT the feature block beside Campus Colours rather than
     repeating it here — the overview exists once. */
  overview: { label: "Or see everything it does", href: "#campus-colours" },
};

/* ───────────────────── S1–S7 · THE STUDENT STORY ───────────────────── */

export const studentStory: Beat[] = [
  {
    id: "S1",
    kicker: "01 · Gyms",
    head: "See every gym on your campus in one place.",
    sub: "Explore what equipment each gym has, its rating and how busy it is.",
    shot: "01-gyms.webp",
    ann: [],
  },
  {
    id: "S2",
    kicker: "02 · People",
    head: "Find training partners. Make friends.",
    /* The owner, 2026-09-02: "people find training partners mae friends …
       just make explaining sentences from them with verbs and stuff … and no
       dashes its so fkn generic". The line that stood here was the shape they
       mean: a noun list, a dash, an appositive ("Ranked by how well you
       actually fit — same gym, same hours, same level, same interests.").

       AND A ROUND TRIP NOT TO REPEAT. "Revertni to k tomu co bylo" was read as
       "undo the sweep on this story", so 02, 03, 06 and 07 were put back to
       their dashed originals — and the owner's answer was "nemenili jsme tohle
       uz, proc je to tak spatne". They were pointing at the ANIMATION, not at
       these words. The swept lines are the ones they want and they stand.
       When an instruction says a section changed, find out WHAT changed before
       reverting text that was approved. */
    sub: "Browse sorts everyone by how well you fit with them, based on interests, concentration, experience and hours. In Session you pick a time to train and plan directly with people who go at that time, or you post your time on the Buddy Board and see who is interested.",
    shot: "02-match.webp",
    ann: [],
  },
  {
    id: "S3",
    /* Named after the app's own words: /people/[id] calls this section "Why
       you match", and the capture is even filed as 03-why-you-match.webp. The
       label was "The reasons", which named nothing the reader could picture. */
    kicker: "03 · Why you match",
    /* "Life goals" was in the owner's line and is not in the product — the
       profile stores concentration, hometown, languages, interests and a bio. */
    head: "View their profile before you plan a session.",
    sub: "Their profile shows their house, their year and a short bio. Under it, Why you match lists what you have in common: the gym you both use, your shared interests, when your free time overlaps, the languages you speak and whether one of you wants a mentor.",
    shot: "03-why-you-match.webp",
    ann: [],
  },
  {
    id: "S4",
    kicker: "04 · Plan",
    /* The owner's own sentence, 2026-09-02: "plan sessions easily in the chat,
       once the other one accepts it goes to both calendars". */
    head: "Plan sessions easily in the chat.",
    sub: "You send a card with the gym, the day and the time, and once the other one accepts it goes to both calendars.",
    shot: "04-plan-a-session.webp",
    ann: [],
  },
  {
    /* ONE BEAT FOR THE WHOLE LOG SHEET (2026-09-01, the owner: "dal bych to
       log with photos v jedno"). S5 and S6 used to be two beats panning the
       SAME capture — the top for the sets, the bottom for the photo and the
       note — which spent two of seven screens on one sheet and left the app's
       calendar unshown. Now one beat pans the sheet end to end, and the freed
       slot goes to the calendar below. */
    id: "S5",
    kicker: "05 · Log",
    /* The owner's own sentence, 2026-09-02: "record each sets and reps easily
       and attach a photo with your partner that will be stored in memories".
       Memories is a real screen (app/(app)/memories), reached from the Profile
       tab under the calendar, so the line names something that exists. */
    head: "Log it as soon as you finish.",
    sub: "Record your sets and reps easily and attach a photo with your partner that will be stored in your memories.",
    shot: "tall-logsheet.webp",
    ann: [],
  },
  {
    /* THE CALENDAR, at last (the owner: "pak calendar s memories"). No new
       capture was needed and none could be taken: the live demo account has
       moved on — different user, different house, an empty September calendar
       and an empty leaderboard — so a re-shoot today would be a worse picture
       than the one on disk, exactly as the 02-match re-shoot was. But it did
       not need one. tall-profile.webp already carries the session calendar
       under the stats and the leaderboard strip; this beat simply pans down
       to it and S7 pans the top of the same sheet. */
    id: "S6",
    kicker: "06 · Calendar",
    head: "Check your month in the session calendar.",
    sub: "Every session you log marks its day and shows what you trained, so you can track your workouts week by week. Tap a day to open it again, and every photo you took is stored in Memories.",
    shot: "tall-profile.webp",
    ann: [],
  },
  {
    id: "S7",
    /* "The proof" told the reader nothing. The screen really does carry the
       leaderboards, so the label names them — and the sub now lists the four
       that exist (lib/leaderboards.ts: campus, house, partners, year) rather
       than mentioning one in passing. The two lines above it are untouched:
       the story still ends on its payoff, and the rankings are what it hands
       you on the way out. */
    kicker: "07 · Rankings",
    /* The story used to close on "Never train alone again." — which now
       opens the walk, on the card above (see `studentIntro`). Saying it twice
       made the ending a repeated promise; "Nobody trained alone." is the same
       thought as a RESULT, after seven screens of watching it happen. The
       reader joins the two without being told to. */
    head: "Track your statistics. See how you do in the leaderboards.",
    sub: "Your profile counts the sessions you logged and the partners you trained with. Take part in the college leaderboards and see how you rank on campus, how your house and your year are doing, and who has trained with the most partners.",
    shot: "tall-profile.webp",
    /* "Every day you trained" moved up to S6, which is now the beat that
       actually shows the calendar. This one opens on the name and the counts
       the headline reads off, and pans down to the leaderboard strip. */
    ann: [],
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
     reading Lineups, Squad board, Coach's notes: a swimmer who scrolls into
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

     THE ORDER HERE IS THE STORY'S ORDER, and it has to be kept by hand: each
     step links at `#story2-b<its position>`, so a step in the wrong place both
     prints the wrong number and opens the wrong beat. Moving the squad board
     ahead of the calendar (b54b2f5) left this list behind for a day — "05
     Calendar" was pointing at the board. Re-order a beat, re-order this. */
  steps: [
    { n: "01", icon: "plan", word: "Training plan" },
    { n: "02", icon: "boat", word: "Lineups" },
    { n: "03", icon: "race", word: "Coach's notes" },
    { n: "04", icon: "logplan", word: "Log" },
    { n: "05", icon: "calendar", word: "Calendar" },
    { n: "06", icon: "leaderboard", word: "Squad board" },
    { n: "07", icon: "squad", word: "Statistics" },
  ] as OpeningStep[],
  /* Same door as the student card's: the varsity feature block beside Blade
     Lock, which is where the overview lives — once. */
  overview: { label: "Or see everything it does", href: "#blade-lock" },
};

/* The two small scroll cues — under the hero, and under the interlude. */
export const cues = {
  hero: "Scroll",
  interlude: "Keep going",
};

/* ───────────────────── V1–V7 · THE VARSITY STORY ───────────────────── */

/*
  ORDER (owner's call, 2026-09-01): plan · lineup · notes · log · SQUAD BOARD ·
  calendar · statistics. The board used to come last, after the two "your own
  season" beats; now the log beat hands straight over to the squad, and the
  calendar and the statistics — both of them your own training — close the
  story side by side.

  Two open questions on this story, both raised and neither yet decided:

  1. It ends on a statistics graph (V7), which the brief argues against by
     name: a stats screen is the one screen every fitness app already has,
     while a seat in a named boat, published by a coach, is the one none of
     them can show. That screen is V2, currently buried mid-story.
  2. V6's headline is the only line in either story written in the generic
     voice — "keep track of every session" names nothing and could sit on any
     fitness app ever shipped.

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
  {
    id: "V1",
    kicker: "V1 · Training plan",
    /* "Always actual" was the owner's word — aktuální, a Czech false friend.
       "Current" is the meaning; English "actual" means real-not-fake.

       HEAD AND SUB ARE BOTH DICTATED, 2026-09-02: "pojdme na training plan
       always at hand. have your training plan always at eyes and updated in
       real time. tap any day to see the full workout description". The head
       dropped ", always current." because the sub now carries that thought as
       "updated in real time".

       "ALWAYS ON YOUR EYES" CAME BACK OUT of this sub the same day ("nech
       jen u V3 to always at your eyes"): V1 and V3 sit two beats apart over
       the SAME capture and both ended on the phrase. V3 keeps it — the coach's
       note is the thing you are meant to have in front of you — and the head
       here already says "always at hand".

       THE FIRST SENTENCE IS DICTATED DOWN TO THE RELATIVE PRONOUN, asked
       twice and answered twice ("for v1 add(that) updates" → "your training
       plan that updates at real time"). Written with "in real time", the
       preposition they used the first time round; "at real time" is not the
       English idiom. It has no main verb, and "training plan" lands twice in
       two lines with the head above it — both flagged, both theirs.

       ONE CLAIM FLAGGED AND SHIPPED ANYWAY: there is no live subscription —
       HomeScreen fetchPlan()s when the screen opens, so the plan is never
       stale but it is not pushed. "Updated the moment your coach publishes it"
       was offered as the accurate line; the owner's words stand.

       "Lineups" came OUT of this sub on purpose: V2 is the lineup beat, two
       screens down the same capture. What the head replaced said the coach
       builds the week and it is not a screenshot of a spreadsheet — nothing is
       lost, the varsity feature row beside Blade Lock still says exactly that. */
    head: "Training plan always at hand.",
    sub: "Your training plan that updates in real time. Tap any day to see the full workout description.",
    shot: "tall-vhome.webp",
    ann: [],
  },
  {
    id: "V2",
    kicker: "V2 · Lineups",
    head: "Find your lineup in a second.",
    sub: "Never look through 40 names in an Excel sheet again. Your name pops right in a boat.",
    shot: "tall-vhome.webp",
    ann: [],
  },
  {
    id: "V3",
    kicker: "V3 · Coach's notes",
    /* "Always on your eyes" is před očima taken literally, and it was changed
       to "in front of you" on that reasoning. The owner put it back on
       2026-09-02 ("always on your eyes instead of always in front of you"), so
       it stands as theirs. Flagged once: a native reader reads "on your eyes"
       as wrong rather than as style.

       THE SUB IS DICTATED, 2026-09-02: "have the countdown to the next race
       and a note from a coach what to improve always at your eyes" — written
       with "on your eyes", the form they settled on above, and with "your
       coach", who is a specific person to the reader. It used to be the
       generic shape (a noun list, a comma, an appositive); now the reader is
       doing something. Both halves are on the frame: RaceBar under "Next Race"
       counts the days down, CoachNoteCard prints the coach's note for you.

       Head untouched — they dictated the sentence, not the headline. */
    head: "Keep your focus up.",
    sub: "Have the countdown to the next race and a note from your coach on what to improve always on your eyes.",
    shot: "tall-vhome.webp",
    ann: [],
  },
  {
    id: "V4",
    kicker: "V4 · Log",
    /* "Logging IN workouts" was the owner's phrase — logging in is signing
       in, a different thing. All three routes named here are on the capture:
       a Log button per prescribed session, the "Scan C2 / RP3 monitor" card,
       and "Add extra session" at the bottom.

       THE SECOND SENTENCE IS DICTATED, 2026-09-02: "v4 druha veta, take a
       picture of your erg screen to extract your numbers instantly or add
       extra workouts". Two sentences now, the shape V1 took the same day.
       "Take a picture" is what the card actually does — LogScreen reads the
       photo ("Reading photo…", "Filled from your photo — check it and save."),
       it is not a live monitor connection. Head untouched, they did not
       rewrite it. And the head IS rewritten after all, on their word
       ("a jo log a session in a few taps"): "has never been easier" was the
       last piece of ad copy in the story and showed the reader nothing, where
       "a few taps" says how much work it is. */
    head: "Log a session in a few taps.",
    sub: "Log your workout straight from your training plan. Take a picture of your erg screen to extract your numbers instantly, or add extra workouts.",
    shot: "13-varsity-log-list.webp",
    ann: [],
  },
  {
    id: "V5",
    kicker: "V5 · Calendar",
    /* THE SUB IS DICTATED, 2026-09-02: "each workout lands in the calendar
       directly from the log. tap a day to see what u did and track your
       consistency to a plan along with extra workouts". Every clause is on the
       screen: CalendarScreen builds the month out of the athlete's own logs,
       the day sheet lists what was trained with its metrics, and it badges a
       session "PLAN" when source === "plan" — which is exactly what makes the
       plan and the extra workouts tellable apart.

       The head replaces "Keep track of every session.", flagged as the most
       generic line on the page since the first review, and it deliberately
       avoids "track" now that the sub uses it. */
    head: "Look back on your whole season.",
    sub: "Each workout lands in the calendar directly from the log. Tap a day to see what you did and track your consistency to the plan along with your extra workouts.",
    shot: "14-varsity-calendar.webp",
    ann: [],
  },
  {
    /* THE SQUAD BOARD — the beat the owner asked for ("a note about team and
       rankings, its a nice part of it"), and it took four goes to get right.
       First it was a clause on the statistics beat, which promised a board the
       frame did not show. Then the database said varsity_results did not exist
       at all, so the clause came off the page entirely. db/varsity_results.sql
       is applied now, and the app's own worked example
       (lib/varsity/demoWorkouts.ts) fills the board until a coach flags a real
       session, so it has both a table behind it and a picture in front of it.

       WHERE IT SITS has moved twice in two days, both the owner's call: last
       of the seven, then straight after Log, and now (2026-09-02, "do calendar
       after log and before v5") between the calendar and the statistics. The
       words are theirs too: "all of your team pieces recorded, see how you
       improved from last time and where you stand in the rankings, with many
       filters at hand". The filters are named off the capture rather than
       promised vaguely — Split, Time, Watts and W/kg are the four tabs on it.

       The capture is DRIVEN, not a URL: Team → Workouts → tap the 2k test.
       scripts/landing/capture-light.mjs --only=15-varsity-board re-shoots it. */
    id: "V6",
    kicker: "V6 · Squad board",
    /* HEADLINE ONLY, 2026-09-02 ("V6 jsut polish the headline") — the sub is
       the owner's and stands. "Every team piece, recorded." was the shape they
       had just swept off the page: a noun phrase with a participle hung on a
       comma. Now something happens. It stays off the sub's ground on purpose,
       so the head does not spend "where you stand" before the sub gets to it. */
    head: "Every team piece goes on the board.",
    sub: "You see how you improved since last time and where you stand in the rankings, with filters for split, time, watts and watts per kilo.",
    shot: "15-varsity-board.webp",
    ann: [],
  },
  {
    id: "V7",
    /* "Check how your teammates are doing" is a real feature but NOT on this
       frame: tall-vprofile is your own season. The teammate screen exists
       (11-varsity-teammate.webp) and is a dark-mode capture, so until it is
       re-shot that clause has no picture behind it and stays off the page.
       (varsity_telemetry and varsity_coach_reads are unapplied migrations too:
       check the TABLE, not the .sql file, before writing copy about a varsity
       feature.) */
    kicker: "V7 · Statistics",
    head: "See your statistics.",
    sub: "One screen counts your consistency, your hours and your personal bests over eight weeks.",
    shot: "tall-vprofile.webp",
    ann: [],
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
  cta: { label: hero.primaryCta, href: "/login" },
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
      detail: "Newcomers start easily. The app has a feature of mentoring in the gym by more advanced people who are interested in helping out, or get matched with an upperclassman with a similar concentration to mentor you.",
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
      detail: "Take part in community channels and get advice from your peers about nutrition, personal best, form, etc.",
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
      title: "Countdown to the next race and technical note from a coach.",
      detail: "Keep your focus up. Have your next race and note from a coach on what to fix always in front of your eyes.",
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
    q: "Which universities is it live at?",
    a: "Harvard, today. New campuses come on one at a time, each with its own colours, gyms and houses, so the app you sign up to is already yours.",
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
  /* Mirrors the interlude's own lead-in, which is the owner's dictated line
     ("And if you do sport for the university itself —"). */
  leadIn: "And if you are the one who runs the squad —",
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
     two lines that lean on it change: the "And" goes, and the athletes become
     yours rather than the ones the reader has just watched. */
  leadInSolo: "If you are the one who runs the squad —",
  subSolo: [
    { text: "UNIsport Varsity Mode is designed to make " },
    { text: "running a season", bold: true },
    {
      text: " as efficient and friendly as possible for a college rowing program. The plan, the lineups, the videos and the numbers all live in one console, and the app is customizable to fit your program perfectly. Everything your athletes open on their phones is built here, on real screens from the console as it works today.",
    },
  ] as Segment[],

  /* THE SIX SCREENS GET THEIR OWN NAME. The owner, 2026-09-05: "I'd start by
     separating the coaches console from the phones down there, so it has a
     section name too, and then we show there how it works." The opener above
     says what the console IS; everything below this line is the showing. A
     rule and this heading stand between the two.

     Written by me to that brief, not dictated — so it is the owner's to
     correct, like coach.summary was. */
  stepsHead: "How it",
  stepsHeadEm: "works.",
  stepsSub: "Six screens from the console, in the order a season is run.",

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
      shot: "coach-4-lineup.webp",
      alt: "The Lineup screen: the 1V eight seated cox to bow, port seats in red and starboard seats in green, with the athlete pool beside it",
    },
    {
      n: "4",
      /* DICTATED BY THE OWNER 2026-09-05, transcribed with grammar corrected
         and not rephrased. It replaces "Put the footage on the boat." and the
         old body, which named the parts of the title instead of the two things
         a coach actually does: connect the drive once, then tap a boat.

         ONE THING TO CHECK BEFORE LAUNCH: this says OneDrive, and what is
         built and working today is GOOGLE Drive (the team's Drive, OAuth
         verified — see the crew-videos work). Either the copy is a word out or
         the plan changed; the owner has been asked. */
      head: "Upload footage of the boat.",
      body: [
        { text: "Connect to your OneDrive where you store your rowing footage. Then tap a boat to upload a video from the session. " },
        { text: "It automatically renames itself according to the lineup and saves into the right date", bold: true },
        { text: ", so your athletes know right away which piece they are watching." },
      ],
      /* STAND-IN SHOT. The video strip sits on this same Lineup screen, below
         the boats, so the screen is right but the frame is not — it repeats
         step 3. Needs one capture run (scripts/landing/capture-coach.mjs, plus
         a walk down to the strip) before launch. */
      shot: "coach-4-lineup.webp",
      alt: "The Lineup screen, where a boat's video strip sits under the seated crew",
    },
    {
      n: "5",
      head: "Every number the squad puts up, in one list.",
      body: [
        { text: "Flag a session as a team workout and the board fills itself as the athletes log it, ranked by split, time, watts or watts per kilo. Water outings arrive with their telemetry, so you open an outing, then a piece, and read " },
        { text: "the crew's numbers seat by seat", bold: true },
        { text: ". Nobody types results into a shared sheet again." },
      ],
      /* The Workouts board, captured from the athlete side — the coach's Team
         tab IS this screen. Right screen, athlete's frame; re-shoot from the
         console in the same pass as the video strip. */
      shot: "15-varsity-board.webp",
      alt: "The team workout board: a 2k test with every athlete's result, filtered by split, time, watts and watts per kilo",
    },
    {
      n: "6",
      head: "Keep the athletes on track.",
      body: [
        { text: "Write a note to an athlete on where their technical focus should be. It sits on their Home under the race countdown, so they " },
        { text: "always have it in front of their eyes", bold: true },
        { text: " and stay focused at all times. Everyone else sees a green “Good job”." },
      ],
      shot: "coach-5-notes.webp",
      alt: "The Athlete Notes screen: the roster with a short technical note per athlete, and a green Good job for everyone without one",
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

# Prompt — Varsity Mode review (paste into Fable 5.1)

The athlete half of Varsity Mode, plus the way in and out of the mode. The Coach
Console has its own prompt in `prompts/coach-console-review.md` — run that one
separately rather than asking for both at once.

Everything below the line is the prompt. Copy from `---` to the end.

---

You are a senior product engineer who has shipped mobile software for athletes —
the kind of app someone opens at 5:15am with one eye open, and again sweating in
a boathouse bay, not the kind that demos well on a laptop. You have equal parts
design eye and shipping instinct. I want a blunt, specific critique, not
encouragement.

## What the product is

**UNIsport** is a white-label university fitness PWA (Next.js App Router v16,
React 19, Tailwind v4 driven entirely by CSS variables, Supabase for data and
auth). It has two halves:

- **Student side** — gyms, crowd levels, workout logging, matching with a
  training partner, house leaderboards.
- **Varsity Mode** — a real college team living inside the same app. It is a
  fully separate section with its own theme, its own top bar, its own 5-tab
  nav, and its own database permissions. Athletes get Home / Calendar / Log /
  Team / Profile; their coach gets a separate Coach Console.

The first real squad is **Harvard heavyweight rowing**: one head coach, roughly
forty athletes. **The athlete is the user I care about here** — a sophomore
heavyweight, two sessions most days, 5:15am alarm, erg monitor in front of him
in a gym bay, phone in a pocket on the walk to the water. Everything below is
judged against him.

## The thing you are reviewing: Varsity Mode, athlete side

### Getting in

- A coach or captain generates an **invite link** and pastes it into WhatsApp.
  The link never grants anything: `/join/[code]` previews the code, the database
  redeems it, and the usual answer is "you're in the queue".
- **Waiting room** (`/varsity/waiting`) — the whole app for someone not yet
  approved. It says where they stand, shows the email their captain will see
  them under, and offers the student side as something to do meanwhile.
- **Short varsity setup** (`/varsity/setup`) — a rower who arrived through a
  team link is not sent through the nine-screen student onboarding. He is asked
  two kinds of thing only: who he is (name, class year, sex) and how he rows
  (rower or coxswain, which side, height, weight — what the lineup builder
  otherwise has to guess).
- **Mode switcher** — a sheet opened from the name in the student Profile bar
  and from the varsity mark in the varsity bar. The varsity row has three faces
  (on a squad / waiting / join a team); the student row is offered openly
  because the student side is optional for someone who came in varsity-first.
- **Intro animation** — entering Varsity Mode plays a one-shot title sequence:
  two oars sweep in and cross, the school crest drops onto the crossing point,
  the overlay fades to Home. It plays only on the switch into the mode, and is
  disabled under `prefers-reduced-motion`.
- **A first-run tour** drives itself between tabs, opens real screens and lights
  real controls rather than pictures of them.

### The five tabs

1. **Home** (`/varsity/home`) — the daily anchor, built from the coach's
   *published* plan. Greeting (which block, which week), race countdown, this
   week's strip, today's AM/PM prescribed sessions with any coach note attached,
   today's lineup (**your boat only** — the rest live behind "All boats"), the
   coach's weekly focus, and a button to upload crew video. An athlete only ever
   sees the current week of a published block, never the whole block ahead.
2. **Calendar** (`/varsity/calendar`) — a wall calendar of what he actually did.
   A full month grid that fills the screen, every day a box whether he trained
   or not, one session taking half a box, colour = intensity, the coach's workout
   text inside the day rather than a dot. Tap a day for the detail; tap a legend
   colour for that kind of training's month. The month's totals sit next to the
   month name; there is no page header.
3. **Log** (the elevated centre button) — where he logs training. Today's
   *prescribed* sessions are listed first, each loggable in one tap (result, how
   it felt, a note); "extra training" he adds himself goes below. A **scan the
   C2 / RP3 monitor** button reads the numbers off a photo of the erg screen. A
   logged result can be shared to a team board. Logs are private per athlete.
4. **Team** (`/varsity/team`) — two halves behind a sub-nav. **Roster**:
   the whole squad, searchable, grouped like the lineup pool; tap a rower for
   their card (team year, height/weight, status, erg PRs). **Workouts**: one
   list, newest first, of everything the squad measured — erg sessions the coach
   flagged as a team workout (tap for the board: ranked for a test, averages-only
   for steady training, with List and Table views and metric pills) and water
   outings with Peach / SpeedCoach telemetry attached (crew results, never
   ranked).
5. **Profile** (`/varsity/profile`) — his own rowing record. Identity (same name
   as the student profile, year on the team, height, weight — editable), current
   status (Active / Light training / Injured / Away), statistics (pick a window
   — week / 2 weeks / month / 3 months / two dates — and a measure — metres /
   hours / consistency; three numbers plus a graph that opens full size and
   leads into a training mix), personal bests (2K / 5K / 6K / 30′ r20), and a
   shareable link to send to coaches abroad.

### Things worth knowing about how it behaves

- **Crew video** is attached to a boat in a practice, never filed on its own, and
  the same strip appears on the athlete's Home and in the coach's lineup builder.
  The upload sheet asks which practice and which boat rather than guessing.
- **The colour of a session is the same everywhere** — the coach's plan, the
  athlete's Home, the Calendar month — so one practice is never two colours.
- **The athlete's log is his own.** No policy anywhere lets a coach edit or
  delete it; the coach may only look.
- **Where there is no data yet**, several screens fall back to a labelled worked
  example so a screen can be reviewed before a squad has trained a day.
- **Roster and team profiles are still demo data** — athlete accounts aren't
  linked to the squad roster yet, so a published boat doesn't highlight "your
  seat" from a real account.

The Coach Console (plan builder, lineup builder, notes, squad admin, training
settings) is reviewed separately — treat it as given. What I *do* want from you
is the seam: where the coach's side and the athlete's side hand off to each
other badly.

If you have access to the repository, read the real thing before you answer —
`app/varsity/**`, `components/varsity/**` (skip `components/varsity/coach/**`),
and `lib/varsity/home.ts`, `athleteHome.ts`, `logStore.ts`, `logParse.ts`,
`ergScan.ts`, `resultsStore.ts`, `teamBoard.ts`, `athleteProfile.ts`,
`membership.ts`. The summary above is mine and may be flattering; trust the code
over it.

## What I want from you

Review Varsity Mode on four axes, in this order of importance:

1. **The daily loop** — is this an app he opens twice a day for four years, or
   twice in the first week? Walk a real day: the alarm, checking what the session
   is and whether he's in a boat, the walk down, the erg bay, logging afterwards,
   the evening glance at what's tomorrow. Where does the app fail to be there at
   the moment he needs it, ask for something he can't give it right then, or make
   him open it and find nothing new?
2. **Practicality** — sweaty hands, cold hands, gloves, one bar of signal in a
   basement gym, a phone he doesn't want to take out on the water. What breaks?
   Which taps are in the wrong place for the posture he's in? Where is the app
   assuming he'll type?
3. **The team feeling** — a squad is forty people who compare themselves to each
   other constantly and privately. Does the Team tab get the line right between
   useful and corrosive? Is the ranked/averages split doing its job? What does he
   want to know about the others that this doesn't tell him, and what does it
   tell him that he shouldn't be looking at?
4. **Design and information architecture** — hierarchy, density, what earns its
   place on a small screen. Are five tabs the right five? Is Home carrying the
   right things at the right sizes? Is the split between Home, Calendar and
   Profile — three screens that all show his training — actually three screens
   worth of difference, or one screen split three ways? Does Varsity Mode feel
   like the same product as the student side, and is the mode switch honest?

Also answer these specifically:

- **The intro animation.** It plays on entry to the mode. Charming the first ten
  times, or in the way by week two? Say which, and what you'd change.
- **The first week.** What does this look like to a rower approved on a Tuesday
  with no logged sessions, no published plan, and a demo roster? Is the empty
  state a product or an apology?
- **Notification-shaped moments.** The coach publishes a lineup at 21:40 and the
  athlete is in one. Where should that land, and does the app currently have
  anywhere for it to land?

## Rules for your answer

- **Be concrete and name the screen.** "The week strip on Home" beats "improve
  navigation". Every suggestion must be attached to a specific screen, control,
  or moment in the day.
- **Rank ruthlessly.** I would rather have six things that matter than thirty
  that are true. Give each a severity (blocks real use / friction / polish) and
  a rough size (small / medium / big).
- **Say what to cut.** A review that only adds is a bad review. Name anything an
  athlete would never open twice.
- **Respect the constraints.** No hardcoded colours anywhere — everything comes
  from CSS variables so the app can re-skin per university (per-entity content
  colours like a session intensity live in data and are applied inline; that is
  the only exception). Varsity Mode must eventually work for a swimming or
  running squad, so nothing rowing-specific may be baked into a component.
  Phone-first, installable PWA. Work ships in small reviewable slices, so prefer
  changes that can land one at a time.
- **Assume the constraints are load-bearing.** If you think one is wrong, say so
  in one sentence and move on; don't redesign the theming system.
- **No code.** Prose and, where it helps, a small ASCII sketch of a layout.
- **No generic UX platitudes.** Nothing about "delighting users", "leveraging
  AI", onboarding funnels, streaks-for-their-own-sake, gamification, or adding a
  chatbot. If a feature idea would take a season to build, say so and put it
  last.

## Output format

1. **Verdict** — three sentences. Is a rower still opening this in week six, and
   what is the single biggest thing standing between here and that?
2. **A day in the life** — walk one real Tuesday through the app as it is, and
   mark every point of friction as you pass it. This is the section I care most
   about.
3. **The short list** — the ranked issues, each as: what's wrong → why it hurts
   the athlete → what you'd do instead. Severity and size on each.
4. **Screen by screen** — brief notes on Home, Calendar, Log, Team (roster and
   workouts), Profile, and the way in (invite → setup → waiting → intro). Skip
   anything you have nothing worth saying about.
5. **The seam** — where the coach's side and the athlete's side fail to meet.
6. **The gaps** — what an athlete needs that isn't here at all, ranked by how
   often it comes up in a season.
7. **Cut list** — what to remove or fold into something else.
8. **Do these three first** — the three changes with the best ratio of athlete
   pain removed to work required, in order, each small enough to build and
   review on its own.

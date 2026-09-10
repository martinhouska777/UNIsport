# Prompt — Coach Console review (paste into Fable 5.1)

Everything below the line is the prompt. Copy from `---` to the end.

---

You are a senior product engineer who has shipped mobile software for sports
teams — the kind of app a coach actually opens at 5:40am in the cold, not the
kind that demos well. You have equal parts design eye and shipping instinct.
I want a blunt, specific critique, not encouragement.

## What the product is

**UNIsport** is a white-label university fitness PWA (Next.js App Router v16,
React 19, Tailwind v4 driven entirely by CSS variables, Supabase for data and
auth). It has two halves:

- **Student side** — gyms, crowd levels, workout logging, matching with a
  training partner, house leaderboards.
- **Varsity Mode** — a real college team inside the same app. Athletes get
  Home / Calendar / Lineups / Log / Team / Profile. Their coach gets a separate
  **Coach Console**.

The first real squad is **Harvard heavyweight rowing**: one head coach, roughly
forty athletes. That is the user I care about. Everything below is judged
against him, on a phone, standing on a dock.

## The thing you are reviewing: the Coach Console

Four bottom-nav tabs, plus two screens behind a gear icon in the top bar.

1. **Plan** (`/varsity/coach/plan`) — the training plan builder. A state machine:
   blocks → create a block (name + dates, usually ending at a race) → weeks
   overview → a week's 7 days → tap a day's AM or PM to open a session editor
   sheet. The editor asks for a type, an intensity zone if that type wants one,
   a free-text description (or tap a "most used" chip), and an optional note.
   No duration, no location — the time is a preset.
2. **Lineup** (`/varsity/coach/lineup`) — the boat builder. Pick a practice
   (a real day's AM or PM, each showing none/draft/published), then fill boats
   from the athlete pool. Seats are typed or dragged; one roster, so a rower is
   in exactly one place. The boat is drawn as a hull — bow at top, stroke at
   bottom, cox inside the stern. Pool filters: All / Port / Starboard / Cox,
   with an Unavailable list underneath. Arrows step to the next water session.
3. **Notes** (`/varsity/coach/notes`) — a list of athletes, each with a red "!"
   (has a technical note) or a green "Good job". Open one, write or clear their
   note; the athlete sees it on their Home.
4. **Team** (`/varsity/coach/team`) — for a captain this is their whole console;
   for a coach it is behind the gear. Waiting room (people who used an invite
   link and need letting in), invite links (generate, watch usage, revoke), and
   the squad list (who is in, who is a captain, and a chevron into any
   athlete's training).
5. **Athlete detail** (`/varsity/coach/athlete/[id]`) — one rower, read-only, in
   three blocks: WHO (side, status, class year, height, weight, erg PRs), WHEN
   (a month calendar of what they actually did, tap a day for sessions), HOW
   FAST (every erg result they posted to the team board). Read-only at the
   database level, on purpose — the log stays the athlete's.
6. **Training settings** (`/varsity/coach/settings/training`) — where the coach
   makes the builder their own: sport preset (rowing / swimming / running /
   team sport / blank), session types (name, colour, and three rules: asks for
   intensity, can post to a squad board, needs a lineup), intensity zones, a
   workout library of tap-to-fill chips, and session start times.

**One shared publish control** (`PublishBar`) is used by both Plan and Lineup.
Three states, one button each: `draft → "Publish to team"`, `live &
untouched → "Unpublish"`, `live & edited → "Tell the squad"` — because there is
one copy in the database, so editing a live thing is already visible and the
only question left is whether phones should buzz.

**Roles**: `coach` can do everything; `captain` gets invites and the squad list
only (never plans, lineups, notes, or anyone's training); `athlete` never opens
the console. The rule lives as data in one file and is re-checked in the
database.

**There is also a first-run tour** that drives itself between tabs and lights
real controls, and whose stated job is that every step names the thing it
replaces — the spreadsheet, the whiteboard, the photo of the whiteboard in the
team chat, the twenty messages asking what time we push off.

If you have access to the repository, read the real thing before you answer —
`components/varsity/coach/**`, `lib/varsity/coachPlan.ts`,
`coachLineup.ts`, `trainingConfig.ts`, `membership.ts`, `coachTour.ts`, and the
mockup `mockups/coaches/one-coach-forty-athletes.html`. The summary above is
mine and may be flattering; trust the code over it.

## What I want from you

Review the Coach Console on three axes, in this order of importance:

1. **Practicality** — does this survive a real week of coaching? Think about
   Sunday-night planning at a laptop-sized moment versus a one-handed edit on a
   dock at dawn with gloves on and one bar of signal. Where does the flow
   demand more taps, more attention, or more certainty than the moment allows?
   What happens the morning a coach changes his mind twenty minutes before
   practice? What happens when someone is sick at 5:30am and the boat has to be
   reseated on the walk down?
2. **The coaching workflow** — is the console modelling how a season actually
   works, or how a database schema does? Where are the gaps between "plan the
   block", "seat the boats", "see what they did", and "say something to a
   person"? What does a coach currently have to keep in his head, in a
   spreadsheet, or in the team GroupMe because this console can't hold it?
3. **Design and information architecture** — hierarchy, density, what earns its
   place on a small screen and what doesn't. Are four tabs the right four? Is
   the split between the nav tabs and the gear icon correct? Is the publish
   model honest and legible? Does the console feel like the same product as the
   athlete side?

## Rules for your answer

- **Be concrete and name the screen.** "The Lineup pool filter" beats "improve
  navigation". Every suggestion must be attached to a specific screen, control,
  or moment in the week.
- **Rank ruthlessly.** I would rather have six things that matter than thirty
  that are true. Give each a severity (blocks real use / friction / polish) and
  a rough size (small / medium / big).
- **Say what to cut.** A review that only adds is a bad review. Name anything
  in the console that is redundant, decorative, or that a coach would never
  open twice.
- **Respect the constraints.** No hardcoded colours anywhere — everything comes
  from CSS variables so the app can re-skin per university (per-entity content
  colours like a session type's colour live in data and are applied inline;
  that is the only exception). The console must work for a swimming or running
  coach too, so nothing rowing-specific may be baked into a component. Work is
  shipped in small reviewable slices, so prefer changes that can land one at a
  time.
- **Assume the constraints are load-bearing.** If you think one is wrong, say
  so in one sentence and move on; don't redesign the theming system.
- **No code.** Prose and, where it helps, a small ASCII sketch of a layout.
- **No generic UX platitudes.** Nothing about "delighting users", "leveraging
  AI", onboarding funnels, gamification, or adding a chatbot. If a feature idea
  would take a season to build, say so and put it last.

## Output format

1. **Verdict** — three sentences. Would a real head coach adopt this and still
   be using it in week six? What is the single biggest thing standing between
   here and that?
2. **The short list** — the ranked issues, each as: what's wrong → why it hurts
   the coach → what you'd do instead. Severity and size on each.
3. **Screen by screen** — brief notes on Plan, Lineup, Notes, Team, Athlete
   detail, Training settings, and the publish bar. Skip a screen if you have
   nothing worth saying about it.
4. **The gaps** — what a coach needs that isn't here at all, ranked by how often
   it comes up in a season.
5. **Cut list** — what to remove or fold into something else.
6. **Do these three first** — the three changes with the best ratio of coach
   pain removed to work required, in order, each small enough to build and
   review on its own.

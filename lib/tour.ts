/*
  THE TOUR — one walk through the app, the first time you're in.
  ---------------------------------------------------------------------------
  ONE list, in order, start to finish. The tour drives itself: it moves between
  tabs, opens a gym, presses Match's sub-tabs and opens the Log Session editor,
  because the parts worth explaining are not all sitting on one screen. You do
  nothing but read and press Next.

  There are TWO of these walks now, and they are the same machine: this one for
  the app, and lib/varsity/coachTour.ts for the Coach Console. A walk is a
  `Tour` — an id, its steps, and anything it must shut on the way out — and the
  overlay, the gate and the seen-flag all take one as an argument. Adding a
  third is adding a data file, not new code.

  (It used to be four separate tours that each fired the first time you opened
  their screen. The product owner asked for the whole thing in one go instead —
  a person landing in a new app wants to know the shape of it once, not be
  interrupted three days later by a screen they've already worked out.)

  All the copy lives here rather than in the overlay, so it can be read and
  changed without touching component code (rule 7).

  Each step:
    press   press this `data-tour` to GET here — the overlay animates a tap on
            it first, so a screen never changes without you seeing what did it
    route   where that press should land; also the fallback if the control
            can't be found, and the only way to reach a step with no button
    anchor  the `data-tour` to light up; null = a centred card with no target

  Prefer `press` over `route`. Being carried to a new screen by an invisible
  hand teaches nothing — watching the Match tab get tapped teaches the tab.

  A step whose anchor never turns up is skipped rather than stranding the tour,
  so a screen that fails to load costs one step, not the whole walk.

  "Have they seen it?" is kept in localStorage, NOT the database. It needs no
  SQL applied before the feature works, and the worst a lost flag can do is
  offer the tour twice. If it ever needs to follow an account between devices,
  it moves to a `tourSeen` key on `profiles.data` — merged the way
  saveVarsitySetup does it in components/AppState.tsx.
*/
import { useSyncExternalStore } from "react";
import { sessionPoints } from "@/lib/points";

export type TourStep = {
  /** Press this `data-tour` to reach the step — tapped visibly, then clicked. */
  press?: string;
  /** Where that lands. Also the fallback if the control never turns up. */
  route?: string;
  /** The `data-tour` to light up; null = a centred card. */
  anchor: string | null;
  title: string;
  body: string;
  /*
    Something the overlay ACTS OUT once the step is lit, for the parts a tap on
    a real control can't show without changing anything:
      add-photo    the finger taps "Add photo" and a picture appears in the grid
      photo-lands  that picture flies into the Memories row
      accept-plan  the finger taps a plan's Accept and an "Accepted" stamp
                   appears — NEVER a real click: accepting answers the other
                   person and pings them
    Drawn by the overlay only — nothing is added to the form or saved.
  */
  demo?: "add-photo" | "photo-lands" | "accept-plan";
  /** Press the `press` control this many times (default once) — the
      list of competitions wraps, so a step can be taken more than once. */
  pressTimes?: number;
  /** The forward button's word when it isn't "Next" — the opening card's "Show me". */
  next?: string;
  /** A second `data-tour` to light WITH the anchor — the hole grows to cover both. */
  alsoAnchor?: string;
  /*
    Steps that only make sense together — a dive into a screen the walk had to
    open. If one of them never turns up, the REST OF THE GROUP is dropped
    immediately rather than each waiting out its own four seconds: once the
    first move failed (no training block to open, say) nothing further in that
    dive is reachable, and half a minute of dead air is worse than a gap.
  */
  group?: string;
};

/*
  One walk. `id` is what the seen-flag and the replay request are keyed on, so
  it must stay stable once shipped — "app" is the original, and changing it
  would re-offer the tour to everyone who has already had it.
*/
export type Tour = {
  id: string;
  steps: TourStep[];
  /** `data-tour`s to click if the walk is abandoned — see `closeOnExit` below. */
  closeOnExit: string[];
};

/*
  THE OWNER'S WALK (2026-09-30), in his order and his words: what a student
  needs to know, nothing more.

  • It ASKS first. The opening card is a choice — "Show me" or "Skip" — because
    it is the first thing a new student sees after the welcome.
  • Gyms: it does NOT open a gym. It lights the first one and says what a tap
    on any gym gets you ("just tell the actions").
  • Match: ranked by interests, concentration and when you train — never
    "same gyms" (owner: "I don't want to put them in the same gym").
  • Sessions: lights "+ Post your session" and "Search by time" together, so
    the text sits UNDER them instead of over them.
  • Profile: log your workouts → a photo with your training partner → it lands
    in Memories → the leaderboards, your house.

  The Memories steps are ACTED OUT (`demo`): the finger taps "Add photo", a
  picture appears, the form closes and the picture lands in Memories. Nothing
  is saved — the picture is drawn by the overlay, not added to the form.
*/
export const tourSteps: TourStep[] = [
  {
    route: "/gyms",
    anchor: null,
    title: "Take a quick tour?",
    body: "The four tabs in thirty seconds.",
    next: "Show me",
  },

  /* ── Gyms ─────────────────────────────────────────────────────────────── */
  {
    anchor: "gyms-first-card",
    title: "Gyms",
    body: "Tap any gym to see its opening hours and ratings, see who’s going, or post that you’re going.",
  },

  /* ── Match ────────────────────────────────────────────────────────────── */
  {
    press: "tab-/match",
    route: "/match",
    /* The tab AND the first person under it, sharp and lit — the owner: "they
       want to see the things that are there". */
    anchor: "match-tab-people",
    alsoAnchor: "match-first-card",
    title: "Match",
    body: "Find people who share your interests, concentration or training times.",
  },
  {
    press: "match-tab-sessions",
    /* The Sessions tab on top AND the post row under it, in one light
       (owner, 2026-09-30: "highlight the tab on top and just see the Post
       your session"). */
    anchor: "match-tab-sessions",
    alsoAnchor: "board-actions",
    title: "Sessions",
    body: "Post your session: what you’re training and when. Or use Search by time to find someone going when you are.",
  },

  /* ── Messages ─────────────────────────────────────────────────────────── */
  {
    press: "tab-/messages",
    route: "/messages",
    anchor: "tab-/messages",
    title: "Messages",
    body: "Plan your sessions easily in the chat.",
  },
  /*
    INTO A CHAT, TO A PLAN (owner, 2026-09-30: "you click it and it goes to the
    chat and accepts it"). The finger opens the top chat and lights its newest
    plan; Accept is tapped as a drawing only. A student with no chats yet — so
    every brand-new one — simply doesn't get this step.
  */
  {
    press: "msg-first-dm",
    anchor: "dm-plan",
    demo: "accept-plan",
    group: "chat",
    title: "Accept a plan",
    body: "Accept it and the session shows up on your Profile.",
  },

  /* ── Profile ──────────────────────────────────────────────────────────── */
  {
    press: "tab-/profile",
    route: "/profile",
    anchor: "profile-log",
    title: "Log your workouts",
    body: "Every workout you log earns points.",
  },
  {
    press: "profile-log",
    // Just the photo square, not the whole row (owner: "zoom just the part").
    anchor: "log-photo-add",
    demo: "add-photo",
    title: "Add a photo",
    body: "Take a picture with your training partner and make memories.",
  },
  {
    press: "log-cancel",
    anchor: "profile-memories",
    demo: "photo-lands",
    title: "Memories",
    body: "Your photos end up here.",
  },
  /*
    THE LEADERBOARDS, opened for real (owner, 2026-09-30, second thought: "show
    the leaderboards and then click them so that you can change houses … in the
    competition"). The finger taps your row on the Profile; a brand-new student
    has no row yet, so the route takes them there instead. The honour code waits
    while the tour runs (useTourRunning below). The points are read from
    lib/points.ts, never retyped.
  */
  {
    press: "profile-leaderboards",
    route: "/leaderboards",
    anchor: "lb-controls",
    alsoAnchor: "lb-podium",
    title: "Leaderboards",
    body: `Your workouts earn points for you and your house: ${sessionPoints.solo} on your own, ${sessionPoints.partner} with a partner, ${sessionPoints.newPartner} with someone new.`,
  },
  // No "pick the competition" step after this (owner, 2026-09-30: "we don't need
  // it twice") — the card above already lights the same controls and podium.
  {
    anchor: null,
    title: "That’s it",
    body: "See it again anytime: Settings → Take the tour.",
  },
];

/*
  Anything the tour opens on your behalf and should shut again if you walk out
  early. Skipping during the Log Session steps would otherwise leave you sitting
  in an editor you never asked to open. Listed here rather than in the overlay
  so it stays a fact about the walk, not about the drawing (rule 7).
*/
const closeOnExit = ["log-cancel"];

/** The walk through the app itself. Its id is "app" — do not change it. */
export const appTour: Tour = { id: "app", steps: tourSteps, closeOnExit };

/* ── Has this account seen it? ──────────────────────────────────────────── */

// Same shape as the app's other per-user keys (`gymFavorites:${userId}` in
// lib/gymSocial.ts, `workoutLogs:${userId}` in lib/supabase/workouts.ts).
// Keyed by tour id, so the console's walk has its own flag — someone who has
// been round the app is still new to the console the first time they open it.
const seenKey = (tour: Tour, userId: string) => `${tour.id}TourSeen:${userId}`;

export function hasSeenTour(tour: Tour, userId: string): boolean {
  if (typeof window === "undefined") return true; // never auto-run on the server
  try {
    return window.localStorage.getItem(seenKey(tour, userId)) === "1";
  } catch {
    // Private mode / storage disabled. Treat it as seen rather than opening the
    // tour on every single page load.
    return true;
  }
}

export function markTourSeen(tour: Tour, userId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(seenKey(tour, userId), "1");
  } catch {
    /* nothing to do — it just runs again next time */
  }
}

/** Forget it, so the app introduces itself from scratch again. */
export function resetTour(tour: Tour, userId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(seenKey(tour, userId));
  } catch {
    /* ignore */
  }
}

/* ── Asking for it again ────────────────────────────────────────────────── */
/*
  "Take the tour" has to reach a gate that is already somewhere else, and the
  two consoles need different answers:

  • The APP's Settings lives at /settings, OUTSIDE the tab shell. Asking there
    leaves a request behind and navigates to /gyms, where the shell MOUNTS its
    gate and reads it. sessionStorage rather than a query parameter: it
    survives the navigation, needs no Suspense boundary, and leaves no ?tour=1
    stuck in the address bar to re-fire on every refresh.

  • Squad settings is INSIDE the Coach Console shell, so its gate is already
    mounted and will never re-read anything. Hence the event: the request is
    also announced, and a live gate hears it.

  Both are written every time, because the caller does not know which case it
  is in — and a request that is both stored and announced is read exactly once
  either way.
*/
const requestKey = (tour: Tour) => `${tour.id}TourRequest`;
const REQUEST_EVENT = "unisport:tour-request";

export function requestTour(tour: Tour) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(requestKey(tour), "1");
  } catch {
    /* ignore — the event below still reaches a gate that is already mounted */
  }
  window.dispatchEvent(new CustomEvent(REQUEST_EVENT, { detail: tour.id }));
}

/** True once, if the tour was asked for. Reading it clears the request. */
export function takeTourRequest(tour: Tour): boolean {
  if (typeof window === "undefined") return false;
  try {
    const asked = window.sessionStorage.getItem(requestKey(tour)) === "1";
    if (asked) window.sessionStorage.removeItem(requestKey(tour));
    return asked;
  } catch {
    return false;
  }
}

/** Listen for a request aimed at this tour. Returns the unsubscribe. */
export function onTourRequest(tour: Tour, run: () => void): () => void {
  const handler = (e: Event) => {
    if ((e as CustomEvent).detail !== tour.id) return;
    takeTourRequest(tour); // consume it, so a later mount doesn't run it twice
    run();
  };
  window.addEventListener(REQUEST_EVENT, handler);
  return () => window.removeEventListener(REQUEST_EVENT, handler);
}

/* ── Is a walk on screen right now? ─────────────────────────────────────── */
/*
  Screens that would otherwise stop the walk read this — the leaderboards'
  honour code, which a new student would hit the moment the tour opens the
  boards. TourOverlay switches it on while it is mounted.
*/
let running = false;
const runningListeners = new Set<() => void>();

export function setTourRunning(on: boolean) {
  running = on;
  runningListeners.forEach((l) => l());
}

export function useTourRunning(): boolean {
  return useSyncExternalStore(
    (l) => {
      runningListeners.add(l);
      return () => runningListeners.delete(l);
    },
    () => running,
    () => false,
  );
}

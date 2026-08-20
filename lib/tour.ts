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
import { gyms } from "@/lib/gyms";

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
  The gym the tour opens is simply the first one in the data — so this file
  never names a school's gym, and a new university's data works unchanged.
*/
const aGym = `/gyms/${gyms[0].slug}`;

export const tourSteps: TourStep[] = [
  {
    route: "/gyms",
    anchor: null,
    title: "Here's the whole app",
    body: "A minute, and you'll know where everything is — the four tabs and the parts of them that aren't obvious. Skip, bottom left, stops it any time.",
  },

  /* ── Gyms ─────────────────────────────────────────────────────────────── */
  {
    anchor: "tab-/gyms",
    title: "Gyms",
    body: "Every gym on campus — the opening hours, what kit is inside, and how busy it is right now.",
  },
  {
    anchor: "gyms-filters",
    title: "Keep yours at the top",
    body: "Tap the heart on any gym and it lands under Favourites. Main is the big three; House is the twelve house gyms.",
  },
  {
    press: "gyms-first-card",
    route: aGym,
    anchor: "gym-rate",
    title: "This part is you telling the app",
    body: "A rating, and “how busy right now”, only ever know what people report. Tap a star after you've trained and say what you walked into.",
  },
  {
    anchor: "gym-partner",
    title: "Find a partner at this gym",
    body: "This carries the gym across to Match, so you're looking at people who train here rather than everyone on campus.",
  },

  /* ── Match ────────────────────────────────────────────────────────────── */
  {
    press: "tab-/match",
    route: "/match",
    anchor: "tab-/match",
    title: "Match",
    body: "Where you find someone to train with. There are three ways to go about it, and they're in the row just underneath.",
  },
  {
    press: "match-tab-browse",
    anchor: "match-tab-browse",
    title: "Browse — everyone, ranked",
    body: "People sorted by how well they fit you, with the reason spelled out under each name. Start here when you just want to find somebody.",
  },
  {
    press: "match-tab-session",
    anchor: "match-tab-session",
    title: "Session — one specific slot",
    body: "Say what you want to train, which day and what time, and this searches for people free exactly then. Use it when you already know when you're going.",
  },
  {
    press: "match-tab-buddy",
    anchor: "match-tab-buddy",
    title: "Buddy Board — post and let them come",
    body: "Put up what you're looking for instead of searching, or answer somebody else's post. Posts cover the coming week and then expire.",
  },

  /* ── Messages ─────────────────────────────────────────────────────────── */
  {
    press: "tab-/messages",
    route: "/messages",
    anchor: "tab-/messages",
    title: "Messages",
    body: "Where a match turns into an actual session. Your one-to-one chats live here, alongside the open community channels.",
  },

  /* ── Profile, and the editor behind it ────────────────────────────────── */
  {
    press: "tab-/profile",
    route: "/profile",
    anchor: "tab-/profile",
    title: "Profile",
    body: "Your training history, your personal records and your photos. Settings sit behind the gear in the corner — notifications, light or dark, and your answers.",
  },
  {
    anchor: "profile-log",
    title: "Log Session",
    body: "The button the rest of this screen is waiting on. It's worth opening once before you need it — so let's.",
  },
  {
    press: "profile-log",
    anchor: "log-activity",
    title: "Start with what you did",
    body: "The date is already today unless you change it. Pick the activity and the rest of the form changes with it — a gym session asks for exercises, a run asks for distance and time.",
  },
  {
    anchor: "log-exercises",
    title: "Add and browse exercises",
    body: "This opens a searchable library — bench, squat, whatever you did. Each exercise you add gets its own rows: weight and reps per set, and “Add set” for the next one.",
  },
  {
    anchor: "log-photos",
    title: "A photo here becomes a memory",
    body: "Attach a picture from the session and it goes into Memories on your profile — a photo album built out of sessions you actually did, rather than one more thing to keep up.",
  },
  {
    anchor: "log-save",
    title: "Saving is what feeds the rest",
    body: "Your calendar, your personal records and your place on the leaderboards all come from this. Train at a gym the app knows and it offers you the rating screen on the way out.",
  },
  {
    press: "log-cancel",
    anchor: "profile-leaderboards",
    title: "Where you stand",
    body: "Three numbers: how you rank among your housemates, how your house ranks, and where you sit on campus. Tap through for the full boards.",
  },

  {
    anchor: null,
    title: "That's the whole app",
    body: "Four tabs, nothing hidden. You can walk through this again whenever you like — “Take the tour” in Settings.",
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

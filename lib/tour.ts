/*
  THE FIRST-RUN TOUR — the app explaining its own shape.
  ---------------------------------------------------------------------------
  Someone who finishes onboarding is dropped onto /gyms with four tabs and no
  idea that three of them exist. This is the five-step tour that fixes that: it
  dims the screen and lights up each REAL tab in turn, so what you learn is
  where the thing physically is, not a description of it.

  All the copy lives here rather than in the overlay, so it can be read and
  changed without touching component code (rule 7). `anchor` is the value of a
  `data-tour` attribute somewhere in the app — currently on the tab links in
  BottomNav (phone) and SideNav (laptop), which both carry the same names.
  A step with `anchor: null` has nothing to point at and shows as a centred
  card; that's the closer.

  "Have they seen it?" is kept in localStorage, NOT the database. It needs no
  SQL to be applied before the feature works, and the worst thing a lost flag
  can do is show a four-step tour a second time. If it ever needs to follow an
  account between devices, it moves to a `tourSeen` key on `profiles.data` —
  merged the way saveVarsitySetup does it in components/AppState.tsx.
*/

export type TourStep = {
  /** `data-tour` value of the element to light up; null = a centred card. */
  anchor: string | null;
  title: string;
  body: string;
};

export const appTour: TourStep[] = [
  {
    anchor: "tab-/gyms",
    title: "Gyms",
    body: "Every gym on campus — the hours, what kit is inside and how busy it is right now. Tap the heart on any of them to keep the ones you actually use at the top.",
  },
  {
    anchor: "tab-/match",
    title: "Match",
    body: "Find someone to train with. Filter by what you train, when you're free and how long you've been at it, and the app tells you why each person is a fit.",
  },
  {
    anchor: "tab-/messages",
    title: "Messages",
    body: "Where a match turns into an actual session. Your one-to-one chats live here, alongside the open community channels.",
  },
  {
    anchor: "tab-/profile",
    title: "Profile",
    body: "Your training history, personal records and photos. Settings sit behind the gear in the corner — notifications, light or dark, and your answers.",
  },
  {
    anchor: null,
    title: "That's the whole app",
    body: "Four tabs, nothing hidden. You can run this again whenever you like — it's “Take the tour” in Settings.",
  },
];

/* ── Has this account seen it? ──────────────────────────────────────────── */

// Same shape as the app's other per-user keys (`gymFavorites:${userId}` in
// lib/gymSocial.ts, `workoutLogs:${userId}` in lib/supabase/workouts.ts).
const seenKey = (userId: string) => `appTourSeen:${userId}`;

export function hasSeenTour(userId: string): boolean {
  if (typeof window === "undefined") return true; // never auto-run on the server
  try {
    return window.localStorage.getItem(seenKey(userId)) === "1";
  } catch {
    // Private mode / storage disabled. Treat it as seen rather than showing the
    // tour on every single page load.
    return true;
  }
}

export function markTourSeen(userId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(seenKey(userId), "1");
  } catch {
    /* nothing to do — the tour just runs again next time */
  }
}

export function clearTourSeen(userId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(seenKey(userId));
  } catch {
    /* ignore */
  }
}

/* ── Asking for it from outside the tabs ────────────────────────────────── */
/*
  Settings lives at /settings, OUTSIDE the tab shell — it has no bottom nav and
  no sidebar, so there is nothing there for the tour to point at. "Take the
  tour" therefore leaves a request behind and sends you to /gyms, where the
  shell picks it up. sessionStorage rather than a query parameter: it survives
  the navigation, needs no Suspense boundary, and leaves no ?tour=1 stuck in
  the address bar to re-fire on every refresh.
*/
const REQUEST_KEY = "appTourRequest";

export function requestTour() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(REQUEST_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** True once, if a tour was requested. Reading it clears the request. */
export function takeTourRequest(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const asked = window.sessionStorage.getItem(REQUEST_KEY) === "1";
    if (asked) window.sessionStorage.removeItem(REQUEST_KEY);
    return asked;
  } catch {
    return false;
  }
}

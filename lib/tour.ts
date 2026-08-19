/*
  THE TOURS — the app explaining its own shape, a few steps at a time.
  ---------------------------------------------------------------------------
  Not one long walk-through at sign-up. Each screen teaches itself the FIRST
  time you open it, in two or three steps, and then never again:

    tabs     first time on /gyms (where onboarding leaves you) — the four tabs
    gym      first time you open any gym's own page
    match    first time on /match — what the three sub-tabs are for
    profile  first time on /profile

  Why split it up: the app hides what you haven't got yet (no calendar until a
  session exists, no Memories until a photo does — audit #22), so a tour that
  ran everything at sign-up would be explaining empty screens. Teaching each
  screen on arrival means every step points at something real.

  All the copy lives here rather than in the overlay, so it can be read and
  changed without touching component code (rule 7). `anchor` is the value of a
  `data-tour` attribute somewhere in the app. A step with `anchor: null` has
  nothing to point at and shows as a centred card.

  "Have they seen it?" is kept in localStorage, NOT the database. It needs no
  SQL to be applied before the feature works, and the worst a lost flag can do
  is teach a screen twice. If it ever needs to follow an account between
  devices, it moves to a `tourSeen` key on `profiles.data` — merged the way
  saveVarsitySetup does it in components/AppState.tsx.
*/

export type TourStep = {
  /** `data-tour` value of the element to light up; null = a centred card. */
  anchor: string | null;
  title: string;
  body: string;
  /*
    Click the anchor before lighting it. Only for controls that SWITCH what's on
    screen — Match's three sub-tabs — so the step shows the thing it describes
    rather than describing something you can't see.
  */
  activate?: boolean;
};

export type TourId = "tabs" | "gym" | "match" | "profile";

export const tours: Record<TourId, TourStep[]> = {
  tabs: [
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
      body: "Four tabs, nothing hidden. Each one will explain itself the first time you open it — and you can run all of this again from “Take the tour” in Settings.",
    },
  ],

  gym: [
    {
      anchor: "gym-rate",
      title: "This part is you telling the app",
      body: "Tap a star after you've trained — that's where a gym's rating comes from. “How busy right now” is the one people check before setting off, and it only knows what someone reports.",
    },
    {
      anchor: "gym-partner",
      title: "Find a partner at this gym",
      body: "This carries the gym across to Match, so you're looking at people who train here rather than everyone on campus.",
    },
  ],

  match: [
    {
      anchor: "match-tab-browse",
      title: "Browse — everyone, ranked",
      body: "People sorted by how well they fit you, with the reason spelled out under each name. Start here when you just want to find somebody.",
      activate: true,
    },
    {
      anchor: "match-tab-session",
      title: "Session — one specific slot",
      body: "Say what you want to train, which day and what time, and this searches for people free exactly then. Use it when you already know when you're going.",
      activate: true,
    },
    {
      anchor: "match-tab-buddy",
      title: "Buddy Board — post and let them come",
      body: "Put up what you're looking for instead of searching, or answer somebody else's post. Posts cover the coming week and then expire.",
      activate: true,
    },
  ],

  profile: [
    {
      anchor: "profile-log",
      title: "Log Session",
      body: "The button the rest of this screen is waiting on. Log what you did and your calendar, your records, your photos and your place on the leaderboards all follow from it.",
    },
    {
      anchor: "profile-leaderboards",
      title: "Where you stand",
      body: "Three numbers: how you rank among your housemates, how your house ranks, and where you sit on campus. Tap through for the full boards.",
    },
  ],
};

/* ── Has this account seen a given tour? ────────────────────────────────── */

// Same shape as the app's other per-user keys (`gymFavorites:${userId}` in
// lib/gymSocial.ts, `workoutLogs:${userId}` in lib/supabase/workouts.ts).
const seenKey = (id: TourId, userId: string) => `appTourSeen:${id}:${userId}`;

export function hasSeenTour(id: TourId, userId: string): boolean {
  if (typeof window === "undefined") return true; // never auto-run on the server
  try {
    return window.localStorage.getItem(seenKey(id, userId)) === "1";
  } catch {
    // Private mode / storage disabled. Treat it as seen rather than teaching
    // the same screen on every single page load.
    return true;
  }
}

export function markTourSeen(id: TourId, userId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(seenKey(id, userId), "1");
  } catch {
    /* nothing to do — it just runs again next time */
  }
}

/** Forget every tour, so the whole app teaches itself again from scratch. */
export function resetAllTours(userId: string) {
  if (typeof window === "undefined") return;
  try {
    (Object.keys(tours) as TourId[]).forEach((id) =>
      window.localStorage.removeItem(seenKey(id, userId))
    );
  } catch {
    /* ignore */
  }
}

/* ── Asking for one from outside the tabs ───────────────────────────────── */
/*
  Settings lives at /settings, OUTSIDE the tab shell — it has no bottom nav and
  no sidebar, so there is nothing there for a tour to point at. "Take the tour"
  therefore leaves a request behind and sends you to /gyms, where the shell
  picks it up. sessionStorage rather than a query parameter: it survives the
  navigation, needs no Suspense boundary, and leaves no ?tour=1 stuck in the
  address bar to re-fire on every refresh.
*/
const REQUEST_KEY = "appTourRequest";

export function requestTour(id: TourId) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(REQUEST_KEY, id);
  } catch {
    /* ignore */
  }
}

/** True once, if THIS tour was requested. Reading it clears the request. */
export function takeTourRequest(id: TourId): boolean {
  if (typeof window === "undefined") return false;
  try {
    const asked = window.sessionStorage.getItem(REQUEST_KEY) === id;
    if (asked) window.sessionStorage.removeItem(REQUEST_KEY);
    return asked;
  } catch {
    return false;
  }
}

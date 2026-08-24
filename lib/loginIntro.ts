/*
  "A SIGN-IN JUST HAPPENED" — the one-shot flag the welcome animation hangs on.

  The welcome (components/SchoolIntro.tsx) must play when someone SIGNS IN, and
  never when they simply open the app again on a session they already had. The
  session itself cannot tell those two apart — it looks identical either way —
  so the sign-in screen leaves this note behind and the first screen on the far
  side picks it up and tears it off.

  sessionStorage, not localStorage, on purpose:
    • it belongs to ONE tab, so a second tab doesn't get a welcome it never
      asked for, and it is gone when the tab closes;
    • it survives a full page load — which the sign-in always is (a redirect),
      and which the Google round-trip is twice over.

  Every call is wrapped: storage throws in private mode in some browsers, and a
  missing animation must never be the thing that stops someone signing in.
*/
const KEY = "unisport.welcome";

/** Leave the note. Called the moment a sign-in is known to have worked. */
export function markSignIn(): void {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    /* no storage — the welcome is skipped, nothing else changes */
  }
}

/** Is there a note? Reading it changes nothing — see consumeSignIn to tear it off. */
export function peekSignIn(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** Tear the note off, so the welcome can only ever play once. */
export function consumeSignIn(): boolean {
  try {
    const pending = sessionStorage.getItem(KEY) === "1";
    if (pending) sessionStorage.removeItem(KEY);
    return pending;
  } catch {
    return false;
  }
}

/** Take the note back — a sign-in we announced early and that then failed. */
export function clearSignIn(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to undo */
  }
}

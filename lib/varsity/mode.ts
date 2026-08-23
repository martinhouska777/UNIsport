/*
  WHICH MODE ARE YOU IN — a one-word marker so the Varsity intro animation
  plays on the SWITCH into Varsity Mode, and not merely whenever the varsity
  shell happens to mount again.

  The problem it solves: Settings (/settings) is shared by both modes and sits
  OUTSIDE the varsity layout, so stepping into it unmounts the whole varsity
  shell. Coming back re-mounted the intro and replayed the title sequence, even
  though you never left Varsity Mode.

  So "mode" is remembered as state rather than read off the URL:
    • the normal app shell marks "student" when it mounts
    • the varsity shells (athlete + coach console) mark "varsity"
    • mode-neutral screens (Settings, setup, waiting) mark nothing
  and the intro only plays when the mark isn't "varsity" yet.

  sessionStorage, not localStorage: it is per tab and dies with the tab, so a
  freshly opened tab still gets the title sequence, while a reload inside
  Varsity Mode does not.
*/
export type AppMode = "student" | "varsity";

const KEY = "unisport.mode";

export function markMode(mode: AppMode) {
  try {
    sessionStorage.setItem(KEY, mode);
  } catch {
    // Private mode / storage disabled: the intro simply plays on every mount,
    // which is what it did before this existed.
  }
}

/** True when we are ALREADY in Varsity Mode (so the intro should not replay). */
export function inVarsityMode(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "varsity";
  } catch {
    return false;
  }
}

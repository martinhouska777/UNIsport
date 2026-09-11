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

/*
  ONCE A DAY, at most. The sessionStorage mark above dies with the tab — and an
  installed PWA is a fresh tab every morning, because the phone throws it out
  overnight. So "only on the switch into Varsity Mode" meant, in practice, 2.8
  seconds of oars at 5:12am every single day. This second mark lives in
  localStorage under the calendar date it last played on: the film plays the
  first time you enter Varsity Mode on a given day, and not again that day.
*/
const INTRO_KEY = "unisport.varsityIntroDay";
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

export function introShownToday(): boolean {
  try {
    return localStorage.getItem(INTRO_KEY) === todayKey();
  } catch {
    return false;
  }
}

export function markIntroShown() {
  try {
    localStorage.setItem(INTRO_KEY, todayKey());
  } catch {
    // Storage disabled: the intro plays once per tab instead, as before.
  }
}

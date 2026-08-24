/*
  A DIFFERENT UNIVERSITY ON EVERY SIGN-IN — the white-label demo, in motion.

  Which school you are at normally comes from the address you signed in with
  (lib/universityEmail.ts). This is the fallback for an address that is NOT one
  we recognise — a personal address, or a campus the app isn't live at yet.

  Rather than always dropping such an account on Harvard, it rolls one of the
  eight and never repeats the one showing now, so each sign-in wears a
  different school end to end: the welcome animation, the crest, the theme, the
  gyms, the words for the residential gyms. It is the promise of the whole
  project made visible in two seconds, without a single line of per-school code.

  It can never override a real university address — see AppState, where the
  address is read first and this is only reached if nothing matched. And it is
  temporary: once the app is live at more campuses, an unrecognised address is
  a waitlist question, not a dice roll.

  Kept in localStorage rather than sessionStorage so the "don't repeat" memory
  survives closing the tab — otherwise the same school would come up twice in a
  row often enough to look broken.
*/
import { getUniversity, universities } from "@/lib/themes";

const KEY = "unisport.demoSchool";

/** The school rolled at the last sign-in, if it is still one we have. */
export function readDemoSchool(): string | null {
  try {
    const saved = localStorage.getItem(KEY);
    return saved && getUniversity(saved) ? saved : null;
  } catch {
    return null;
  }
}

/** Roll the next one, never the school that is showing now. */
export function rollDemoSchool(): string {
  const showing = readDemoSchool();
  const choices = Object.keys(universities).filter((key) => key !== showing);
  const next = choices[Math.floor(Math.random() * choices.length)];
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* no storage — this sign-in gets a school, the next one re-rolls blind */
  }
  return next;
}

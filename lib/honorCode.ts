/*
  THE GYM HONOR CODE — the one thing standing behind a self-reported number.
  ---------------------------------------------------------------------------
  Every figure in the League is typed in by a person. There is no watch, no
  Strava, no turnstile. On a campus that is fine, and better than fine: the
  people you are ranked against are the people you live with, and they know
  perfectly well whether you were at the gym. Social enforcement beats anything
  we could code.

  So instead of pretending to verify, we ask — once, before the boards open —
  in the register of the college honour code every student has already signed.
  Anyone who has read the real one will spot it in about four words; everyone
  else just reads a slightly pompous gym rule. That is the joke, and it also
  happens to be the actual policy.

  IT IS DATA, NOT COPY IN A COMPONENT. The app is white-label: the same screen
  serves eight schools. The default text below names whichever school you are
  signed in to, and any school that wants its own wording gets an entry in
  `honorCodeByUniversity` — the same "add a data entry, not new code" rule the
  themes and the gyms follow.

  Two real guards sit underneath it, so the honour code is not carrying the
  whole thing on its own: only two sessions a day count toward anything
  (db/league.sql), and the big new-partner multiplier needs a partner picked
  from the people list, on a session the other person confirmed.
*/
import { getUniversity } from "@/lib/themes";

export type HonorCode = {
  title: string;
  paragraphs: string[];
  /** The button. */
  agree: string;
  /** The quieter one-liner that lives under the boards ever after. */
  footer: string;
};

/*
  "Harvard University" → "Harvard". The honour code reads as an institution
  talking about itself, so it wants the short name, not the legal one. Two
  schools do not follow the pattern and are named outright.
*/
const SHORT_NAME: Record<string, string> = {
  penn: "Penn",
  mit: "MIT",
};

export function schoolShortName(universityKey: string): string {
  const explicit = SHORT_NAME[universityKey];
  if (explicit) return explicit;
  const full = getUniversity(universityKey)?.name;
  if (!full) return "College";
  return full.replace(/\s+(University|College)$/i, "").trim() || full;
}

/*
  The default text, in the cadence of a college honour code. The two lines
  doing the comic work sit exactly where the serious ones sit in the original:
  "appropriate collection and use of kilograms" where the data clause goes, and
  "the wider world of gyms and group chats" as the closing cadence.

  It is doing a real job too. "Transparent acknowledgement of the contribution
  of others" is, in the original, about crediting other people's ideas. Here it
  is about not inventing a training partner — which is the one number actually
  worth protecting, because partners pay the 2.5x multiplier.
*/
function defaultHonorCode(school: string): HonorCode {
  return {
    title: `The ${school} Gym Honor Code`,
    paragraphs: [
      `Members of the ${school} fitness community commit themselves to producing training logs of integrity — that is, logs that adhere to the physical and numerical standards of accurate attribution of sets, appropriate collection and use of kilograms, and transparent acknowledgement of the contribution of others to their sessions, records, streaks and levels.`,
      `Logging a session that did not happen, claiming a partner who was not there, passing off a warm-up as a working set, inflating a distance, or any other instance of athletic dishonesty violates the standards of our community, as well as the standards of the wider world of gyms and group chats.`,
    ],
    agree: "I agree",
    footer: "Every number here is self-reported. We trust you.",
  };
}

/**
 * Schools that want their own wording. Empty on purpose — every school gets
 * the default until one asks for something else, and then it is an entry here
 * rather than a change to the screen.
 */
export const honorCodeByUniversity: Record<string, HonorCode> = {};

export function honorCodeFor(universityKey: string): HonorCode {
  return honorCodeByUniversity[universityKey] ?? defaultHonorCode(schoolShortName(universityKey));
}

/*
  Accepted once, per person, on this device. It is not a contract and there is
  nothing to enforce, so it does not need a table — the same localStorage
  approach the gym favourites use until Supabase catches up.
*/
export const honorCodeKey = (userId: string) => `leagueHonorCode:${userId}`;

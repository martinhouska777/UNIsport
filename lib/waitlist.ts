/*
  THE WAITLIST — every word of it, and the one rule it enforces.
  ---------------------------------------------------------------------------
  The page is app/waitlist; the row it writes is db/waitlist.sql. This file
  holds the copy and the source list so neither is buried in a component
  (rule 7: data is the source of truth).

  WHAT IT IS FOR. The app is finished enough to use, but letting people in one
  at a time means each one arrives to an empty campus. So people are held here
  and let in together, starting at Harvard. That is the promise the copy makes
  and the only promise it is allowed to make.

  WHO IT ACCEPTS. Everybody. A Harvard address is what the page asks for,
  because Harvard is who opens first, but an address from anywhere is still
  written down rather than turned away — the Instagram account will reach
  students at schools the app has not got to yet, and bouncing them off the
  page loses them for good. `school` on the row is read off the domain, so the
  list sorts itself into "ready to let in" and "not yet" with no extra field.

  DRAFT for the owner: every string below is his to change.
*/
import { isUniversityEmail, universityForEmail } from "@/lib/universityEmail";

export const waitlist = {
  headline: "Get in on day one.",
  /* The owner's own words (2026-09-22): the two facts, nothing generic. */
  body: "UNIsport opens at Harvard first. Get an email when the app launches.",

  firstNameLabel: "First name",
  emailLabel: "Harvard email",
  emailPlaceholder: "you@college.harvard.edu",
  submit: "Join the waitlist",
  submitting: "Joining…",

  /* THE CODE (owner, 2026-10-15: "we want to verify the email"). A school
     address is checked with the same 6-digit code sign-up sends, and the same
     words as the sign-up screen (app/login). No password: that comes a week
     before opening, when they finish the account. */
  codeHeadline: "Check your email",
  codeSentTo: "Code sent to",
  confirm: "Confirm",
  confirming: "Please wait…",
  resend: "Send a new code",
  back: "Back",
  errorSend: "The code didn't send. Try again in a minute.",

  /* DONE — the same screen whether they were new or already on the list.
     Telling somebody "you were already on it" serves nothing and reads like a
     telling-off. */
  doneHeadline: "You're on the list.",
  doneBody: "You'll get an email before Harvard opens.",
  /* The other half of the loop: the list is fed by Instagram, so the screen at
     the end of it sends people back there. */
  doneFollow: "Follow along until then",

  errorGeneric: "That didn't save. Try once more?",
  errorEmail: "That doesn't look like an email address.",
  /* An empty box used to be told it "doesn't look like an email" (launch
     audit 2026-09-27, item 43). */
  errorEmpty: "Enter your email address.",

  /* The small link under the button (launch audit 2026-09-27, item 4): the
     page collects an address, so it links to what is done with it. */
  privacy: "Privacy policy",
  privacyHref: "/privacy",
} as const;

/* WHERE THEY CAME FROM. Read off `?from=` and matched against this list —
   anything unrecognised is stored as nothing rather than as itself, so the
   column can never be filled with junk from a hand-edited URL.

   The bio link is the bare address, which is what looks trustworthy in a
   profile; the tagged links are for places the URL is never shown, like a
   story sticker. Add a line here to start tracking a new place. */
export const WAITLIST_SOURCES = ["ig", "ig-story", "tiktok", "site"] as const;
export type WaitlistSource = (typeof WAITLIST_SOURCES)[number];

export function waitlistSource(raw: string | null | undefined): WaitlistSource | null {
  const v = (raw ?? "").trim().toLowerCase();
  return (WAITLIST_SOURCES as readonly string[]).includes(v) ? (v as WaitlistSource) : null;
}

/* Shaped like an email, at all? Deliberately loose — the only addresses worth
   rejecting here are the ones that are obviously not addresses. Anything
   subtler is caught by the invitation bouncing, not by a regex arguing with
   somebody about their own email. */
export function looksLikeEmail(raw: string): boolean {
  const v = raw.trim();
  if (v.length < 6 || v.length > 254) return false;
  return /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(v);
}

/*
  FOR TESTING (owner, 2026-10-15: "i want all email not just university now so
  i can test it"). While true, EVERY address gets the code, and with it an
  account. Set it back to false before opening day: after that, an account on
  any address could walk into the app.
*/
export const CODE_FOR_EVERY_ADDRESS = true;

/*
  Does this address get a code? Normally the same rule as sign-up
  (lib/universityEmail): a school address, or the owner's test inbox. The code
  makes the UNIsport account (no password yet), which only a school address
  may have. Any other address is written down, without one.
*/
export function getsCode(email: string): boolean {
  return CODE_FOR_EVERY_ADDRESS || isUniversityEmail(email);
}

/** Which school this address belongs to — the short name, or null. */
export function waitlistSchool(email: string): string | null {
  return universityForEmail(email)?.shortName ?? null;
}

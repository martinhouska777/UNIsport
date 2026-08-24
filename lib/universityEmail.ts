/*
  WHO MAY SIGN UP — the university-email rule, as data.
  ---------------------------------------------------------------------------
  The landing page's main button says "Get started with .edu", and the FAQ says
  students sign up with their university email. Until now nothing checked it,
  so any address worked. This file is that check, and it lives in lib/ (rule 7)
  because WHICH addresses count is content that changes per country, not logic
  that changes per screen.

  The rule:
    • any address whose domain ends in `.edu` — every US university, which is
      all eight schools the landing page cycles through; and
    • anything listed in EXTRA_DOMAINS below.

  Adding a university outside the US = adding a line to EXTRA_DOMAINS. It is a
  DATA edit, not new code — the same principle as lib/themes.ts.

  Deliberately NOT enforced when logging in: only when an account is created.
  An address that already has an account keeps working whatever it is, so
  nobody who is already in gets locked out by a rule added after they joined.

  The same domain also says WHICH university you are at — see
  universityForEmail() at the bottom. That is the whole reason nobody is ever
  asked to pick their school from a list: they already told us when they typed
  their address, and an address cannot be picked wrong.
*/
import { universities, type University } from "@/lib/themes";

/*
  Domains that are university addresses but do not end in `.edu`. Empty today —
  the app is live at Harvard only. Examples of what belongs here when the app
  reaches them: "cuni.cz" (Charles University), "ox.ac.uk", "ethz.ch". Use the
  bare domain, lower case; subdomains of it are accepted automatically, so
  "cuni.cz" also lets in "fsv.cuni.cz".
*/
export const EXTRA_DOMAINS: string[] = [];

/** The domain part of an address, lower case — "" if it isn't shaped like an email. */
function domainOf(email: string): string {
  const at = email.trim().toLowerCase().lastIndexOf("@");
  if (at < 1) return "";
  return email.trim().toLowerCase().slice(at + 1);
}

/**
 * Is this a university address?
 *
 * `.edu` is matched on the END of the domain, so "student.harvard.edu" passes
 * and "harvard.edu.example.com" does not — the trailing-dot check is the whole
 * defence against a lookalike domain.
 */
export function isUniversityEmail(email: string): boolean {
  const domain = domainOf(email);
  if (!domain) return false;
  if (domain === "edu" || domain.endsWith(".edu")) return true;
  return EXTRA_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
}

/** What to tell someone whose address was turned away. One sentence, no blame. */
export const UNIVERSITY_EMAIL_MESSAGE =
  "Please sign up with your university email — the address ending in .edu. UNIsport is only for students at a university it is live at.";

/**
 * WHICH university is this address at? — the answer the whole theme hangs on.
 *
 * Reads the `domains` list on each school in lib/themes.ts, so a new campus is
 * a data edit there and nothing changes here. Matched on the END of the domain
 * for the same reason as above: "college.harvard.edu" is Harvard, and
 * "harvard.edu.example.com" is nobody.
 *
 * Returns undefined for an address we do not recognise — a university the app
 * is not live at yet, or a personal address on an older account. The caller
 * decides what that means; nothing here turns anyone away.
 */
export function universityForEmail(email: string | null | undefined): University | undefined {
  const domain = domainOf(email ?? "");
  if (!domain) return undefined;
  return Object.values(universities).find((u) =>
    u.domains.some((d) => domain === d || domain.endsWith(`.${d}`)),
  );
}

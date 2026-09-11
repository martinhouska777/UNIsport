/*
  INVITE A HOUSEMATE — the link and the words, as data.
  ---------------------------------------------------------------------------
  The app is worth nothing to a student until several people in their house
  are on it, and until now there was no way to invite anyone. This builds the
  one link every Share button sends: it lands on the join screen (/join) with
  the school and the house in the address, so the person who opens it sees
  "Join Adams House on UNIsport at Harvard" and a sign-up button — not a blank
  log-in form.

  The wording is data (rule 7). It names the SCHOOL and the HOUSE because those
  are the two words that make it a message from a housemate rather than an
  advert: "Adams is on the leaderboard" is a reason; "download this app" isn't.

  Nothing here knows about components. shareInvite() uses the phone's own
  share sheet where there is one and falls back to copying the link, and says
  which it did so the button can say "Copied".
*/
import { SITE_URL } from "@/lib/siteUrl";
import { getUniversity } from "@/lib/themes";
import { residenceLabel } from "@/lib/onboarding";

export type Invite = {
  url: string;
  title: string;
  text: string;
};

/** The query keys the join screen reads. Short, because the link is read aloud. */
export const INVITE_PARAMS = { university: "u", house: "h", from: "by" } as const;

/**
 * The invite for one person to send.
 *  - `residence` is the house the link is ABOUT (usually the sender's own, but
 *    the race card lets you invite for any house that is short of people).
 *  - `fromName` is who is asking; it rides in the link so the join screen can
 *    say "Sam invited you".
 */
export function buildInvite(input: {
  universityKey: string;
  residence: string | null | undefined;
  fromName?: string | null;
}): Invite {
  const uni = getUniversity(input.universityKey);
  const school = uni?.shortName ?? "your school";
  const house = input.residence ? residenceLabel(input.residence) : null;

  const params = new URLSearchParams();
  params.set(INVITE_PARAMS.university, input.universityKey);
  if (input.residence) params.set(INVITE_PARAMS.house, input.residence);
  if (input.fromName?.trim()) params.set(INVITE_PARAMS.from, input.fromName.trim());
  const url = `${SITE_URL}/join?${params.toString()}`;

  const title = house ? `Join ${house} on UNIsport` : `Join UNIsport at ${school}`;
  const text = house
    ? `${house} is on the leaderboard at ${school} and we need people. UNIsport finds you a training partner at your gym, at your hour — and every session you log counts for the house.`
    : `UNIsport finds you a training partner at ${school} — same gym, same hour — and every session you log counts for your house.`;

  return { url, title, text };
}

export type ShareOutcome = "shared" | "copied" | "failed";

/**
 * Open the phone's share sheet with the invite; on a laptop (or where the
 * sheet is refused) copy the link and text instead. A dismissed share sheet is
 * reported as "failed" so the button does nothing rather than claiming a copy.
 */
export async function shareInvite(invite: Invite): Promise<ShareOutcome> {
  if (typeof navigator === "undefined") return "failed";
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
  if (typeof nav.share === "function") {
    try {
      await nav.share({ title: invite.title, text: invite.text, url: invite.url });
      return "shared";
    } catch (e) {
      // AbortError = they closed the sheet. Anything else: fall through to copy.
      if ((e as { name?: string }).name === "AbortError") return "failed";
    }
  }
  try {
    await navigator.clipboard.writeText(`${invite.text}\n${invite.url}`);
    return "copied";
  } catch {
    return "failed";
  }
}

"use client";

import { useAppState } from "@/components/AppState";
import Avatar from "@/components/messages/Avatar";
import { teamFor } from "@/lib/cohorts";

/*
  ONE FACE FOR A PERSON, EVERYWHERE ON THE LEADERBOARDS — the Messages avatar
  (owner, 2026-09-27: "somewhere it is round, and now it is square … make sure
  it looks similar everywhere … I like how it is done on messages").

  Until then a person was drawn four ways on this one tab: a square house-
  tinted tile with a plain figure in the lists, a round tinted circle on the
  podium, a square theme-tinted tile in a house's member sheet, and a round
  photo ring for you. Now it is always Messages' circle: the photo when there
  is one, otherwise the initials in their house's (or first-year cohort's) two
  colours — the same face they have on Match and in a chat. That also brings
  the initials back, which the boards had dropped on 2026-09-06 ("no
  initials"); the owner's call now is to look like Messages.

  The colours are content data (lib/cohorts.ts teamFor → lib/gyms.ts), applied
  inline by InitialsAvatar — rule 1's exception.
*/
export default function PersonAvatar({
  name,
  residence,
  classYear,
  photo,
  size,
}: {
  name: string;
  residence: string | null | undefined;
  classYear: string | null | undefined;
  /** A profile photo, when there is one (only ever your own here). */
  photo?: string | null;
  size: number;
}) {
  const { universityKey } = useAppState();
  const colors = teamFor(universityKey, residence, classYear)?.colors ?? null;
  return <Avatar size={size} src={photo || null} name={name} colors={colors} />;
}

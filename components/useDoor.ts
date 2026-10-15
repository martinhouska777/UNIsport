"use client";

/*
  useDoor() — may THIS account use the student side yet? (lib/opening.ts)

  Closed means all three: the school's opening morning hasn't come, the
  account isn't on a team (rowers are in already, on Varsity), and it isn't
  the owner's test inbox. Used by the student shell, which sends a closed
  account to /opening, and by /opening, which sends it back once it's open.

  `checking` is true only while the team lookup is still out and the answer
  hangs on it. After opening day nothing is looked up for this: an open school
  is open to everyone, at once.

  The door opens by itself: a screen left on at 6:59 lets them in at 7:00, and
  a phone woken from a pocket checks the clock again (a timer may not have run
  while it slept).
*/
import { useEffect, useState } from "react";
import { useAppState } from "@/components/AppState";
import { useMembership } from "@/components/varsity/useMembership";
import { isSchoolOpen, opensAtFor } from "@/lib/opening";
import { isTestInbox } from "@/lib/universityEmail";

// setTimeout's ceiling (about 24.8 days). Further off than that, the wake-up
// check below is what notices the morning.
const LONGEST_TIMER_MS = 2_147_483_647;

export function useDoor(): { checking: boolean; closed: boolean } {
  const { ready, email, universityKey } = useAppState();
  const { loading, isMember } = useMembership();
  const [open, setOpen] = useState(() => isSchoolOpen(universityKey));

  useEffect(() => {
    const check = () => setOpen(isSchoolOpen(universityKey));
    check();
    const at = opensAtFor(universityKey);
    const wait = at ? at.getTime() - Date.now() : 0;
    const timer = wait > 0 && wait < LONGEST_TIMER_MS ? window.setTimeout(check, wait + 1000) : undefined;
    const onShow = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onShow);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [universityKey]);

  if (open || isTestInbox(email)) return { checking: !ready, closed: false };
  if (!ready || loading) return { checking: true, closed: false };
  /*
    A lookup that kept failing keeps the door shut. Waiting students far
    outnumber the rowers, and a broken lookup must not let all of them in
    early. A rower caught by a blip still has Varsity, and the next load asks
    again.
  */
  return { checking: false, closed: !isMember };
}

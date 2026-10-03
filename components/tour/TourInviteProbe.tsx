"use client";

/*
  IS ANYONE WAITING FOR AN ANSWER? — asked once, as the walk starts.

  The app walk's Messages part opens the chat where someone planned a session
  with you (lib/tour.ts). Nobody has, for most students on their first day —
  and the walk should know that BEFORE it taps into Messages, not after: a
  finger that opens Messages, finds nothing and leaves again is a detour with
  no reason (owner, 2026-10-03: "what are you tapping").

  So the student shell mounts this. While a walk runs it asks for your pending
  invites, and if there are none it says so with `data-tour-absent` — the walk
  then passes over the whole chat group without moving (TourOverlay).

  Mounted fresh for each walk (the outer component only renders it while one
  runs), so a replay asks again: an invite may have arrived since.
*/
import { useEffect, useState } from "react";
import { listPendingInvites } from "@/lib/supabase/sessionPlans";
import { useTourRunning } from "@/lib/tour";

export default function TourInviteProbe() {
  return useTourRunning() ? <Probe /> : null;
}

function Probe() {
  const [none, setNone] = useState(false);
  useEffect(() => {
    let active = true;
    listPendingInvites()
      .then((invites) => active && setNone(invites.length === 0))
      // Couldn't ask: the chat would not be found either, so don't go looking.
      .catch(() => active && setNone(true));
    return () => {
      active = false;
    };
  }, []);
  return none ? <span hidden data-tour-absent="msg-invite-dm" /> : null;
}

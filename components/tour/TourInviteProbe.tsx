"use client";

/*
  IS ANYONE WAITING FOR AN ANSWER? — asked once, as the walk starts.

  The app walk's Messages part opens the chat where someone planned a session
  with you (lib/tour.ts). Nobody has, for most students on their first day —
  and for a demo account once its one invite was accepted on an earlier run.

  So the student shell mounts this. While a walk runs it asks for your pending
  invites, and if there are none it puts the EXAMPLE invite in front of the
  walk instead (lib/tourExample.ts): a chat that exists only on this screen,
  for as long as the walk does. The Messages part is never skipped any more
  (owner, 2026-10-03: "I still don't see the messages").

  Mounted fresh for each walk (the outer component only renders it while one
  runs), so a replay asks again: an invite may have arrived since. Unmounting
  — the walk is over — takes the example away again.
*/
import { useEffect } from "react";
import { useAppState } from "@/components/AppState";
import { listPendingInvites } from "@/lib/supabase/sessionPlans";
import { useTourRunning } from "@/lib/tour";
import { endTourExample, startTourExample } from "@/lib/tourExample";

export default function TourInviteProbe() {
  return useTourRunning() ? <Probe /> : null;
}

function Probe() {
  const { universityKey } = useAppState();
  useEffect(() => {
    let active = true;
    listPendingInvites()
      // Couldn't ask: the example needs nothing from the database either.
      .catch(() => [])
      .then((invites) => {
        if (active && invites.length === 0) startTourExample(universityKey);
      });
    return () => {
      active = false;
      endTourExample();
    };
  }, [universityKey]);
  return null;
}

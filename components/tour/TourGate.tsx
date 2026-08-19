"use client";

/*
  TOUR GATE — decides whether a screen's tour runs, then gets out of the way.

  Kept separate from the overlay so the decision is one readable line and the
  overlay stays purely about drawing. The tab shell mounts one of these per
  screen that has something to teach, and each screen's tour runs the FIRST
  time you open it (see lib/tour.ts for why it's split up rather than one long
  walk-through at sign-up).

  The answer is computed in a lazy initializer rather than an effect: this only
  ever mounts on the client, after the session and the route are both known, so
  it can be settled on the first render and never has to change afterwards.
*/
import { useState } from "react";
import TourOverlay from "@/components/tour/TourOverlay";
import { hasSeenTour, markTourSeen, takeTourRequest, tours, type TourId } from "@/lib/tour";

export default function TourGate({ id, userId }: { id: TourId; userId: string }) {
  // A request from Settings beats the seen flag — that is someone asking for it.
  const [run, setRun] = useState(() => takeTourRequest(id) || !hasSeenTour(id, userId));

  if (!run) return null;
  return (
    <TourOverlay
      steps={tours[id]}
      onDone={() => {
        setRun(false);
        markTourSeen(id, userId);
      }}
    />
  );
}

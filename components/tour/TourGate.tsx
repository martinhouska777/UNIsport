"use client";

/*
  TOUR GATE — decides whether the tour runs, then gets out of the way.

  Kept separate from the overlay so the decision is one readable line and the
  overlay stays purely about walking and drawing. The tab shell mounts exactly
  one of these, for the whole shell rather than per screen: the tour crosses
  tabs on its own now (see lib/tour.ts), so anything keyed to the current route
  would unmount itself halfway through its own walk.

  The answer is computed in a lazy initializer rather than an effect: this only
  ever mounts on the client, after the session is known, so it can be settled on
  the first render and never has to change afterwards.
*/
import { useState } from "react";
import TourOverlay from "@/components/tour/TourOverlay";
import { hasSeenTour, markTourSeen, takeTourRequest } from "@/lib/tour";

export default function TourGate({ userId }: { userId: string }) {
  // A request from Settings beats the seen flag — that is someone asking for it.
  const [run, setRun] = useState(() => takeTourRequest() || !hasSeenTour(userId));

  if (!run) return null;
  return (
    <TourOverlay
      onDone={() => {
        setRun(false);
        markTourSeen(userId);
      }}
    />
  );
}

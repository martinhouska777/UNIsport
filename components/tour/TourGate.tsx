"use client";

/*
  TOUR GATE — decides whether a walk runs, then gets out of the way.

  Kept separate from the overlay so the decision is one readable line and the
  overlay stays purely about walking and drawing. A shell mounts exactly one of
  these, for the whole shell rather than per screen: a tour crosses tabs on its
  own (see lib/tour.ts), so anything keyed to the current route would unmount
  itself halfway through its own walk.

  Which walk it runs is the `tour` prop — the app shell passes `appTour`, the
  Coach Console passes `coachTour`. Their seen-flags are separate, so someone
  who has been round the app is still shown the console the first time they
  open it.

  The answer is computed in a lazy initializer rather than an effect: this only
  ever mounts on the client, after the session is known, so it can be settled on
  the first render. The one thing that can change it afterwards is somebody
  pressing "Take the tour" in a Settings screen that lives INSIDE this same
  shell — that arrives as an event, because no re-mount happens to be read.
*/
import { useEffect, useState } from "react";
import TourOverlay from "@/components/tour/TourOverlay";
import { hasSeenTour, markTourSeen, onTourRequest, takeTourRequest, type Tour } from "@/lib/tour";

export default function TourGate({ tour, userId }: { tour: Tour; userId: string }) {
  // A request from Settings beats the seen flag — that is someone asking for it.
  const [run, setRun] = useState(() => takeTourRequest(tour) || !hasSeenTour(tour, userId));

  // …and a request raised while this gate is already mounted arrives here.
  useEffect(() => onTourRequest(tour, () => setRun(true)), [tour]);

  if (!run) return null;
  return (
    <TourOverlay
      tour={tour}
      onDone={() => {
        setRun(false);
        markTourSeen(tour, userId);
      }}
    />
  );
}

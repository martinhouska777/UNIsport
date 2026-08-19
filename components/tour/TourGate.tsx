"use client";

/*
  TOUR GATE — decides whether the first-run tour runs, then gets out of the way.

  Kept separate from the overlay so the decision is one readable line and the
  overlay stays purely about drawing. The tab shell mounts this only on /gyms,
  which is where onboarding lands you (OnboardingFlow finishes with
  replace("/gyms")) — so the tour can never ambush someone who opened a link
  straight into Messages.

  The answer is computed in a lazy initializer rather than an effect: this only
  ever mounts on the client, after the session and the route are both known, so
  it can be settled on the first render and never has to change afterwards.
*/
import { useState } from "react";
import TourOverlay from "@/components/tour/TourOverlay";
import { appTour, hasSeenTour, markTourSeen, takeTourRequest } from "@/lib/tour";

export default function TourGate({ userId }: { userId: string }) {
  // A request from Settings beats the seen flag — that is someone asking for it.
  const [run, setRun] = useState(() => takeTourRequest() || !hasSeenTour(userId));

  if (!run) return null;
  return (
    <TourOverlay
      steps={appTour}
      onDone={() => {
        setRun(false);
        markTourSeen(userId);
      }}
    />
  );
}

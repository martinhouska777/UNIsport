"use client";

/*
  useMembership() — "am I on a squad, and as what?"
  Used by the varsity shells (to bounce people who aren't members), the Coach
  Console (to decide which tabs exist) and the mode switcher (to show Varsity at
  all). Every screen that needs it calls this rather than re-implementing the
  lookup.

  The answer is SHARED (lib/varsity/membership: loadMembership): the first
  screen to ask pays for it, everyone after that is handed it synchronously.
  That matters for more than speed — a screen that mounts knowing nothing
  reports "no team", which is a real answer, and the screens act on it. The
  mode switcher used to send an approved member to /join for exactly that
  reason if they tapped Varsity before the reply landed.

  So: `loading` is true only while the answer is genuinely unknown, and it is
  false immediately when we already hold one. Anything that ROUTES on the
  answer must check `loading` first — "don't know yet" is not "no team".
*/
import { useCallback, useEffect, useState } from "react";
import { useAppState } from "@/components/AppState";
import {
  loadMembership,
  peekMembership,
  type MembershipAnswer,
} from "@/lib/varsity/membership";

type State = { userId: string | null; answer: MembershipAnswer | null };

/** Signed out is a KNOWN answer, not a pending one — derived, never fetched. */
const SIGNED_OUT: MembershipAnswer = { membership: null, failed: false };

export function useMembership() {
  const { ready, userId } = useAppState();
  const [state, setState] = useState<State>(() => ({
    userId,
    answer: peekMembership(userId),
  }));

  /*
    The account changed under us (signed in, signed out). Re-seed from what we
    hold for the NEW account in the same render, so nothing gets a frame of the
    previous account's squad — or of "no team" when we already know better.
    This is React's documented adjust-state-on-change pattern: the setState
    runs during render, and React re-renders before anything is painted.
  */
  if (state.userId !== userId) {
    setState({ userId, answer: peekMembership(userId) });
  }

  useEffect(() => {
    if (!ready || !userId) return; // signed out is answered below, not fetched
    let active = true;
    loadMembership(userId).then((answer) => {
      if (active) setState({ userId, answer });
    });
    return () => {
      active = false;
    };
  }, [ready, userId]);

  /* Ask the database again — the waiting screen polls with this while it waits
     to be approved, and the squad admin calls it after changing someone. It
     deliberately does NOT flip `loading` back on: the answer we hold is still
     the truth until the new one lands, and blanking it would make the screen
     flash on every poll. */
  const reload = useCallback(async () => {
    if (!userId) return;
    const answer = await loadMembership(userId, true);
    setState({ userId, answer });
  }, [userId]);

  // Nobody signed in is an answer we can give without asking anyone.
  const answer = state.answer ?? (ready && !userId ? SIGNED_OUT : null);
  const membership = answer?.membership ?? null;

  return {
    membership,
    /** True while the answer is genuinely unknown. Check this before routing. */
    loading: answer === null,
    /** The lookup was tried and kept failing — the answer is not trustworthy. */
    failed: answer?.failed ?? false,
    reload,
    // The two questions every caller actually asks.
    isMember: membership?.status === "approved",
    isPending: membership?.status === "pending",
  };
}

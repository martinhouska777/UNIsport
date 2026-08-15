"use client";

/*
  useMembership() — "am I on a squad, and as what?"
  Used by the varsity shells (to bounce people who aren't members), the Coach
  Console (to decide which tabs exist) and the mode switcher (to show Varsity at
  all). One small RPC; every screen that needs it calls this rather than
  re-implementing the lookup.
*/
import { useCallback, useEffect, useState } from "react";
import { useAppState } from "@/components/AppState";
import { fetchMyMembership, type Membership } from "@/lib/varsity/membership";

export function useMembership() {
  const { ready, userId } = useAppState();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) {
      setMembership(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setMembership(await fetchMyMembership(userId));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    (async () => {
      const m = userId ? await fetchMyMembership(userId) : null;
      if (active) {
        setMembership(m);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [ready, userId]);

  return {
    membership,
    loading,
    reload,
    // The two questions every caller actually asks.
    isMember: membership?.status === "approved",
    isPending: membership?.status === "pending",
  };
}

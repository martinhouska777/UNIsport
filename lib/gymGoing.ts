"use client";

/*
  WHO IS GOING WHERE — the Buddy Board, read by gym.

  The board (Match → Sessions) is the one place a student has already said
  "I'm training Thursday at 7". The Gyms tab is where people decide where to
  go. This hook joins the two: it reads every open post once (others' and your
  own) and hands them back grouped by gym name, so a gym card can say
  "3 going tonight · 5pm, 7pm, 8:30" and the gym page can list who.

  Re-reads once a minute, when the app comes back to the foreground, and the
  moment a post is made or removed anywhere on this phone (BOARD_CHANGE_EVENT).
*/
import { useCallback, useEffect, useState } from "react";
import { listBuddyBoard, listMyBuddyPosts } from "@/lib/supabase/buddyBoard";
import { hasSupabaseEnv } from "@/lib/supabase/client";
import { goingSummary, type GoingPost, type GoingSummary } from "@/lib/buddyBoard";

export const BOARD_CHANGE_EVENT = "buddyboard-change";
export const BOARD_POLL_MS = 60 * 1000;

/** Fire after posting / removing so every "going" line on screen updates. */
export function announceBoardChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(BOARD_CHANGE_EVENT));
}

export function useBoardByGym(userId: string | null) {
  const [byGym, setByGym] = useState<Map<string, GoingPost[]>>(new Map());

  useEffect(() => {
    if (!userId || !hasSupabaseEnv()) return;
    let active = true;
    const refresh = () =>
      Promise.all([listBuddyBoard(), listMyBuddyPosts()])
        .then(([others, mine]) => {
          if (!active) return;
          const next = new Map<string, GoingPost[]>();
          for (const p of others) {
            if (!p.gym) continue;
            const list = next.get(p.gym) ?? [];
            list.push({
              id: p.id,
              date: p.date,
              hour: p.hour,
              timeOfDay: p.timeOfDay,
              focus: p.focus,
              authorId: p.author,
              authorName: p.authorName,
              authorPhoto: p.authorPhoto,
              mine: false,
            });
            next.set(p.gym, list);
          }
          for (const p of mine) {
            if (!p.gym) continue;
            const list = next.get(p.gym) ?? [];
            list.push({
              id: p.id,
              date: p.date,
              hour: p.hour,
              timeOfDay: p.timeOfDay,
              focus: p.focus,
              authorId: userId,
              authorName: "You",
              authorPhoto: null,
              mine: true,
            });
            next.set(p.gym, list);
          }
          setByGym(next);
        })
        .catch(() => {
          /* offline, or the board table isn't there — the line simply stays absent */
        });
    refresh();
    const timer = setInterval(refresh, BOARD_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener(BOARD_CHANGE_EVENT, refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener(BOARD_CHANGE_EVENT, refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId]);

  /** The "going" line for one gym, by its display name — or null when nobody is. */
  const goingFor = useCallback(
    (gymName: string): GoingSummary | null => goingSummary(byGym.get(gymName) ?? []),
    [byGym],
  );

  return { goingFor };
}

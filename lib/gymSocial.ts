"use client";

/*
  GYM SOCIAL DATA — the signed-in user's own gym favourites (and, later, the
  ratings + crowd reports they submit).

  There is no shared database for this yet, so it lives in localStorage keyed by
  user id — the same "works offline / no DB needed" fallback the workout-log
  store uses (lib/supabase/workouts.ts). When Supabase gains a `gym_favorites`
  table this hook can swap its read/write for queries without touching callers.

  A small custom event keeps every mounted component in sync the moment a heart
  is toggled (so favouriting on the gym profile updates the gyms list instantly,
  in the same tab — the browser's own `storage` event only fires across tabs).
*/
import { useCallback, useEffect, useState } from "react";

const favKey = (userId: string) => `gymFavorites:${userId}`;
const CHANGE_EVENT = "gymsocial-change";

function readFavorites(userId: string): string[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(favKey(userId)) ?? "[]");
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeFavorites(userId: string, slugs: string[]) {
  if (typeof window === "undefined" || !userId) return;
  window.localStorage.setItem(favKey(userId), JSON.stringify(slugs));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

/**
 * Favourite gyms for one user. Returns the current list, an `isFavorite(slug)`
 * check, and a `toggle(slug)`. Stays live across components via CHANGE_EVENT.
 */
export function useFavorites(userId: string | null) {
  const uid = userId ?? "";
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setFavorites(readFavorites(uid));
    // Read once when this mounts / when the user id resolves, then stay
    // subscribed to changes from other components and other tabs. This is
    // syncing React to an external store (localStorage) — what effects are for.
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [uid]);

  const isFavorite = useCallback((slug: string) => favorites.includes(slug), [favorites]);

  const toggle = useCallback(
    (slug: string) => {
      const next = readFavorites(uid);
      const i = next.indexOf(slug);
      if (i >= 0) next.splice(i, 1);
      else next.push(slug);
      writeFavorites(uid, next);
      setFavorites(next.slice());
    },
    [uid],
  );

  return { favorites, isFavorite, toggle };
}

"use client";

/*
  useUnits() — the person's km/miles and kg/pounds choice.

  Screens all over the app show a distance or a weight, so this keeps a small
  module-level cache: the preference is fetched once per session and reused,
  rather than every calendar and profile mount making its own round trip. Saving
  updates the cache and notifies anything currently mounted, so a change in
  Settings shows up everywhere without a reload.
*/
import { useCallback, useEffect, useState } from "react";
import { useAppState } from "@/components/AppState";
import { defaultUnits, fetchUnits, saveUnits, type Units } from "@/lib/varsity/units";

let cache: { userId: string; units: Units } | null = null;
const listeners = new Set<(u: Units) => void>();

export function useUnits() {
  const { userId } = useAppState();
  const [units, setUnits] = useState<Units>(
    cache && cache.userId === userId ? cache.units : defaultUnits,
  );

  useEffect(() => {
    if (!userId) return;
    listeners.add(setUnits);
    if (cache?.userId === userId) setUnits(cache.units);
    else {
      let active = true;
      (async () => {
        const u = await fetchUnits(userId);
        cache = { userId, units: u };
        if (active) listeners.forEach((l) => l(u));
      })();
      return () => {
        active = false;
        listeners.delete(setUnits);
      };
    }
    return () => {
      listeners.delete(setUnits);
    };
  }, [userId]);

  const update = useCallback(
    async (next: Units) => {
      if (!userId) return;
      cache = { userId, units: next };
      listeners.forEach((l) => l(next)); // every mounted screen, immediately
      await saveUnits(userId, next);
    },
    [userId],
  );

  return { units, setUnits: update };
}

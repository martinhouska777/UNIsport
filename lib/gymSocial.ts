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
const ratingsKey = (userId: string) => `gymRatings:${userId}`;
const crowdKey = (userId: string) => `gymCrowd:${userId}`;
const CHANGE_EVENT = "gymsocial-change";

// A crowd report means "how busy is it RIGHT NOW", so it only counts as current
// for a couple of hours; after that the gym reads as "n/a" until someone reports
// again. (Product decision: only-recent.)
export const CROWD_FRESH_MS = 2 * 60 * 60 * 1000;

export type CrowdLevel = "quiet" | "moderate" | "busy" | "packed";

// The four crowd levels, in order, with their labels. Tones are THEME tokens
// (rule 1): green→gold→amber→red as it gets busier. No hardcoded colors.
export const CROWD_LEVELS: { key: CrowdLevel; label: string; tone: string }[] = [
  { key: "quiet", label: "Quiet", tone: "text-success" },
  { key: "moderate", label: "Moderate", tone: "text-accent" },
  { key: "busy", label: "Busy", tone: "text-warn" },
  { key: "packed", label: "Packed", tone: "text-danger" },
];
const crowdMeta = (level: CrowdLevel) =>
  CROWD_LEVELS.find((c) => c.key === level) ?? CROWD_LEVELS[0];
export const crowdLabel = (level: CrowdLevel) => crowdMeta(level).label;
export const crowdTone = (level: CrowdLevel) => crowdMeta(level).tone;

export type GymRating = { value: number; at: number }; // value 1..5, at = epoch ms
export type GymCrowd = { level: CrowdLevel; at: number };

/** "just now" / "20 min ago" / "3h ago" / "2d ago" — for "when was it rated". */
export function timeAgo(at: number): string {
  const s = Math.max(0, Math.floor((Date.now() - at) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

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

/* ── Ratings + crowd: a per-slug map of records, same storage approach ── */
function readMap<T>(key: string): Record<string, T> {
  if (typeof window === "undefined") return {};
  try {
    const raw = JSON.parse(window.localStorage.getItem(key) ?? "{}");
    return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, T>) : {};
  } catch {
    return {};
  }
}

function writeMap(key: string, value: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

/**
 * The user's gym ratings + crowd reports.
 *  - getRating(slug): their rating for a gym (with the time it was given), or null.
 *  - setRating(slug, value): rate / re-rate (1..5), stamped now.
 *  - getCrowd(slug): the latest crowd report IF still fresh (<2h), else null → n/a.
 *  - reportCrowd(slug, level): record how busy it is right now.
 * (With no shared DB yet these are this user's own entries; the display treats
 * them as the gym's rating/crowd. A real average arrives with the database.)
 */
export function useGymStats(userId: string | null) {
  const uid = userId ?? "";
  const [ratings, setRatings] = useState<Record<string, GymRating>>({});
  const [crowd, setCrowd] = useState<Record<string, GymCrowd>>({});

  useEffect(() => {
    const sync = () => {
      setRatings(readMap<GymRating>(ratingsKey(uid)));
      setCrowd(readMap<GymCrowd>(crowdKey(uid)));
    };
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [uid]);

  const getRating = useCallback(
    (slug: string): GymRating | null => ratings[slug] ?? null,
    [ratings],
  );

  const setRating = useCallback(
    (slug: string, value: number) => {
      const map = readMap<GymRating>(ratingsKey(uid));
      map[slug] = { value, at: Date.now() };
      writeMap(ratingsKey(uid), map);
      setRatings({ ...map });
    },
    [uid],
  );

  const getCrowd = useCallback(
    (slug: string): GymCrowd | null => {
      const c = crowd[slug];
      if (!c) return null;
      return Date.now() - c.at > CROWD_FRESH_MS ? null : c; // stale → n/a
    },
    [crowd],
  );

  const reportCrowd = useCallback(
    (slug: string, level: CrowdLevel) => {
      const map = readMap<GymCrowd>(crowdKey(uid));
      map[slug] = { level, at: Date.now() };
      writeMap(crowdKey(uid), map);
      setCrowd({ ...map });
    },
    [uid],
  );

  return { getRating, setRating, getCrowd, reportCrowd };
}

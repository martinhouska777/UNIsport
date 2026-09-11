"use client";

/*
  GYM SOCIAL DATA — favourites, the signed-in user's own gym rating, and the
  campus-wide crowd reports.

  Two kinds of storage, on purpose:
    • Favourites and YOUR star rating are yours alone, so they live in this
      browser's localStorage keyed by user id (the same "works offline / no DB
      needed" approach the workout-log store falls back to).
    • Crowd reports ("how busy right now") are only worth anything if OTHER
      people see them, so they are shared rows in Supabase (db/gym_crowd.sql,
      via lib/supabase/gymCrowd.ts). They used to sit in localStorage too, which
      meant nobody ever saw anyone else's report while the screen implied the
      campus had spoken.

  A small custom event keeps every mounted component in sync the moment a heart
  is toggled or a report is filed (so the gyms list updates the instant the gym
  page changes something, in the same tab — the browser's own `storage` event
  only fires across tabs).
*/
import { useCallback, useEffect, useState } from "react";
import { listCrowdReports, sendCrowdReport, type CrowdReport } from "@/lib/supabase/gymCrowd";

const favKey = (userId: string) => `gymFavorites:${userId}`;
const ratingsKey = (userId: string) => `gymRatings:${userId}`;
const CHANGE_EVENT = "gymsocial-change";

// A crowd report means "how busy is it RIGHT NOW", so it only counts as current
// for a couple of hours; after that the gym falls back to its typical-week
// prediction until someone reports again. (Product decision: only-recent.)
export const CROWD_FRESH_MS = 2 * 60 * 60 * 1000;
/** The same window in words — "2 hours" — so copy can never drift from the number. */
export const CROWD_FRESH_LABEL = (() => {
  const h = Math.round(CROWD_FRESH_MS / (60 * 60 * 1000));
  return h === 1 ? "1 hour" : `${h} hours`;
})();

// Reports change when people tap, not on a schedule — but somebody else's tap
// happens on THEIR phone, so this one re-reads once a minute (and whenever the
// app comes back to the foreground) to pick it up.
export const CROWD_POLL_MS = 60 * 1000;

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
const isCrowdLevel = (s: string): s is CrowdLevel => CROWD_LEVELS.some((c) => c.key === s);

export type GymRating = { value: number; at: number }; // value 1..5, at = epoch ms

/*
  What the campus says about ONE gym right now, boiled down from the fresh
  reports: the level most people gave, how many gave it, and when. `people` is
  the honest sample size the screen must show — "2 people said Busy" is a very
  different fact from "Busy".
*/
export type GymCrowd = {
  level: CrowdLevel;
  people: number; // how many said `level`
  at: number; // the most recent of those reports (epoch ms)
  oldestAt: number; // the oldest of those reports — decides "last hour" vs "last 2 hours"
  total: number; // everyone who reported this gym in the window, any level
  myLevel: CrowdLevel | null; // the signed-in user's own answer, if it is in the window
};

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

/*
  Fold one gym's fresh reports into a GymCrowd. The winning level is the one
  most people said; a tie goes to the level reported most recently. Null when
  there is nothing fresh — the caller then shows the prediction instead.
*/
export function summarizeCrowd(reports: CrowdReport[], now = Date.now()): GymCrowd | null {
  const fresh = reports.filter((r) => now - r.at <= CROWD_FRESH_MS && isCrowdLevel(r.level));
  if (fresh.length === 0) return null;

  const byLevel = new Map<CrowdLevel, { people: number; at: number; oldestAt: number }>();
  for (const r of fresh) {
    const level = r.level as CrowdLevel;
    const cur = byLevel.get(level);
    if (cur) {
      cur.people += 1;
      cur.at = Math.max(cur.at, r.at);
      cur.oldestAt = Math.min(cur.oldestAt, r.at);
    } else {
      byLevel.set(level, { people: 1, at: r.at, oldestAt: r.at });
    }
  }
  let winner: { level: CrowdLevel; people: number; at: number; oldestAt: number } | null = null;
  for (const [level, v] of byLevel) {
    if (!winner || v.people > winner.people || (v.people === winner.people && v.at > winner.at)) {
      winner = { level, ...v };
    }
  }
  const mine = fresh.find((r) => r.mine);
  return {
    ...winner!,
    total: fresh.length,
    myLevel: mine ? (mine.level as CrowdLevel) : null,
  };
}

/*
  The sentence that keeps a report honest, in two parts so a screen can colour
  the level word: ["2 people said", "Busy", "in the last hour"] or
  ["1 person said", "Quiet", "20 min ago"]. One voice gets its exact age; a
  group gets the window its oldest voice falls in, because "2 people said Busy
  20 min ago" would be claiming a precision the data does not have.
*/
export function crowdSentence(crowd: GymCrowd): { who: string; level: string; when: string } {
  const who = crowd.people === 1 ? "1 person said" : `${crowd.people} people said`;
  const level = crowdLabel(crowd.level);
  if (crowd.people === 1) return { who, level, when: timeAgo(crowd.at) };
  const age = Date.now() - crowd.oldestAt;
  const when = age <= 60 * 60 * 1000 ? "in the last hour" : `in the last ${CROWD_FRESH_LABEL}`;
  return { who, level, when };
}

/** The same sentence as one string, for tooltips and screen readers. */
export const crowdSummary = (crowd: GymCrowd) => {
  const s = crowdSentence(crowd);
  return `${s.who} ${s.level} ${s.when}`;
};

/** The short form for a card: "2 people" / "1 person". */
export const crowdPeople = (crowd: GymCrowd) =>
  crowd.people === 1 ? "1 person" : `${crowd.people} people`;

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

/* ── Ratings: a per-slug map of records, same storage approach ── */
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
 * The user's OWN gym ratings (theirs alone — not an average of anyone's).
 *  - getRating(slug): their rating for a gym (with the time it was given), or null.
 *  - setRating(slug, value): rate / re-rate (1..5), stamped now.
 */
export function useGymRatings(userId: string | null) {
  const uid = userId ?? "";
  const [ratings, setRatings] = useState<Record<string, GymRating>>({});

  useEffect(() => {
    const sync = () => setRatings(readMap<GymRating>(ratingsKey(uid)));
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

  return { getRating, setRating };
}

/**
 * The campus's crowd reports, live.
 *  - getCrowd(slug): what people said about this gym in the last two hours
 *    (level, how many, when) — or null, meaning "show the prediction".
 *  - reportCrowd(slug, level): file the signed-in user's answer. It shows up
 *    for them at once and for everyone else within a minute.
 * Every mounted copy re-reads on a timer, when the tab comes back into view,
 * and the moment any copy files a report.
 */
export function useGymCrowd(userId: string | null) {
  const uid = userId ?? "";
  const [reports, setReports] = useState<CrowdReport[]>([]);

  useEffect(() => {
    if (!uid) return;
    let active = true;
    const refresh = () =>
      listCrowdReports(uid, CROWD_FRESH_MS)
        .then((rows) => active && setReports(rows))
        .catch(() => {
          /* offline or the table isn't there yet — keep what we have and try again next tick */
        });
    refresh();
    const timer = setInterval(refresh, CROWD_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener(CHANGE_EVENT, refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener(CHANGE_EVENT, refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [uid]);

  const getCrowd = useCallback(
    (slug: string): GymCrowd | null => summarizeCrowd(reports.filter((r) => r.gymSlug === slug)),
    [reports],
  );

  const reportCrowd = useCallback(
    async (slug: string, level: CrowdLevel) => {
      // Show your own tap immediately, then let the server's answer replace it.
      setReports((cur) => [
        ...cur.filter((r) => !(r.mine && r.gymSlug === slug)),
        { gymSlug: slug, level, at: Date.now(), mine: true },
      ]);
      try {
        await sendCrowdReport(uid, slug, level);
      } catch {
        /* the optimistic row stays for this session; the next refresh tells the truth */
      }
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
    },
    [uid],
  );

  return { getCrowd, reportCrowd };
}

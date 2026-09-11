"use client";

/*
  ONE SHARED FACT PER PERSON, for rows that aren't match cards.

  A Buddy Board row and a "going tonight" row show a stranger's name and a
  time. Nothing on them said why you'd message THIS person rather than the
  one below. This reads the matcher once (everyone at your school, scored
  against you) and hands back the hook line (lib/matchReasons.ts) for any
  person by id — the same line their match card leads with.

  Null for a person the matcher doesn't return (they train solo, or a
  preference rules the pairing out) and for anyone you share no human fact
  with; the row then reads as it did.
*/
import { useEffect, useMemo, useState } from "react";
import { getBrowseMatches, type Match } from "@/lib/supabase/matching";
import { hasSupabaseEnv } from "@/lib/supabase/client";
import { hookLine, reasonRarity, type Hook } from "@/lib/matchReasons";

export function useSharedHooks(userId: string | null) {
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    if (!userId || !hasSupabaseEnv()) return;
    let active = true;
    getBrowseMatches(userId)
      .then((rows) => active && setMatches(rows))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [userId]);

  const byId = useMemo(() => {
    const rarity = reasonRarity(matches);
    const map = new Map<string, Hook | null>();
    for (const m of matches) map.set(m.userId, hookLine(m, rarity));
    return map;
  }, [matches]);

  return {
    hookFor: (personId: string): Hook | null => byId.get(personId) ?? null,
  };
}

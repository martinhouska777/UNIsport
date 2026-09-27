/*
  TEAMMATE CARDS — what the squad sees when it opens a rower on the Team list.
  ---------------------------------------------------------------------------
  The card used to be DERIVED from the roster id (lib/varsity/teamProfiles):
  an invented height, weight, class and set of erg bests under a real name,
  and your own row disagreed with your own profile (audit, 2026-09-27). Now a
  card is the rower's own record, or nothing:

    • YOUR row    — your own profile, read the way your Profile tab reads it.
    • LINKED rows — an account on this squad that is that roster name: the
                    seat they claimed (data.varsity.rosterId) first, and the
                    name they signed up under second — the same order
                    lineupStore uses for "your seat".
    • EVERYONE ELSE — no card at all; the sheet says "No profile yet".

  Other people's cards come through the `varsity_team_cards` function
  (db/varsity_team_cards_2026-09-27.sql), because a profile row is readable by
  its owner only. Until that SQL is applied the read fails, `fetchTeamCards`
  answers null, and every row but your own is "No profile yet" — never an
  invented one.
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { withDefaults, type VarsityAthleteProfile } from "./athleteProfile";
import { rosterIdForName } from "./demoAthlete";

export type TeamCard = {
  /** The account, for their calendar. */
  userId: string;
  name: string;
  classYear: string;
  profile: VarsityAthleteProfile;
};

type CardRow = {
  user_id: string;
  name: string | null;
  class_year: string | null;
  roster_id: string | null;
  card: Partial<VarsityAthleteProfile> | null;
};

/**
 * Every linked teammate's card, keyed by ROSTER id. Null when there is no
 * answer (no database, no squad, or the function isn't there yet).
 */
export async function fetchTeamCards(teamId: string | null): Promise<Record<string, TeamCard> | null> {
  if (!teamId || !hasSupabaseEnv()) return null;
  const supabase = createClient();
  const { data, error } = await supabase.rpc("varsity_team_cards", { p_team: teamId });
  if (error || !Array.isArray(data)) {
    // Not applied yet, or refused — "No profile yet" for everyone, not a crash.
    if (error) console.error("fetchTeamCards:", error.message);
    return null;
  }
  const rows = data as CardRow[];
  const toCard = (r: CardRow): TeamCard => {
    const classYear = (r.class_year ?? "").trim();
    return {
      userId: r.user_id,
      name: (r.name ?? "").trim(),
      classYear,
      profile: withDefaults(r.card ?? undefined, classYear),
    };
  };
  const out: Record<string, TeamCard> = {};
  // A claimed seat is an exact answer, so it goes first and a name never
  // takes a seat somebody has claimed.
  for (const r of rows) {
    const id = (r.roster_id ?? "").trim();
    if (id && !out[id]) out[id] = toCard(r);
  }
  for (const r of rows) {
    if ((r.roster_id ?? "").trim()) continue;
    const id = rosterIdForName(r.name);
    if (id && !out[id]) out[id] = toCard(r);
  }
  return out;
}

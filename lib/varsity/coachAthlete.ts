/*
  ONE ATHLETE, AS THEIR COACH SEES THEM.
  ---------------------------------------------------------------------------
  The read side of db/varsity_coach_reads.sql. Three kinds of data end up on
  the coach's athlete screen, and they are NOT equally private:

    • THE CARD (name, class year, side, height, weight, status, PRs) comes back
      from the `varsity_athlete_card` RPC, which hands over those fields and
      nothing else. The rest of a person's profile row — their normal-mode
      onboarding answers — is none of a rowing coach's business.

    • THE CALENDAR (their logged sessions) needs no function at all: the SELECT
      policy added in that same file means logStore's own fetchLogsInRange()
      works for a squad member exactly as it does for yourself. Read only —
      there is no policy that would let a coach write into someone's log.

    • THE ERG RESULTS were never private. varsity_results is a team board by
      design, so fetchAthleteResults() is a plain filtered read.

  Everything fails soft: no Supabase env, RLS in the way, or an athlete who has
  simply never logged anything all read as "nothing yet", never an error page.
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { withDefaults, type VarsityAthleteProfile } from "./athleteProfile";

export type AthleteCard = {
  name: string;
  classYear: string;
  profile: VarsityAthleteProfile;
};

type CardRow = {
  name: string | null;
  class_year: string | null;
  varsity: Partial<VarsityAthleteProfile> | null;
};

export async function fetchAthleteCard(userId: string | null): Promise<AthleteCard | null> {
  if (!userId || !hasSupabaseEnv()) return null;
  const supabase = createClient();
  const { data, error } = await supabase.rpc("varsity_athlete_card", { p_athlete: userId });
  if (error) {
    // Not their coach, or the migration hasn't been run — no card, not a crash.
    console.error("fetchAthleteCard:", error.message);
    return null;
  }
  const row = (data as CardRow[])?.[0];
  if (!row) return null;
  const classYear = (row.class_year ?? "").trim();
  return {
    name: (row.name ?? "").trim(),
    classYear,
    profile: withDefaults(row.varsity ?? undefined, classYear),
  };
}

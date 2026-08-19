"use client";

/*
  Team tab of the console — THE SAME SCREEN THE ATHLETES SEE.

  The owner's rule: a coach should not be reading a different set of numbers to
  their squad. So this renders components/varsity/team/TeamScreen — the roster,
  the erg boards and the water telemetry, exactly as a rower gets them — and
  adds the one thing a coach has and a rower does not: tapping a rower who is
  also a real account on this squad opens their full training screen
  (/varsity/coach/athlete/[id]) instead of the read-only squad profile sheet.

  Running the squad — the waiting room, invite links, captains — is NOT here
  any more. It lives behind the gear in the top bar (/varsity/coach/settings),
  because it is a settings job you do once, not something you look at daily.

  Accounts are not linked to the (still mock) roster yet, so the two are matched
  by NAME — the same stand-in lib/varsity/demoAthlete.ts and lineupStore.ts use.
*/
import { useEffect, useState } from "react";
import TeamScreen from "@/components/varsity/team/TeamScreen";
import { useMembership } from "@/components/varsity/useMembership";
import { can, fetchSquad } from "@/lib/varsity/membership";
import { rosterIdForName } from "@/lib/varsity/demoAthlete";

export default function CoachTeamPage() {
  const { membership, loading } = useMembership();
  const role = membership?.role ?? null;
  const teamId = membership?.teamId ?? null;
  // roster id → the account id of the person who is that rower.
  const [accounts, setAccounts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!teamId || !role || !can.readTraining(role)) return;
    let active = true;
    fetchSquad(teamId).then((squad) => {
      if (!active) return;
      const map: Record<string, string> = {};
      for (const m of squad) {
        if (m.status !== "approved") continue;
        const id = rosterIdForName(m.name);
        if (id) map[id] = m.userId;
      }
      setAccounts(map);
    });
    return () => {
      active = false;
    };
  }, [teamId, role]);

  if (loading || !membership) {
    return <p className="px-4 py-16 text-center text-sm text-muted">Loading the squad…</p>;
  }

  return (
    <TeamScreen
      athleteHref={(a) => {
        const userId = accounts[a.id];
        return userId ? `/varsity/coach/athlete/${userId}` : null;
      }}
    />
  );
}

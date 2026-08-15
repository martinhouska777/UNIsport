"use client";

import TeamAdminScreen from "@/components/varsity/coach/team/TeamAdminScreen";
import { useMembership } from "@/components/varsity/useMembership";

/*
  Team tab of the console: invites, the waiting room and the squad.
  The layout already refuses anyone who isn't an approved coach or captain, so
  this only has to wait for the lookup to finish.
*/
export default function CoachTeamPage() {
  const { membership, loading } = useMembership();

  if (loading || !membership) {
    return <p className="px-4 py-16 text-center text-sm text-muted">Loading the squad…</p>;
  }
  return <TeamAdminScreen membership={membership} />;
}

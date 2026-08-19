"use client";

import TeamAdminScreen from "@/components/varsity/coach/team/TeamAdminScreen";
import { useMembership } from "@/components/varsity/useMembership";

/*
  SETTINGS — running the squad: the waiting room, the invite links (this is
  where "Generate link" lives), and who is a captain.

  It sits behind the gear in the top bar rather than on the bottom nav, because
  the four tabs are the things a coach opens every day and this is not one of
  them. A CAPTAIN has no other screen — the console drops them straight here.

  The layout already refuses anyone who isn't an approved coach or captain, so
  this only has to wait for the lookup to finish.
*/
export default function CoachSettingsPage() {
  const { membership, loading } = useMembership();

  if (loading || !membership) {
    return <p className="px-4 py-16 text-center text-sm text-muted">Loading the squad…</p>;
  }
  return <TeamAdminScreen membership={membership} />;
}

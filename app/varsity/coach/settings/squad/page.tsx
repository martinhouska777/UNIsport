"use client";

import TeamAdminScreen from "@/components/varsity/coach/team/TeamAdminScreen";
import { useMembership } from "@/components/varsity/useMembership";

/* One page of the console's Settings menu — see TeamAdminScreen. */
export default function Page() {
  const { membership, loading } = useMembership();

  if (loading || !membership) {
    return <p className="px-4 py-16 text-center text-sm text-muted">Loading the squad…</p>;
  }
  return <TeamAdminScreen membership={membership} page="squad" />;
}

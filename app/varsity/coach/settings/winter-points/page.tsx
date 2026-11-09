"use client";

import SettingsHeader from "@/components/varsity/coach/settings/SettingsHeader";
import WinterPointsSetup from "@/components/varsity/winter/WinterPointsSetup";
import { useMembership } from "@/components/varsity/useMembership";
import { can } from "@/lib/varsity/membership";

/*
  WINTER POINTS, SET UP — the captain's screen, and the coach's (owner,
  2026-11-08). Under Settings because it is set up once a winter. The console
  layout lets a captain open every Settings page but Training settings, and
  varsity_save_winter_points() refuses anyone who is not a coach or a captain.
*/
export default function CoachWinterPointsPage() {
  const { membership, loading } = useMembership();

  if (loading || !membership || !can.invite(membership.role)) {
    return (
      <>
        <SettingsHeader title="Winter points" />
        <p className="px-4 py-16 text-center text-sm text-muted">Loading winter points…</p>
      </>
    );
  }
  return <WinterPointsSetup membership={membership} />;
}

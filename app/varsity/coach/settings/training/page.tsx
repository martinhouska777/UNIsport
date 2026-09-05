"use client";

import TrainingSettingsScreen from "@/components/varsity/coach/settings/TrainingSettingsScreen";
import { useMembership } from "@/components/varsity/useMembership";
import { can } from "@/lib/varsity/membership";

/*
  TRAINING SETTINGS — how the squad's plan is worded, coloured and timed.

  It sits under the gear next to the squad settings rather than on the bottom
  nav: a coach sets this up once a season, and the four tabs are the screens
  they open every day.

  COACH ONLY. The console layout already sends a captain back to the squad
  screen, and varsity_save_team_config() refuses them in the database — this
  check only avoids flashing a screen they cannot use on the way there.
*/
export default function CoachTrainingSettingsPage() {
  const { membership, loading } = useMembership();

  if (loading || !membership || !can.buildPlan(membership.role)) {
    return <p className="px-4 py-16 text-center text-sm text-muted">Loading your settings…</p>;
  }
  return <TrainingSettingsScreen membership={membership} />;
}

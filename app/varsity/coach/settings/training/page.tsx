"use client";

import SettingsHeader from "@/components/varsity/coach/settings/SettingsHeader";
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

  // The back arrow the owner asked for (2026-09-18) — to the Settings menu.
  return (
    <>
      <SettingsHeader title="Training settings" />
      {loading || !membership || !can.buildPlan(membership.role) ? (
        <p className="px-4 py-16 text-center text-sm text-muted">Loading your settings…</p>
      ) : (
        <TrainingSettingsScreen membership={membership} />
      )}
    </>
  );
}

"use client";

/*
  SETTINGS — the front page, ONE PER MODE (owner, 2026-09-30). The student
  app's gear and Varsity Mode's gear both lead here; which Settings you get is
  the mode this tab is in (useSettingsMode):

    student  components/settings/StudentSettings.tsx — training, Match, the tour
    varsity  components/settings/VarsitySettings.tsx — rowing profile, calendar,
             the Console, Replay athlete setup

  Notifications, Design, Units, the legal pages and Log out are in both.
*/
import StudentSettings from "@/components/settings/StudentSettings";
import VarsitySettings from "@/components/settings/VarsitySettings";
import { SettingsHeader, useSettingsMode } from "@/components/settings/SettingsShell";

export default function SettingsPage() {
  const mode = useSettingsMode();
  // Until the squad is known, just the bar — never one Settings, then the other.
  if (!mode) return <SettingsHeader title="Settings" fallback="/profile" />;
  return mode === "varsity" ? <VarsitySettings /> : <StudentSettings />;
}

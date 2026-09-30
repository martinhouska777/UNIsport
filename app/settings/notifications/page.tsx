"use client";

/*
  SETTINGS → NOTIFICATIONS. This device on top, then which kinds you want — for
  the mode you came from (useSettingsMode): the student app's in the student
  app, the coach's in Varsity Mode. The switches themselves are
  components/profile/NotificationSettings.
*/
import { useProfileData } from "@/components/profile/useProfileData";
import NotificationSettings from "@/components/profile/NotificationSettings";
import { SettingsBody, SettingsHeader, useSettingsMode } from "@/components/settings/SettingsShell";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { profileFromOnboarding } from "@/lib/currentUser";

export default function NotificationsSettingsPage() {
  const { data, saveState, update } = useProfileData();
  const mode = useSettingsMode();
  const user = data ? profileFromOnboarding(data) : null;

  return (
    <>
      <SettingsHeader title="Notifications" saveState={saveState} />
      <SettingsBody>
        {user && mode ? (
          <NotificationSettings mode={mode} prefs={user} onChange={update} />
        ) : (
          <SkeletonLines count={4} />
        )}
      </SettingsBody>
    </>
  );
}

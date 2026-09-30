"use client";

/*
  SETTINGS → NOTIFICATIONS. This device on top, then which kinds you want —
  a page of its own so the switches don't fill the Settings list (owner,
  2026-09-30). The switches themselves are components/profile/NotificationSettings.
*/
import { useProfileData } from "@/components/profile/useProfileData";
import NotificationSettings from "@/components/profile/NotificationSettings";
import { useMembership } from "@/components/varsity/useMembership";
import { SettingsBody, SettingsHeader } from "@/components/settings/SettingsShell";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { profileFromOnboarding } from "@/lib/currentUser";

export default function NotificationsSettingsPage() {
  const { data, saveState, update } = useProfileData();
  const { membership } = useMembership();
  const user = data ? profileFromOnboarding(data) : null;

  return (
    <>
      <SettingsHeader title="Notifications" saveState={saveState} />
      <SettingsBody>
        <div className="px-3.5 py-4">
          {user ? (
            <NotificationSettings
              messages={user.notifyMessages}
              plans={user.notifyPlans}
              follows={user.notifyFollows}
              partnerTags={user.notifyPartnerTags}
              logReminders={user.notifyLogReminders}
              team={user.notifyTeam}
              /* The coach's switch only exists for people who have a coach. */
              showTeam={membership?.status === "approved"}
              onChange={update}
            />
          ) : (
            <SkeletonLines count={4} />
          )}
        </div>
      </SettingsBody>
    </>
  );
}

"use client";

/*
  SETTINGS → TRAINING. The rows themselves are components/settings/TrainingSettings.
  Someone with no student side (joined through a team link) has no answers to
  edit, so they're sent back to the list, where "Set up the student side" waits.
*/
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import { useProfileData } from "@/components/profile/useProfileData";
import TrainingSettings from "@/components/settings/TrainingSettings";
import { SettingsBody, SettingsHeader } from "@/components/settings/SettingsShell";
import { SkeletonLines } from "@/components/ui/Skeleton";
import type { OnboardingProfile } from "@/lib/onboarding";

export default function TrainingSettingsPage() {
  const { studentReady } = useAppState();
  const { data, loading, saveState, savePreferences } = useProfileData();
  const router = useRouter();

  useEffect(() => {
    if (!studentReady) router.replace("/settings");
  }, [studentReady, router]);

  return (
    <>
      <SettingsHeader title="Training" saveState={saveState} />
      <SettingsBody>
        {/* Mounted only once the answers are in: the rows keep a working
            copy of the typed answers and the week, taken when they mount. */}
        {loading || !data ? (
          <SkeletonLines count={5} />
        ) : (
          <TrainingSettings answers={data as Partial<OnboardingProfile>} onSave={savePreferences} />
        )}
      </SettingsBody>
    </>
  );
}

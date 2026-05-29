"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import ThemeProvider from "@/components/ThemeProvider";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import { getUniversity, neutralTheme } from "@/lib/themes";

export default function OnboardingPage() {
  const { ready, loggedIn, universityKey } = useAppState();
  const router = useRouter();

  // Onboarding is post-login (Zone 2). If not logged in, go back to the landing.
  useEffect(() => {
    if (ready && !loggedIn) router.replace("/");
  }, [ready, loggedIn, router]);

  if (!ready || !loggedIn) return null;

  const theme = getUniversity(universityKey)?.theme ?? neutralTheme;

  return (
    <ThemeProvider tokens={theme}>
      <OnboardingFlow />
    </ThemeProvider>
  );
}

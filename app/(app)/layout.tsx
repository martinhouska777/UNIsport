"use client";

/*
  ZONE 2 (post-login) shell.
  - Loads the logged-in user's university theme at runtime (from data).
  - Renders the persistent bottom navigation around each tab page.
  - While real auth doesn't exist yet, it redirects to Zone 1 if the demo
    user isn't "logged in".
*/
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import ThemeProvider from "@/components/ThemeProvider";
import BottomNav from "@/components/BottomNav";
import { getUniversity, neutralTheme } from "@/lib/themes";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { ready, loggedIn, onboarded, universityKey } = useAppState();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!loggedIn) router.replace("/");
    else if (!onboarded) router.replace("/onboarding"); // finish onboarding first
  }, [ready, loggedIn, onboarded, router]);

  if (!ready || !loggedIn || !onboarded) return null;

  const uni = getUniversity(universityKey);
  const theme = uni?.theme ?? neutralTheme;

  return (
    <ThemeProvider
      tokens={theme}
      light={uni?.themeLight}
      className="flex h-dvh flex-col overflow-hidden bg-background"
    >
      <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
      <BottomNav />
    </ThemeProvider>
  );
}

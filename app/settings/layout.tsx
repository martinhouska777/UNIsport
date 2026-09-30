"use client";

/*
  SETTINGS — full-screen pages, not a sheet and not a tab.

  Deliberately its OWN route rather than a tab inside the Zone 2 shell, so it
  covers the whole screen with no bottom tab bar underneath (the Instagram
  pattern the owner asked for) and the phone's back gesture leaves it.

  The front page (/settings) is a short list; Training, Notifications, Design
  and Units open pages of their own under it. This layout holds what they all
  share — the signed-in gate and the school's theme — so stepping between them
  never re-paints or flashes.
*/
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import ThemeProvider from "@/components/ThemeProvider";
import { getUniversity, neutralTheme } from "@/lib/themes";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { ready, loggedIn, universityKey } = useAppState();
  const router = useRouter();

  useEffect(() => {
    if (ready && !loggedIn) router.replace("/");
  }, [ready, loggedIn, router]);

  if (!ready || !loggedIn) return null;

  const uni = getUniversity(universityKey);
  return (
    <ThemeProvider
      tokens={uni?.theme ?? neutralTheme}
      light={uni?.themeLight}
      paintRoot
      className="flex h-dvh flex-col overflow-hidden bg-background"
    >
      {children}
    </ThemeProvider>
  );
}

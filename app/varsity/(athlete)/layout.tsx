"use client";

/*
  VARSITY MODE shell — a fully separate section of the app.
  - Applies the Varsity theme (its own data) at runtime via <ThemeProvider>.
  - Frames the screen with the crimson/white Harvard "oar" rails.
  - Renders its OWN top bar + 5-tab bottom nav (not the normal app's).
  - Reuses the same login session as the rest of the app: if you're not logged
    in / onboarded it bounces you back out, just like the normal Zone 2 shell.

  Connected to the normal app only by the entry button (Profile tab) and the
  shared session — everything else here is independent.
*/
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import ThemeProvider from "@/components/ThemeProvider";
import OarRails from "@/components/varsity/OarRails";
import VarsityTopBar from "@/components/varsity/VarsityTopBar";
import VarsityNav from "@/components/varsity/VarsityNav";
import { varsityTheme } from "@/lib/varsity/theme";

export default function VarsityLayout({ children }: { children: React.ReactNode }) {
  const { ready, loggedIn, onboarded } = useAppState();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!loggedIn) router.replace("/");
    else if (!onboarded) router.replace("/onboarding");
  }, [ready, loggedIn, onboarded, router]);

  if (!ready || !loggedIn || !onboarded) return null;

  return (
    <ThemeProvider
      tokens={varsityTheme}
      className="relative flex h-dvh flex-col overflow-hidden bg-background"
    >
      <OarRails />
      <VarsityTopBar />
      <main className="relative z-10 flex flex-1 flex-col overflow-y-auto">
        {children}
      </main>
      <VarsityNav />
    </ThemeProvider>
  );
}

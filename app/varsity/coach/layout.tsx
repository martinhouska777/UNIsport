"use client";

/*
  COACH CONSOLE shell — a separate area inside Varsity Mode for coaches.
  Same varsity theme + oar rails, but its own top bar and its own nav
  (Plan · Lineup · Notes). Auth-gated like the rest of Varsity Mode.
*/
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import ThemeProvider from "@/components/ThemeProvider";
import OarRails from "@/components/varsity/OarRails";
import CoachTopBar from "@/components/varsity/coach/CoachTopBar";
import CoachNav from "@/components/varsity/coach/CoachNav";
import { varsityTheme } from "@/lib/varsity/theme";

export default function CoachLayout({ children }: { children: React.ReactNode }) {
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
      <CoachTopBar />
      <main className="relative z-10 flex flex-1 flex-col overflow-y-auto">{children}</main>
      <CoachNav />
    </ThemeProvider>
  );
}

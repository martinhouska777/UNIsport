"use client";

/*
  ZONE 2 (post-login) shell.
  - Loads the logged-in user's university theme at runtime (from data).
  - Renders the persistent bottom navigation around each tab page.
  - While real auth doesn't exist yet, it redirects to Zone 1 if the demo
    user isn't "logged in".
*/
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppState } from "@/components/AppState";
import ThemeProvider from "@/components/ThemeProvider";
import BottomNav from "@/components/BottomNav";
import SideNav from "@/components/SideNav";
import TourGate from "@/components/tour/TourGate";
import { appTour } from "@/lib/tour";
import { getUniversity, neutralTheme } from "@/lib/themes";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { ready, loggedIn, studentReady, universityKey, userId } = useAppState();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (!loggedIn) router.replace("/");
    // These tabs ARE the student side, so they need the student setup. A rower
    // who only did the varsity setup lands here by choosing "Student" in the
    // mode switcher, and onboarding is exactly what they asked for.
    else if (!studentReady) router.replace("/onboarding");
  }, [ready, loggedIn, studentReady, router]);

  if (!ready || !loggedIn || !studentReady) return null;

  const uni = getUniversity(universityKey);
  const theme = uni?.theme ?? neutralTheme;

  return (
    /*
      Phone: a column with the tab bar underneath it.
      Laptop (lg and up): the same thing turned on its side — SideNav on the
      left, page beside it, BottomNav hidden. Only the flex direction changes,
      so no screen has to know which one it's in.
    */
    <ThemeProvider
      tokens={theme}
      light={uni?.themeLight}
      paintRoot
      className="flex h-dvh flex-col overflow-hidden bg-background lg:flex-row"
    >
      <SideNav />
      {/* Keying on the route remounts the tab subtree so the entrance
          animation replays on every navigation; main stays the scroll
          container so sticky headers keep working. */}
      <main
        key={pathname}
        className="app-page-enter flex flex-1 flex-col overflow-y-auto"
      >
        {children}
      </main>
      <BottomNav />
      {/*
        The tour. Mounted last so everything it points at — the navs here, the
        screen's own content inside <main> — is above it in the tree, and mounted
        for the WHOLE shell rather than per screen: it walks across the tabs on
        its own, so anything keyed to the route would unmount itself mid-walk.
        It decides for itself whether to appear (components/tour/TourGate).
      */}
      {userId && <TourGate key={userId} tour={appTour} userId={userId} />}
    </ThemeProvider>
  );
}

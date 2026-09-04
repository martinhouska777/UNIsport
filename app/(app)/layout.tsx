"use client";

/*
  ZONE 2 (post-login) shell.
  - Loads the logged-in user's university theme at runtime (from data).
  - Renders the persistent bottom navigation around each tab page.
  - While real auth doesn't exist yet, it redirects to Zone 1 if the demo
    user isn't "logged in".
*/
import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppState } from "@/components/AppState";
import ThemeProvider from "@/components/ThemeProvider";
import LoadingGate from "@/components/LoadingGate";
import BottomNav from "@/components/BottomNav";
import SideNav from "@/components/SideNav";
import TourGate from "@/components/tour/TourGate";
import SchoolIntro from "@/components/SchoolIntro";
import { appTour } from "@/lib/tour";
import { getUniversity, neutralTheme } from "@/lib/themes";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { ready, loggedIn, studentReady, universityKey, userId } = useAppState();
  const router = useRouter();
  const pathname = usePathname();

  /*
    The tour waits for the welcome. SchoolIntro says when it is out of the way —
    immediately, when there was no welcome to play — and until then the walk
    would be talking to a screen nobody can see through.

    (Marking the mode as "student" moved into SchoolIntro with this: it has to
    happen AFTER something has looked at where we came from, and this ran
    before the app state was even known.)
  */
  const [welcomeOver, setWelcomeOver] = useState(false);
  const showTour = useCallback(() => setWelcomeOver(true), []);

  useEffect(() => {
    if (!ready) return;
    if (!loggedIn) router.replace("/");
    // These tabs ARE the student side, so they need the student setup. A rower
    // who only did the varsity setup lands here by choosing "Student" in the
    // mode switcher, and onboarding is exactly what they asked for.
    else if (!studentReady) router.replace("/onboarding");
  }, [ready, loggedIn, studentReady, router]);

  const uni = getUniversity(universityKey);
  const theme = uni?.theme ?? neutralTheme;

  // Never `null` while deciding — see components/LoadingGate.tsx.
  if (!ready || !loggedIn || !studentReady) {
    return (
      <ThemeProvider tokens={theme} paintRoot className="bg-background">
        <LoadingGate />
      </ThemeProvider>
    );
  }

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
      {userId && welcomeOver && <TourGate key={userId} tour={appTour} userId={userId} />}
      {/*
        The welcome, last of all so it covers everything. It decides for itself
        whether this is an arrival worth greeting (components/SchoolIntro) and
        lets the tour go once it is done.
      */}
      <SchoolIntro onFinished={showTour} />
    </ThemeProvider>
  );
}

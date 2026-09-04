"use client";

/*
  COACH CONSOLE shell — a separate area inside Varsity Mode for the people who
  run the squad. Same varsity theme, but its own top bar and nav.

  This is also the gate. Only an approved coach or captain gets in at all, and a
  captain only gets the Team screen — the owner's rule is that captains handle
  invites but never build training. The database enforces the same split, so
  this is about not showing doors that wouldn't open.
*/
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppState } from "@/components/AppState";
import ThemeProvider from "@/components/ThemeProvider";
import LoadingGate from "@/components/LoadingGate";
import CoachTopBar from "@/components/varsity/coach/CoachTopBar";
import CoachNav from "@/components/varsity/coach/CoachNav";
import TourGate from "@/components/tour/TourGate";
import { coachTour } from "@/lib/varsity/coachTour";
import { useMembership } from "@/components/varsity/useMembership";
import { canOpenConsole, can } from "@/lib/varsity/membership";
import { useVarsityTheme } from "@/components/varsity/useVarsityTheme";
import { markMode } from "@/lib/varsity/mode";

const TEAM_TAB = "/varsity/coach/team";
const SETTINGS = "/varsity/coach/settings";
/*
  What a CAPTAIN may open. A captain runs people, not training: the squad
  screen (which is the athlete Team tab, so they could see it anyway) and
  settings, where the invite links are. Everything else bounces to settings —
  the database refuses them there too, this just doesn't show the door.
*/
const captainMay = (path: string) => path === TEAM_TAB || path === SETTINGS;

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const { ready, loggedIn, varsityReady, userId } = useAppState();
  const { membership, loading } = useMembership();
  const vTheme = useVarsityTheme();
  const router = useRouter();
  const pathname = usePathname();

  const role = membership?.status === "approved" ? membership.role : null;

  /* The console is INSIDE Varsity Mode, so stepping back out to the athlete
     side must not replay its title sequence (lib/varsity/mode.ts). */
  useEffect(() => {
    markMode("varsity");
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!loggedIn) {
      router.replace("/");
      return;
    }
    if (!varsityReady) {
      router.replace("/varsity/setup");
      return;
    }
    if (loading) return;
    // Not a coach or captain: back to the athlete side of Varsity Mode.
    if (!role || !canOpenConsole(role)) {
      router.replace("/varsity/home");
      return;
    }
    // A captain who lands on a training screen goes to the screen they own.
    if (!can.buildPlan(role) && !captainMay(pathname)) router.replace(SETTINGS);
  }, [ready, loggedIn, varsityReady, loading, role, pathname, router]);

  // Never `null` while deciding — see components/LoadingGate.tsx.
  if (!ready || !loggedIn || !varsityReady || loading || !role || !canOpenConsole(role)) {
    return (
      <ThemeProvider tokens={vTheme.dark} light={vTheme.light} paintRoot className="bg-background">
        <LoadingGate back="/varsity/home" />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider
      tokens={vTheme.dark}
      light={vTheme.light}
      paintRoot
      className="relative flex h-dvh flex-col overflow-hidden bg-background"
    >
      <CoachTopBar role={role} teamName={membership!.teamName} />
      <main className="relative z-10 flex flex-1 flex-col overflow-y-auto">{children}</main>
      <CoachNav role={role} />
      {/*
        The console's own walk, the first time a coach is in. Mounted here
        rather than per screen because it crosses the tabs on its own, and
        inside ThemeProvider so its dim resolves against the varsity theme.

        COACH ONLY: a captain has the squad screen and settings, and most of
        the walk points at tabs they do not have.
      */}
      {userId && can.buildPlan(role) && <TourGate key={userId} tour={coachTour} userId={userId} />}
    </ThemeProvider>
  );
}

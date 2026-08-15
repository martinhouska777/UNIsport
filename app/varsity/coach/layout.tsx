"use client";

/*
  COACH CONSOLE shell — a separate area inside Varsity Mode for the people who
  run the squad. Same varsity theme + oar rails, but its own top bar and nav.

  This is also the gate. Only an approved coach or captain gets in at all, and a
  captain only gets the Team screen — the owner's rule is that captains handle
  invites but never build training. The database enforces the same split, so
  this is about not showing doors that wouldn't open.
*/
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppState } from "@/components/AppState";
import ThemeProvider from "@/components/ThemeProvider";
import OarRails from "@/components/varsity/OarRails";
import CoachTopBar from "@/components/varsity/coach/CoachTopBar";
import CoachNav from "@/components/varsity/coach/CoachNav";
import { useMembership } from "@/components/varsity/useMembership";
import { canOpenConsole, can } from "@/lib/varsity/membership";
import { varsityTheme, varsityLightTheme } from "@/lib/varsity/theme";

const TEAM_TAB = "/varsity/coach/team";

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const { ready, loggedIn, onboarded } = useAppState();
  const { membership, loading } = useMembership();
  const router = useRouter();
  const pathname = usePathname();

  const role = membership?.status === "approved" ? membership.role : null;

  useEffect(() => {
    if (!ready) return;
    if (!loggedIn) {
      router.replace("/");
      return;
    }
    if (!onboarded) {
      router.replace("/onboarding");
      return;
    }
    if (loading) return;
    // Not a coach or captain: back to the athlete side of Varsity Mode.
    if (!role || !canOpenConsole(role)) {
      router.replace("/varsity/home");
      return;
    }
    // A captain who lands on a training screen goes to the one tab they own.
    if (!can.buildPlan(role) && pathname !== TEAM_TAB) router.replace(TEAM_TAB);
  }, [ready, loggedIn, onboarded, loading, role, pathname, router]);

  if (!ready || !loggedIn || !onboarded || loading || !role || !canOpenConsole(role)) return null;

  return (
    <ThemeProvider
      tokens={varsityTheme}
      light={varsityLightTheme}
      paintRoot
      className="relative flex h-dvh flex-col overflow-hidden bg-background"
    >
      <OarRails />
      <CoachTopBar role={role} teamName={membership!.teamName} />
      <main className="relative z-10 flex flex-1 flex-col overflow-y-auto">{children}</main>
      <CoachNav role={role} />
    </ThemeProvider>
  );
}

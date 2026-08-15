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

  You also have to be an APPROVED member of a squad to be here at all: an invite
  link alone leaves you pending, and a pending athlete gets the waiting screen.
  The database refuses them the team's data either way; this is about not
  showing an empty shell.

  The setup this needs is the SHORT varsity one (name + class year) — a rower
  who came in through a team link has never seen the student onboarding and
  doesn't need it.
*/
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import { useMembership } from "@/components/varsity/useMembership";
import ThemeProvider from "@/components/ThemeProvider";
import OarRails from "@/components/varsity/OarRails";
import VarsityIntro from "@/components/varsity/VarsityIntro";
import VarsityTopBar from "@/components/varsity/VarsityTopBar";
import VarsityNav from "@/components/varsity/VarsityNav";
import { varsityTheme, varsityLightTheme } from "@/lib/varsity/theme";

export default function VarsityLayout({ children }: { children: React.ReactNode }) {
  const { ready, loggedIn, varsityReady } = useAppState();
  const { membership, loading, isMember } = useMembership();
  const router = useRouter();

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
    // Pending → the waiting screen. On no team at all → the invite screen.
    if (!isMember) router.replace(membership ? "/varsity/waiting" : "/join");
  }, [ready, loggedIn, varsityReady, loading, isMember, membership, router]);

  if (!ready || !loggedIn || !varsityReady || loading || !isMember) return null;

  return (
    <ThemeProvider
      tokens={varsityTheme}
      light={varsityLightTheme}
      paintRoot
      className="relative flex h-dvh flex-col overflow-hidden bg-background"
    >
      <VarsityIntro />
      <OarRails />
      <VarsityTopBar />
      <main className="relative z-10 flex flex-1 flex-col overflow-y-auto">
        {children}
      </main>
      <VarsityNav />
    </ThemeProvider>
  );
}

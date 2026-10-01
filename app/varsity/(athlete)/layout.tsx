"use client";

/*
  VARSITY MODE shell — a fully separate section of the app.
  - Applies the Varsity theme (its own data) at runtime via <ThemeProvider>.
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
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import { useMembership } from "@/components/varsity/useMembership";
import ThemeProvider from "@/components/ThemeProvider";
import LoadingGate from "@/components/LoadingGate";
import VarsityIntro from "@/components/varsity/VarsityIntro";
import VarsityTopBar from "@/components/varsity/VarsityTopBar";
import VarsityNav from "@/components/varsity/VarsityNav";
import VarsitySideNav from "@/components/varsity/VarsitySideNav";
import TeamColors from "@/components/varsity/TeamColors";
import { useVarsityTheme } from "@/components/varsity/useVarsityTheme";
import TourGate from "@/components/tour/TourGate";
import { varsityTour } from "@/lib/varsity/varsityTour";

export default function VarsityLayout({ children }: { children: React.ReactNode }) {
  const { ready, loggedIn, varsityReady, userId } = useAppState();
  const { membership, loading, isMember, failed } = useMembership();
  const vTheme = useVarsityTheme();
  const router = useRouter();

  // The tour waits for the oars, as the student one waits for SchoolIntro.
  const [introOver, setIntroOver] = useState(false);
  const showTour = useCallback(() => setIntroOver(true), []);

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
    // A lookup that FAILED is not an answer: an approved rower must not be
    // bounced to the invite screen over a network blip. LoadingGate offers a
    // reload after a moment.
    if (loading || failed) return;
    // Pending → the waiting screen. On no team at all → the invite screen.
    if (!isMember) router.replace(membership ? "/varsity/waiting" : "/join");
  }, [ready, loggedIn, varsityReady, loading, failed, isMember, membership, router]);

  /*
    Still deciding, or on the way somewhere else. NEVER `null` — that is a black
    screen with nothing on it, and any hang above turns it into a permanent one
    (components/LoadingGate.tsx). In the varsity theme, so the wait already
    looks like the mode you are walking into.
  */
  if (!ready || !loggedIn || !varsityReady || loading || !isMember) {
    return (
      <ThemeProvider tokens={vTheme.dark} light={vTheme.light} paintRoot className="bg-background">
        <LoadingGate />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider
      tokens={vTheme.dark}
      light={vTheme.light}
      paintRoot
      className="relative flex h-dvh flex-col overflow-hidden bg-background lg:flex-row"
    >
      <VarsityIntro onFinished={showTour} />
      {/* Laptop: the shared sidebar, like the student app. Phone: tabs, and the
          top bar on Home and Profile only (it decides that itself). */}
      <VarsitySideNav />
      <VarsityTopBar />
      <main className="relative z-10 flex flex-1 flex-col overflow-y-auto">
        <TeamColors teamId={membership!.teamId}>{children}</TeamColors>
      </main>
      <VarsityNav />
      {/*
        Varsity Mode's walk (lib/varsity/varsityTour.ts), the first time
        you are in. Once for the whole shell, not per screen — it crosses the
        tabs on its own — and inside ThemeProvider so its dim is this theme's.
        Coaches get it too (owner, 2026-09-30): this is the side they land on,
        and the console has its own walk on top.
      */}
      {userId && introOver && <TourGate key={userId} tour={varsityTour} userId={userId} />}
    </ThemeProvider>
  );
}

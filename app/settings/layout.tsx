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

  ON A LAPTOP the mode's sidebar stays on the left (owner, 2026-10-04: "on the
  computer… make it look good there"). Without it Settings was the one page
  that dropped the app's frame — a bar across the whole screen with the back
  arrow at the far edge and the list stranded in the middle, and no way to a
  tab but Back. The phone is untouched: both rails are `hidden lg:flex`.
*/
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import ThemeProvider from "@/components/ThemeProvider";
import SideNav from "@/components/SideNav";
import VarsitySideNav from "@/components/varsity/VarsitySideNav";
import { useVarsityTheme } from "@/components/varsity/useVarsityTheme";
import { useSettingsMode } from "@/components/settings/SettingsShell";
import { getUniversity, neutralTheme } from "@/lib/themes";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { ready, loggedIn, universityKey } = useAppState();
  const mode = useSettingsMode();
  const vTheme = useVarsityTheme();
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
      className="flex h-dvh flex-col overflow-hidden bg-background lg:flex-row"
    >
      {/* Which rail is the mode this tab is in; while that is still being
          looked up, an empty one of the same width so nothing jumps. */}
      {mode === "varsity" ? (
        /* In Varsity Mode's own colours, so it is the same rail as on every
           other varsity page. */
        <ThemeProvider tokens={vTheme.dark} light={vTheme.light} className="hidden lg:flex">
          <VarsitySideNav />
        </ThemeProvider>
      ) : mode === "student" ? (
        <SideNav />
      ) : (
        <div className="hidden w-56 flex-shrink-0 border-r border-border bg-surface lg:block" />
      )}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
    </ThemeProvider>
  );
}

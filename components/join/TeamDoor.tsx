"use client";

/*
  THE TEAM DOOR — a team invite (/join/<code>) and the sign-in it leads to
  (/login?next=/join/<code>) wear the team's Varsity Mode colours and its mark,
  so a rower who taps the link in the group chat is at their team from the
  first screen to the setup questions (owner, 2026-10-08: "when you click the
  link … it already has the varsity rowing … the shield of University Rowing").

  The one place pre-login pages show a school's colours (CLAUDE.md rule 2 says
  why it is allowed here): the link already says which team it is for.

  How: this school's varsity theme on a ThemeProvider, plus `.team-door`
  (app/globals.css), which points the landing colour variables those pages
  already use at that theme. The pages keep their own classes and fonts.

  Which school: the app's (pinned to Harvard, LIVE_UNIVERSITY in lib/themes.ts)
  — a team row does not name its university yet. When a second campus arrives,
  the invite preview has to say it.
*/
import type { ReactNode } from "react";
import ThemeProvider from "@/components/ThemeProvider";
import VarsityCrest from "@/components/varsity/VarsityCrest";
import { useVarsityTheme } from "@/components/varsity/useVarsityTheme";

export default function TeamDoor({ children }: { children: ReactNode }) {
  const vTheme = useVarsityTheme();
  return (
    <ThemeProvider tokens={vTheme.dark} light={vTheme.light} paintRoot className="team-door">
      {children}
    </ThemeProvider>
  );
}

/* The team's mark under the UNIsport name: the oars crossed behind the shield,
   Varsity Mode's own mark (the last frame of its intro). */
export function TeamMark() {
  return (
    <div className="mb-7 flex justify-center">
      <VarsityCrest size={104} />
    </div>
  );
}

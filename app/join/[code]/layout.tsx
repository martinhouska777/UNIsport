import type { Metadata } from "next";

/*
  The tab title for a team invite link (/join/<code>) — the page itself is a
  client component, so it lives here (launch audit 2026-09-27, item 45). The
  words match the badge on the screen. The viewport comes from app/join/layout.tsx.

  And its LINK CARD — what the link shows when a coach drops it in the group
  chat: UNIsport, the team's mark (the oars crossed behind the shield) and
  "Join Harvard Rowing", cut from the invite page itself by
  scripts/landing/make-og-team.mjs (owner, 2026-10-11: "Put there the Harvard
  shield with the oars"). Until then an invite link had no picture at all.
  Change the ?v= whenever the picture is remade — chat apps remember a link's
  picture by its address.
*/
const title = "Team invite | UNIsport";
const teamInviteImage = "/og-team.png?v=2026-10-11";

export const metadata: Metadata = {
  title,
  // No line under the title: the picture says whose team it is, and the
  // site-wide line ("Campus fitness — gyms, partners…") is the student app's.
  description: null,
  openGraph: {
    title,
    siteName: "UNIsport",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: teamInviteImage,
        width: 1200,
        height: 630,
        alt: "UNIsport, the Harvard rowing mark, the oars crossed behind the shield, over “Join Harvard Rowing”",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    images: [teamInviteImage],
  },
};

export default function JoinCodeLayout({ children }: { children: React.ReactNode }) {
  return children;
}

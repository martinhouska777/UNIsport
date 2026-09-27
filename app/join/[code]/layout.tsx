import type { Metadata } from "next";

/*
  The tab title for a team invite link (/join/<code>) — the page itself is a
  client component, so it lives here (launch audit 2026-09-27, item 45). The
  words match the badge on the screen. The viewport comes from app/join/layout.tsx.
*/
export const metadata: Metadata = {
  title: "Team invite — UNIsport",
};

export default function JoinCodeLayout({ children }: { children: React.ReactNode }) {
  return children;
}

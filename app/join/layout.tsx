import type { Metadata } from "next";
import { landingViewport } from "@/components/landing/routeMeta";

/*
  The invite screens (/join, /join/<code>) are client components, so their
  viewport lives here. Pinch-zoomable, like the landing — the root layout
  locks zoom for the APP only (website review, 2026-09-10).

  Their tab title too (launch audit 2026-09-27, item 45): it was the bare
  "UNIsport". /join is both a housemate's invite and the varsity code box, so
  its title names what both are; /join/<code> has its own (app/join/[code]/
  layout.tsx).
*/
export const viewport = landingViewport;

export const metadata: Metadata = {
  title: "Join with an invite — UNIsport",
};

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}

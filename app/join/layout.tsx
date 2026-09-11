import { landingViewport } from "@/components/landing/routeMeta";

/*
  The invite screens (/join, /join/<code>) are client components, so their
  viewport lives here. Pinch-zoomable, like the landing — the root layout
  locks zoom for the APP only (website review, 2026-09-10).
*/
export const viewport = landingViewport;

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}

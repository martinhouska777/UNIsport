import type { Metadata } from "next";
import { landingViewport } from "@/components/landing/routeMeta";

/*
  The sign-in page is a client component (it reads the URL and talks to
  Supabase), so its tab title lives here. It used to inherit the bare
  "UNIsport" and the app's description; a page every sign-up passes through
  deserves to say what it is (website review, 2026-09-10).
*/
export const metadata: Metadata = {
  title: "Get started — UNIsport",
  description: "Create your UNIsport account with your university email, or log in.",
};

/* Pinch-zoomable, like the landing — the root layout locks zoom for the APP
   only (website review, 2026-09-10). */
export const viewport = landingViewport;

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}

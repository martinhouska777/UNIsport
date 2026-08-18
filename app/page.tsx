import LandingPage from "@/components/landing/LandingPage";
import { landingMetadata, landingViewport } from "@/components/landing/routeMeta";

/*
  ZONE 1 — the public landing (marketing front-door), the WHOLE page in
  order. Neutral product brand only, NO university colours as page chrome.
  The page itself lives in components/landing/LandingPage.tsx; every word in
  lib/landingCopy.ts. The tabbed views of the same page are app/for/[audience],
  app/about and app/contact; the link card and the phone's theme colour
  they all share are in components/landing/routeMeta.ts.
*/
export const metadata = landingMetadata("all");
export const viewport = landingViewport;

export default function Home() {
  return <LandingPage />;
}

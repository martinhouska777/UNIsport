import LandingPage from "@/components/landing/LandingPage";
import { landingMetadata, landingViewport } from "@/components/landing/routeMeta";

/* ZONE 1 — the About tab: the landing's About section on its own page. */
export const metadata = landingMetadata("about");
export const viewport = landingViewport;

export default function AboutPage() {
  return <LandingPage view="about" />;
}

import LandingPage from "@/components/landing/LandingPage";
import { landingMetadata, landingViewport } from "@/components/landing/routeMeta";

/* ZONE 1 — the Contact tab: the address and the socials, on their own page. */
export const metadata = landingMetadata("contact");
export const viewport = landingViewport;

export default function ContactPage() {
  return <LandingPage view="contact" />;
}

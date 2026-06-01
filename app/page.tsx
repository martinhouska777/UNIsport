import { instrumentSerif } from "@/components/landing/fonts";
import LandingNav from "@/components/landing/LandingNav";
import Hero from "@/components/landing/Hero";
import OverviewStrip from "@/components/landing/OverviewStrip";
import Features from "@/components/landing/Features";
import VarsitySection from "@/components/landing/VarsitySection";
import HowItWorks from "@/components/landing/HowItWorks";
import Exclusivity from "@/components/landing/Exclusivity";
import FinalCta from "@/components/landing/FinalCta";
import LandingFooter from "@/components/landing/LandingFooter";

/*
  ZONE 1 — the public landing (marketing front-door). Neutral product brand
  only (dark + blue student accent + gold varsity accent), NO university colors.
  Built from /mockups/normal mode/landing page/landing-v2.html, mapped onto the
  landing-scoped `l-*` design tokens. The student CTAs lead to /login; the
  Varsity path leads to /join (added in a later slice).
*/
export default function LandingPage() {
  return (
    <div
      className={`${instrumentSerif.variable} l-grid relative min-h-screen overflow-x-hidden bg-l-bg font-sans text-l-text`}
    >
      <LandingNav />
      <main className="relative">
        <Hero />
        <OverviewStrip />
        <Features />
        <VarsitySection />
        <HowItWorks />
        <Exclusivity />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}

import { instrumentSerif } from "@/components/landing/fonts";
import LandingNav from "@/components/landing/LandingNav";
import LandingHero from "@/components/landing/LandingHero";
import StoryCloser from "@/components/landing/StoryCloser";
import Interlude from "@/components/landing/Interlude";
import FeatureList from "@/components/landing/FeatureList";
import CoachSection from "@/components/landing/CoachSection";
import Faq from "@/components/landing/Faq";
import About from "@/components/landing/About";
import FinalCta from "@/components/landing/FinalCta";
import LandingFooter from "@/components/landing/LandingFooter";
import { PhoneModeProvider, PhoneModeToggle } from "@/components/landing/PhoneMode";
import { studentFeatures, studentStory, varsityFeatures, varsityStory } from "@/lib/landingCopy";

/*
  ZONE 1 — THE PUBLIC LANDING, assembled. Neutral product brand only (dark +
  blue student accent + gold varsity accent); the university colours on this
  page are CONTENT — pictures of a themed app — never its chrome (rules 1, 2).

  The order is the one in LANDING.md, and it is load-bearing: each story
  flies into its closer, the interlude opens the varsity story from scratch,
  and the coach section's bridge line refers to "the story you just scrolled".

     Intro · doors · availability
     Story A → Campus Colours (+ the student features beside it)
     Interlude
     Story B → Blade Lock (+ the varsity features beside it)
     The Coach's Console
     FAQ · About · Contact
     The close · footer

  Every word is in lib/landingCopy.ts.

  Every phone on the page shows the real app in light OR dark (PhoneMode):
  the switch is the small pill pinned bottom-right, shown only while a
  section holding phone screens is in view (data-phone-screens: the two
  stories, both closers, the coach's console); the provider wraps the
  whole page so the closers' phones, the flying phone and the coach's five
  all flip together.
*/
export default function LandingPage() {
  return (
    <div
      className={`${instrumentSerif.variable} l-grid relative min-h-screen overflow-x-clip bg-l-bg font-sans text-l-text`}
    >
      <PhoneModeProvider>
      <LandingNav />
      <main className="relative">
        <LandingHero />
        <StoryCloser
          storyId="story1"
          beats={studentStory}
          accent="accent"
          closer="campus"
          closerId="campus-colours"
          fromBeat={6}
          toBeat={0}
          aside={<FeatureList kicker={studentFeatures.kicker} rows={studentFeatures.rows} cta={studentFeatures.cta} />}
        />
        <Interlude />
        <StoryCloser
          storyId="story2"
          beats={varsityStory}
          accent="varsity"
          closer="blades"
          closerId="blade-lock"
          fromBeat={5}
          toBeat={0}
          aside={<FeatureList kicker={varsityFeatures.kicker} rows={varsityFeatures.rows} cta={varsityFeatures.cta} />}
        />
        <CoachSection />
        <Faq />
        <About />
        <FinalCta />
      </main>
      <LandingFooter />
      <PhoneModeToggle />
      </PhoneModeProvider>
    </div>
  );
}

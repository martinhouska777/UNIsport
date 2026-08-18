import { instrumentSerif } from "@/components/landing/fonts";
import LandingNav from "@/components/landing/LandingNav";
import LandingHero from "@/components/landing/LandingHero";
import StoryCloser from "@/components/landing/StoryCloser";
import Interlude from "@/components/landing/Interlude";
import FeatureList from "@/components/landing/FeatureList";
import CoachSection from "@/components/landing/CoachSection";
import Faq from "@/components/landing/Faq";
import About from "@/components/landing/About";
import Contact from "@/components/landing/Contact";
import FinalCta from "@/components/landing/FinalCta";
import LandingFooter from "@/components/landing/LandingFooter";
import { PhoneModeProvider, PhoneModeToggle } from "@/components/landing/PhoneMode";
import { studentFeatures, studentStory, varsityFeatures, varsityStory, type LandingView } from "@/lib/landingCopy";

/*
  ZONE 1 — THE PUBLIC LANDING, assembled. Neutral product brand only (dark +
  blue student accent + gold varsity accent); the university colours on this
  page are CONTENT — pictures of a themed app — never its chrome (rules 1, 2).

  ONE page, SIX views (owner, 2026-08-18 — "tabs like regular webpages"):

     /               everything, in order          view="all"
     /for/students   intro · Story A → Campus Colours · FAQ · close
     /for/varsity    intro · Varsity Mode. · Story B → Blade Lock · FAQ · close
     /for/coaches    intro · The Coach's Console · FAQ · close
     /about          About
     /contact        Contact

  On "/" the order is load-bearing: each story flies into its closer, the
  interlude opens the varsity story from scratch, and the coach section's
  bridge line refers to "the story you just scrolled". A view keeps a story
  welded to its closer and swaps in the `solo` lines where a section leant
  on the one before it (Interlude, CoachSection). Every word is in
  lib/landingCopy.ts.

     Intro · doors · availability
     Story A → Campus Colours (+ the student features beside it)
     Interlude
     Story B → Blade Lock (+ the varsity features beside it)
     The Coach's Console
     FAQ · About · Contact
     The close · footer

  Every phone on the page shows the real app in light OR dark (PhoneMode):
  the switch is the small pill pinned bottom-right, shown only while a
  section holding phone screens is in view (data-phone-screens: the two
  stories, both closers, the coach's console); the provider wraps the
  whole page so the closers' phones, the flying phone and the coach's five
  all flip together.
*/
export default function LandingPage({ view = "all" }: { view?: LandingView }) {
  const all = view === "all";
  const students = all || view === "students";
  const varsity = all || view === "varsity";
  const coaches = all || view === "coaches";
  const audience = students || varsity || coaches;

  return (
    <div
      className={`${instrumentSerif.variable} l-grid relative flex min-h-screen flex-col overflow-x-clip bg-l-bg font-sans text-l-text`}
    >
      <PhoneModeProvider>
      <LandingNav view={view} />
      {/* flex-1 so the footer sits at the bottom of the two short views
          (About, Contact) instead of mid-screen; the long views overflow the
          viewport anyway and are unaffected. */}
      <main className="relative flex-1">
        {audience && <LandingHero doors={all} />}
        {students && (
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
        )}
        {varsity && <Interlude solo={!all} />}
        {varsity && (
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
        )}
        {coaches && <CoachSection solo={!all} />}
        {audience && <Faq />}
        {(all || view === "about") && <About />}
        {(all || view === "contact") && <Contact />}
        {audience && <FinalCta />}
      </main>
      <LandingFooter />
      <PhoneModeToggle />
      </PhoneModeProvider>
    </div>
  );
}

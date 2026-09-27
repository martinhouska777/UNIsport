"use client";

import { useSyncExternalStore } from "react";
import Phone from "@/components/landing/Phone";
import { usePhoneMode } from "@/components/landing/PhoneMode";
import Shot from "@/components/landing/Shot";
import { lift, schools } from "@/lib/landingSchools";

/*
  THE INTRO'S TWO PHONES — the right half of the intro, cycling through the
  eight schools' colours.

  The owner's notes, 2026-08-23, in order:
    • the intro's sides are empty on a laptop — fill them with "some phone
      screens same as I have down there";
    • closer in, a size smaller, and opening on the white screens;
    • "I want colours, and I want the colours to change by school in the hero
      too, the same as we have with that static image."

  So this is Campus Colours' idea, brought to the front door: gyms-*.webp and
  match-*.webp, changing together, with the school's colour glowing behind
  them. The launch audit (2026-09-27, item 13) turned that light to the page's
  own blue; the owner turned it back the same evening ("make sure it changes
  the background color") — a capture is mostly white, so without it the
  colour hardly changes at all.

  THEY STAND TOGETHER, ON THE RIGHT (owner, 2026-09-27, after Hevy's front
  page). Until then they were a backdrop: one in each margin of a wide screen,
  leaning away from the words at ±11°, at 82% so the words stayed in front.
  Now the intro is split — words left, phones right — and the pair is the
  product rather than a backdrop: Match in front, upright and at full
  strength; Gyms behind it, leaning out to the left, the way Hevy stands its
  second phone behind its first. Match is the one in front because the
  headline lands on it: "Your people." Where each stands is .l-hero-phones in
  app/globals.css — one width sizes both phones and the box they stand in —
  and .l-hero-stage is the half of the intro they stand in, whose height is
  the most that width may use.

  The eight schools' letters stood in a row under each phone for one cut. The
  owner took them off (2026-08-23) and moved a single one onto the "Get started
  with .edu" button — "you see your own university right there" — which is both
  a better place for it and the height these phones needed to grow into. They
  have to be READABLE.

  THE GLOW is a soft column of light, not a halo: a rounded shape the phone's
  own size, blurred. The first cut was a big radial gradient in a box, which
  the box cut square at its edges and which ran off the side of the screen —
  the owner asked for something that ends where you can see it end, with page
  left over beyond it. It is dimmer than that one too.

  WHY THOSE TWO SCREENS. The headline is "Your campus. Your gym. Your people."
  — Gyms and Match are the last two lines of it. Varsity Mode stood on the
  right for one cut and the owner took it off: the front door is the student
  app, and the varsity side has a door of its own underneath and a whole story
  further down. Match had never been recoloured (only the two closers' screens
  had), so scripts/landing/recolor-shots.mjs now carries it too — run it with
  --only=match, then dark-placeholders.mjs for the dark twins.

  Colours are DATA (lib/landingSchools.ts) applied inline — rule 1's content
  exception, the same one the closers stand on. Rule 2 still holds: the page's
  own chrome stays neutral; what changes colour is a picture of a themed app.

  IT MUST NOT CLAIM EIGHT CAMPUSES. The app is live at one. So the cycle STARTS
  on Harvard and no school is named here. The line that stood under the button
  ("Customized for each campus … Yours can be next.") was cut on 2026-09-27;
  Campus Colours spells the idea out further down, and drops the design's
  "eight campuses" claim for the same reason.

  THEY OPEN WHITE, whatever the machine's colour scheme says — a white phone
  reads as an app against the dark page, a dark one reads as a smudge. The
  moment a visitor presses the light/dark switch further down, these follow it
  like every other phone: that is what `chosen` distinguishes. Only the intro
  overrides the default; the rest of the page still opens in the visitor's own
  scheme.

  From lg up only: below that the intro is one column and there is no half to
  stand in. Which school is showing is decided by the intro (useSchoolCycle)
  and handed down, because the words up there take the same colour.
*/
const PHONES = [
  { side: "back" as const, shot: "gyms", what: "The Gyms screen" },
  { side: "front" as const, shot: "match", what: "The Match screen" },
];

/* Tailwind's lg — the `hidden lg:block` on the wrapper below. Hiding with
   CSS alone still let a phone DOWNLOAD both screens (88 KB) for a pair it can
   never show (website review, 2026-09-10); so below this width the component
   renders nothing at all. The server renders nothing either and the wide
   client fills it in on hydration — the phones arrive on their own rise
   anyway. */
const LG = "(min-width: 1024px)";
function subscribeWide(cb: () => void) {
  const mq = window.matchMedia(LG);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export default function HeroPhones({ i, count }: { i: number; count: number }) {
  const { mode, chosen } = usePhoneMode();
  const wide = useSyncExternalStore(subscribeWide, () => window.matchMedia(LG).matches, () => false);
  // The visitor's choice if they made one; white if they have not.
  const shown = chosen ? mode : "light";
  if (!wide) return null;

  const school = schools[i];

  return (
    <div aria-hidden="true" className="l-hero-stage pointer-events-none hidden lg:grid lg:place-items-center">
      <div className="l-hero-phones">
        {PHONES.map((p) => (
          <div key={p.shot} className="l-hero-phone" data-side={p.side}>
            <div className="l-hero-tilt">
              {/* The school's colour. This, not the screenshot, is what makes the
                  page change colour — a capture is mostly white. lift() raises
                  the near-black navies to the weight the others already have. */}
              <div className="l-hero-glow" style={{ backgroundColor: lift(school.color) }} />
              <div className="l-hero-rise">
                <Phone className="relative">
                  <div className="relative aspect-[900/1480] overflow-hidden bg-l-phone-screen">
                    {schools.slice(0, count).map((sc, n) => (
                      <Shot
                        key={sc.key}
                        shot={`/landing/closers/${p.shot}-${sc.key}.webp`}
                        mode={shown}
                        alt={`${p.what} in ${sc.name}'s colours`}
                        fill
                        sizes="(min-width: 1536px) 320px, 290px"
                        quality={75}
                        loading={n === 0 ? "eager" : "lazy"}
                        className="object-fill transition-opacity duration-[600ms] ease-in-out motion-reduce:transition-none"
                        style={{ opacity: n === i ? 1 : 0 }}
                      />
                    ))}
                  </div>
                </Phone>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

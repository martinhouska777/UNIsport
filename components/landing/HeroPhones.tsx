"use client";

import Image from "next/image";
import Phone from "@/components/landing/Phone";
import { shotSrc, usePhoneMode } from "@/components/landing/PhoneMode";
import { lift, schools } from "@/lib/landingSchools";

/*
  THE INTRO'S BACKDROP — two app screens standing beside the words, cycling
  through the eight schools' colours.

  The owner's notes, 2026-08-23, in order:
    • the intro's sides are empty on a laptop — fill them with "some phone
      screens same as I have down there";
    • closer in, a size smaller, and opening on the white screens;
    • "I want colours, and I want the colours to change by school in the hero
      too, the same as we have with that static image."

  So this is Campus Colours' idea, brought to the front door: gyms-*.webp on
  the left and match-*.webp on the right, changing together, each with its
  school's colour glowing behind it.

  The eight schools' letters stood in a row under each phone for one cut. The
  owner took them off (2026-08-23) and moved a single one onto the "Get started
  with .edu" button — "you see your own university right there" — which is both
  a better place for it and the height these phones needed to grow into. They
  are the point of the backdrop, and they have to be READABLE.

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

  IT MUST NOT CLAIM EIGHT CAMPUSES. The app is live at one. So the pill above
  the headline still reads "Live now at Harvard", the cycle STARTS on Harvard,
  and no school is named here — the line under the button ("new campuses are
  onboarded one at a time — colours, gyms and houses included") is what these
  colours illustrate. Campus Colours spells it out further down, and drops the
  design's "eight campuses" claim for the same reason.

  WHERE THEY STAND. Anchored to the TEXT, not to the window — a fixed distance
  out from the middle of the page (the .l-hero-phone rules in app/globals.css)
  — so both are whole, clear of the screen edges, and travel outwards with the
  column of words on a big monitor. Two earlier cuts, so they are not tried
  again: hanging them half off the side edges showed a vertical strip of
  somebody's screen and read as dirt on the page; melting them downwards into
  the doors hid the whole shape of the phone, which is the only thing that
  makes a phone read as one.

  THEY OPEN WHITE, whatever the machine's colour scheme says — a white phone
  reads as an app against the dark page, a dark one reads as a smudge. The
  moment a visitor presses the light/dark switch further down, these follow it
  like every other phone: that is what `chosen` distinguishes. Only the intro
  overrides the default; the rest of the page still opens in the visitor's own
  scheme.

  Wide screens only (xl and up): below that the margins it fills do not exist.
  It sits inside HeroFade, so it leaves with everything else. Which school is
  showing is decided by the intro (useSchoolCycle) and handed down, because the
  words up there take the same colour.
*/
const PHONES = [
  { side: "left" as const, shot: "gyms", what: "The Gyms screen" },
  { side: "right" as const, shot: "match", what: "The Match screen" },
];

export default function HeroPhones({ i, count }: { i: number; count: number }) {
  const { mode, chosen } = usePhoneMode();
  // The visitor's choice if they made one; white if they have not.
  const shown = chosen ? mode : "light";

  const school = schools[i];

  return (
    /* w-screen and centred on the intro's own centre, which is the page's.
       -z-10 keeps it behind the words — the section is its own stacking
       context (z-[1]), so it cannot fall behind the page itself. */
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-1/2 -z-10 hidden w-screen -translate-x-1/2 overflow-hidden xl:block"
    >
      {PHONES.map((p) => (
        <div key={p.shot} className="l-hero-phone" data-side={p.side}>
          <div className="l-hero-tilt">
            {/* The school's colour. This, not the screenshot, is what makes the
                page change colour — a capture is mostly white. lift() raises
                the near-black navies to the weight the others already have. */}
            <div className="l-hero-glow" style={{ backgroundColor: lift(school.color) }} />
            <Phone className="relative opacity-[0.82]">
              <div className="relative aspect-[900/1480] overflow-hidden bg-l-phone-screen">
                {schools.slice(0, count).map((sc, n) => (
                  <Image
                    key={sc.key}
                    src={shotSrc(`/landing/closers/${p.shot}-${sc.key}.webp`, shown)}
                    alt={`${p.what} in ${sc.name}'s colours`}
                    fill
                    sizes="(min-width: 1536px) 290px, 230px"
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
      ))}
    </div>
  );
}

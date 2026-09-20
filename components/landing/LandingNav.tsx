import Link from "next/link";
import StickyBar from "@/components/landing/StickyBar";
import Wordmark from "@/components/landing/Wordmark";
import LandingMenu from "@/components/landing/LandingMenu";
import NavDoors from "@/components/landing/NavDoors";
import { views, type LandingView } from "@/lib/landingCopy";

/*
  The top bar: the wordmark, the TABS (Students · Varsity · Coaches · About ·
  Contact — one address each, see `views` in lib/landingCopy.ts), Log in, and
  the same door as the hero's button (or, once the browser has said the
  visitor is signed in, one "Open the app" — see NavDoors). The wordmark is the way back to the
  whole page. (The team-invite way in lives under the hero, next to the
  doors, where a rower holding a link will read it.)

  Pinned (StickyBar) — like a regular website's — but it slides away while a
  story or a closer is under it: below the intro the page is full-screen
  sticky stages, and a bar pinned over them sat on top of every one. On a
  phone it also hides on scroll-down and returns on scroll-up.

  ONE WORDMARK AT A TIME — ON A LAPTOP. The intro opens on the mark at full
  size, and the bar's 24px copy sits 40px above it — two of the same thing,
  reading as a stutter. So on a laptop, on the views that HAVE the intro
  (`heroMark`), the bar's mark is not drawn until the intro has scrolled away; HeroFade writes the switch onto
  <html> and the .l-nav-mark rules in app/globals.css spend it. The views
  without an intro keep their mark from the start. Nobody loses their way back
  to the whole page either way: that is the Home tab.

  On a phone the tabs do not fit the bar, so they live behind a menu button at
  its left that slides them in from the left edge (LandingMenu). The door says
  "Get started with .edu" in full there too (owner, 2026-09-19 — the short
  "Sign up" didn't name the one thing that makes this door different), so on a
  phone it carries the row on its own and Log in drops to a plain text link.
  The bar stays one row. A phone also keeps BOTH the
  wordmark and the door from the first pixel (see .l-nav-mark in globals.css);
  the hide-while-the-intro-is-up rule is a laptop rule now.
*/
function Tabs({ view, className = "" }: { view: LandingView; className?: string }) {
  return (
    <div className={`flex items-center gap-0.5 sm:gap-1 ${className}`} role="navigation" aria-label="Sections">
      {views.map((v) => {
        const on = v.view === view;
        return (
          <Link
            key={v.view}
            href={v.href}
            aria-current={on ? "page" : undefined}
            /* Bigger; blue when the pointer is on one AND for the tab you are on
               (owner, 2026-09-15) — the landing's own accent, not a hex. */
            className={`tap44 shrink-0 rounded-full px-3 py-2 text-[14px] font-medium tracking-tight transition-[color,background-color,border-color,translate] hover:-translate-y-0.5 sm:px-4 sm:text-[15.5px] ${
              on ? "bg-l-accent-dim text-l-accent" : "text-l-text-2 hover:bg-l-accent-dim hover:text-l-accent"
            }`}
          >
            {v.label}
          </Link>
        );
      })}
    </div>
  );
}

export default function LandingNav({ view = "all", heroMark = false }: { view?: LandingView; heroMark?: boolean }) {
  return (
    <StickyBar>
    <nav className="relative border-b border-l-line bg-l-bg">
      <div className="mx-auto max-w-[1280px] px-6 sm:px-8">
        {/* 11px, not 18: the bar carried a band of empty either side of the
            line (owner, 2026-08-23 — "it has terrible space, make it thinner"),
            and every pixel it gives back is a pixel the intro can be. */}
        <div className="flex items-center justify-between py-[11px]">
          <div className="flex items-center gap-1">
            <LandingMenu view={view} />
            <Link href="/" aria-label="UNIsport" className={heroMark ? "l-nav-mark" : undefined}>
              <Wordmark className="text-xl sm:text-2xl" />
            </Link>
          </div>
          <Tabs view={view} className="hidden md:flex" />
          {/* Log in + the door — or one "Open the app" for somebody already
              signed in. Its own client component because only the browser
              knows which (components/landing/NavDoors.tsx). */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <NavDoors />
          </div>
        </div>
      </div>
    </nav>
    </StickyBar>
  );
}

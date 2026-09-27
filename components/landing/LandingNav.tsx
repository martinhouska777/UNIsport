import Link from "next/link";
import StickyBar from "@/components/landing/StickyBar";
import Wordmark from "@/components/landing/Wordmark";
import LogoMark from "@/components/landing/LogoMark";
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

  THE WORDMARK IS ALWAYS THERE (2026-09-27). It used to stand down on a
  laptop while the intro's big wordmark was on screen — one mark at a time.
  The intro lost that wordmark when it went split, like Hevy's front page, so
  the bar is where the name lives now: top left, from the first frame, on
  every view and every size.

  On a phone — and on a tablet, below lg — the tabs do not fit the bar, so
  they live behind a menu button at its left that slides them in from the left
  edge (LandingMenu). The door says
  "Get started with .edu" in full there too (owner, 2026-09-19 — the short
  "Sign up" didn't name the one thing that makes this door different), so on a
  phone it carries the row on its own and Log in drops to a plain text link.
  The bar stays one row.
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

export default function LandingNav({ view = "all" }: { view?: LandingView }) {
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
            {/* The LOCKUP: the mark, then the name (owner, 2026-09-20 — "put the
                logo top left"). The bar carried the name only; the drawn mark
                lived on the home screen and the browser tab and nowhere a
                visitor would meet it. Both sit inside the one Link, at one
                font-size, so the mark scales with the name. */}
            <Link href="/" aria-label="UNIsport" className="text-xl sm:text-2xl">
              <LogoMark className="mr-[0.24em]" />
              <Wordmark />
            </Link>
          </div>
          <Tabs view={view} className="hidden lg:flex" />
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

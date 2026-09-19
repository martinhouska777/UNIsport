import Link from "next/link";
import StickyBar from "@/components/landing/StickyBar";
import Wordmark from "@/components/landing/Wordmark";
import LandingMenu from "@/components/landing/LandingMenu";
import { hero, nav, views, type LandingView } from "@/lib/landingCopy";

/*
  The top bar: the wordmark, the TABS (Students · Varsity · Coaches · About ·
  Contact — one address each, see `views` in lib/landingCopy.ts), Log in, and
  the same door as the hero's button. The wordmark is the way back to the
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
          <div className="flex items-center gap-2 sm:gap-2.5">
            <Link
              href="/login"
              /* A phone gives the row to the door (which now says "Get started
                 with .edu" in full), so Log in drops its pill there and is a
                 plain text link — still 44px tall to tap. */
              className="tap44 inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-full px-1.5 text-[13px] font-medium tracking-tight text-l-text-2 transition-[color,background-color,border-color,translate] hover:text-l-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-l-text sm:border sm:border-l-line sm:bg-l-bg sm:px-[18px] sm:text-sm sm:text-l-text sm:hover:-translate-y-0.5 sm:hover:border-l-line-hover sm:hover:bg-l-bg-elevated"
            >
              {nav.login}
            </Link>
            {/* The door, always in the bar. It used to hide on a phone while
                the intro was on screen (the intro's own button stands under
                it) — but that left the bar with nothing but Log in, which read
                as a site you can only sign IN to (owner, 2026-09-19). */}
            <Link
              href={hero.primaryHref}
              /* It wears the school the intro is showing, and changes with it
                 (owner, 2026-09-19): --sc / --sc-ink are published on <html>
                 by LandingHero. A view with no intro never sets them, so the
                 fallback is the page's own ink — what the bar looked like
                 before. Same 700ms fade as the intro's own button, so the two
                 turn together. */
              style={{
                backgroundColor: "var(--sc, var(--color-l-text))",
                borderColor: "var(--sc, var(--color-l-text))",
                color: "var(--sc-ink, var(--color-l-bg))",
              }}
              className="inline-flex h-10 items-center whitespace-nowrap rounded-full border px-3.5 text-[13px] font-medium tracking-tight transition-[background-color,border-color,color,translate] duration-700 ease-in-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-l-text motion-reduce:transition-none sm:px-[18px] sm:text-sm"
            >
              {nav.cta}
            </Link>
          </div>
        </div>
      </div>
    </nav>
    </StickyBar>
  );
}

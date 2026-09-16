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

  ONE WORDMARK AT A TIME. The intro now opens on the mark at full size, and
  the bar's 24px copy sits 40px above it — two of the same thing, reading as a
  stutter. So on the views that HAVE the intro (`heroMark`), the bar's mark is
  not drawn until the intro has scrolled away; HeroFade writes the switch onto
  <html> and the .l-nav-mark rules in app/globals.css spend it. The views
  without an intro keep their mark from the start. Nobody loses their way back
  to the whole page either way: that is the Home tab.

  On a phone the tabs do not fit the bar, so they live behind a menu button at
  its left that slides them in from the left edge (LandingMenu), and the door
  shortens to "Sign up" — the bar stays one row.
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
            className={`tap44 shrink-0 rounded-full px-3 py-2 text-[14px] font-medium tracking-tight transition-colors sm:px-4 sm:text-[15.5px] ${
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
              <Wordmark className="text-2xl" />
            </Link>
          </div>
          <Tabs view={view} className="hidden md:flex" />
          <div className="flex items-center gap-2 sm:gap-2.5">
            <Link
              href="/login"
              className="tap44 inline-flex h-10 items-center rounded-full border border-l-line bg-l-bg px-3.5 text-[13px] font-medium tracking-tight text-l-text transition-colors hover:border-l-line-hover hover:bg-l-bg-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-l-text sm:px-[18px] sm:text-sm"
            >
              {nav.login}
            </Link>
            {/* On a phone the intro's own button stands directly under this one,
                so the pair read as two different doors (website review,
                2026-09-10). This copy follows the wordmark's rule there —
                not drawn while the intro is on screen (.l-nav-cta, phones
                only); a laptop keeps both, where the bar is a thin line. */}
            <Link
              href={hero.primaryHref}
              className={`inline-flex h-10 items-center whitespace-nowrap rounded-full border border-l-text bg-l-text px-4 text-sm font-medium tracking-tight text-l-bg transition-colors hover:border-(--color-l-accent) hover:bg-l-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-l-text sm:px-[18px] ${heroMark ? "l-nav-cta" : ""}`}
            >
              <span className="sm:hidden">{nav.ctaShort}</span>
              <span className="hidden sm:inline">{nav.cta}</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
    </StickyBar>
  );
}

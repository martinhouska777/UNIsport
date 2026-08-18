import Link from "next/link";
import TabRow from "@/components/landing/TabRow";
import { nav, views, type LandingView } from "@/lib/landingCopy";

/*
  The top bar: the wordmark, the TABS (Students · Varsity · Coaches · About ·
  Contact — one address each, see `views` in lib/landingCopy.ts), Log in, and
  the same door as the hero's button. The wordmark is the way back to the
  whole page. (The team-invite way in lives under the hero, next to the
  doors, where a rower holding a link will read it.)

  Static, not sticky: below the intro the page is full-screen sticky stages —
  the stories, the closers — and a bar pinned over them would sit on top of
  every one. The hero's button and the final CTA are the ways in.

  On a phone the tabs take a second row of their own (six labels plus two
  buttons plus the wordmark do not fit one 375px row); it scrolls sideways
  without a scrollbar, with a fade on the right while there is more (TabRow).
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
            className={`shrink-0 rounded-full px-2.5 py-1.5 text-[12.5px] font-medium tracking-tight transition-colors sm:px-3.5 sm:text-sm ${
              on ? "bg-l-line-hover text-l-text" : "text-l-text-2 hover:text-l-text"
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
    <nav className="relative z-[2] border-b border-l-line bg-l-bg">
      <div className="mx-auto max-w-[1280px] px-6 sm:px-8">
        <div className="flex items-center justify-between py-[18px]">
          <Link href="/" className="font-display text-2xl italic tracking-tight text-l-text">
            UNI<span className="text-l-accent">sport</span>
          </Link>
          <Tabs view={view} className="hidden md:flex" />
          <div className="flex items-center gap-2 sm:gap-2.5">
            <Link
              href="/login"
              className="rounded-full px-3.5 py-2 text-[13px] font-medium tracking-tight text-l-text-2 transition-colors hover:text-l-text sm:px-[18px] sm:text-sm"
            >
              {nav.login}
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-l-text px-[18px] py-2.5 text-sm font-medium tracking-tight text-l-bg transition-colors hover:bg-l-accent"
            >
              {nav.cta}
            </Link>
          </div>
        </div>
        {/* The phone row: scrolls sideways, fade on the right while there is more. */}
        <TabRow className="md:hidden">
          <Tabs view={view} className="w-max" />
        </TabRow>
      </div>
    </nav>
  );
}

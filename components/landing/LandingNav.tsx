import Link from "next/link";
import { nav } from "@/lib/landingCopy";

/*
  The top bar: the wordmark, Log in, and the same door as the hero's button.
  (The team-invite way in lives under the hero, next to the doors, where a
  rower holding a link will read it.)

  Static, not sticky: below the intro the page is full-screen sticky stages —
  the stories, the closers — and a bar pinned over them would sit on top of
  every one. The hero's button and the final CTA are the ways in.
*/
export default function LandingNav() {
  return (
    <nav className="relative z-[2] border-b border-l-line bg-l-bg">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-[18px] sm:px-8">
        <Link href="/" className="font-display text-2xl italic tracking-tight text-l-text">
          UNI<span className="text-l-accent">sport</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-2.5">
          <Link
            href="/login"
            className="rounded-full px-3.5 py-2 text-[13px] font-medium tracking-tight text-l-text-2 transition-colors hover:text-l-text sm:px-[18px] sm:text-sm"
          >
            {nav.login}
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-l-text px-[18px] py-2.5 text-sm font-medium tracking-tight text-l-bg transition-colors hover:bg-l-accent hover:text-l-text"
          >
            {nav.cta}
          </Link>
        </div>
      </div>
    </nav>
  );
}

"use client";

/*
  THE RIGHT-HAND END OF THE TOP BAR — "Log in" and "Join the waitlist",
  or, for someone who is already signed in, one "Open the app".

  THE LOUD BUTTON IS THE WAITLIST (owner, 2026-09-22), not the sign-up it used
  to be. Why is in lib/landingCopy.ts `nav.waitlist`, and the short version is
  that the sign-up works but lands you in an empty campus. "Log in" is
  deliberately still here and still leads to a screen with a Sign up on it: the
  app is still being built and has to stay reachable. The quiet door is open,
  it is just not the one being pointed at.

  WHY IT IS ITS OWN CLIENT COMPONENT. The landing is a static page: it is built
  once and handed to everybody, so the server cannot know who is reading it.
  Whether there is a session is a thing only the browser can answer, and asking
  the server instead would make the whole marketing page dynamic — slower for
  every visitor, to change two buttons for the few who are already in.

  So the bar is BUILT signed-out, which is the truth for nearly everyone who
  arrives here and the version search engines should see, and swaps once the
  session is known. The first render on the browser matches the HTML exactly
  (`ready` is false until AppState has looked), so nothing mismatches; a
  signed-in visitor simply sees the pair become one button a moment later.

  Before this, a signed-in student looking at the landing — which is where the
  installed app used to open — was offered "Log in" and "Get started with .edu"
  on a door they had already walked through (audit, 2026-09-19).
*/
import Link from "next/link";
import { useAppState } from "@/components/AppState";
import { nav } from "@/lib/landingCopy";

/* The pair's shared shape, so the one button is the same size as the two. */
const DOOR_CLS =
  "inline-flex h-10 items-center whitespace-nowrap rounded-full border px-3.5 text-[13px] font-medium tracking-tight transition-[background-color,border-color,color,translate] duration-700 ease-in-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-l-text motion-reduce:transition-none sm:px-[18px] sm:text-sm";

/* It wears the school the intro is showing, and changes with it (owner,
   2026-09-19): --sc / --sc-ink are published on <html> by LandingHero. A view
   with no intro never sets them, so the fallback is the page's own ink. */
const DOOR_STYLE = {
  backgroundColor: "var(--sc, var(--color-l-text))",
  borderColor: "var(--sc, var(--color-l-text))",
  color: "var(--sc-ink, var(--color-l-bg))",
} as const;

export default function NavDoors() {
  const { ready, loggedIn } = useAppState();

  if (ready && loggedIn) {
    return (
      <Link href={nav.openAppHref} style={DOOR_STYLE} className={DOOR_CLS}>
        {nav.openApp}
      </Link>
    );
  }

  return (
    <>
      <Link
        href="/login"
        /* A phone gives the row to the door (which now says "Get started with
           .edu" in full), so Log in drops its pill there and is a plain text
           link — still 44px tall to tap. */
        className="tap44 inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-full px-1.5 text-[13px] font-medium tracking-tight text-l-text-2 transition-[color,background-color,border-color,translate] hover:text-l-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-l-text sm:border sm:border-l-line sm:bg-l-bg sm:px-[18px] sm:text-sm sm:text-l-text sm:hover:-translate-y-0.5 sm:hover:border-l-line-hover sm:hover:bg-l-bg-elevated"
      >
        {nav.login}
      </Link>
      {/* The door, always in the bar. It used to hide on a phone while the
          intro was on screen (the intro's own button stands under it) — but
          that left the bar with nothing but Log in, which read as a site you
          can only sign IN to (owner, 2026-09-19). */}
      <Link href={nav.waitlistHref} style={DOOR_STYLE} className={DOOR_CLS}>
        {nav.waitlist}
      </Link>
    </>
  );
}

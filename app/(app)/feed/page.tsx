"use client";

/*
  FEED — the fifth tab.
  ---------------------------------------------------------------------------
  What's happening, rather than who or where: the tab where a session someone
  logged, a PR someone hit, or a "going at 6, anyone?" is visible to people who
  never opened Match.

  THIS IS THE FIRST SLICE: the tab, its route, and an honest empty state. There
  is deliberately nothing in it yet, because what counts as a post is still the
  open product question (a logged session? a photo? a personal record? a call
  for a partner?) and inventing an answer in code is how a feature ends up
  built around the wrong thing.

  The one decision already made: this feed is meant to reach ACROSS schools —
  Harvard seeing Yale — which is the first place in the app where the wall
  between universities is deliberately open. Everything else in Zone 2 is one
  school's own world. Until there is a second school it will show one, so it
  has to read well that way too.

  Colors are theme tokens (rule 1).
*/

export default function FeedPage() {
  return (
    <div className="mx-auto w-full max-w-screen-sm lg:max-w-3xl lg:px-4 lg:pt-3">
      {/* Same heading treatment as the other tabs: hidden on phones, where the
          design has no header bar, real on a laptop. */}
      <h1 className="sr-only px-3 text-lg font-semibold text-text lg:not-sr-only lg:mb-1 lg:block">
        Feed
      </h1>

      <div className="px-6 py-20 text-center">
        <h2 className="text-sm font-medium text-text">Nothing here yet</h2>
        <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-muted">
          This is where what’s happening will show up — sessions, results and
          people looking for company, from your school and eventually from the
          others too.
        </p>
      </div>
    </div>
  );
}

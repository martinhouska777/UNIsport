"use client";

/*
  WHAT A GATED SHELL SHOWS WHILE IT IS STILL DECIDING.
  ---------------------------------------------------------------------------
  Every gated layout used to `return null` while it worked out whether you are
  signed in, set up, and on a squad. `null` paints the theme's background and
  nothing else — on the varsity side that is a **black screen with no words, no
  spinner and no way out**, and it is indistinguishable from a broken app. Any
  hang upstream (a session that never resolves, a squad lookup that never
  lands, a redirect that never fires) turned into a permanent one. It was
  reported as exactly that, from a phone, twice.

  So: a quiet spinner first, because most of these waits are under a second and
  a message would only flash. If it is still going after SLOW_MS, the screen
  says so and offers the two things that actually help — reload, and a way out
  of here. A full page load on purpose (plain <a>, not <Link>): the point is to
  start over, and a client-side navigation would keep whatever is stuck.
*/
import { useEffect, useState } from "react";

const SLOW_MS = 6000;

export default function LoadingGate({ back = "/" }: { back?: string }) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center gap-4 bg-background px-8 text-center">
      <span
        role="status"
        aria-label="Loading"
        className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-primary"
      />
      {slow && (
        <>
          <p className="max-w-xs text-[13px] leading-relaxed text-muted">
            This is taking longer than it should. Your connection may have dropped
            part-way through loading.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="tap44 rounded-xl bg-primary px-4 py-2 text-[13px] font-semibold text-primary-contrast"
            >
              Reload
            </button>
            <a
              href={back}
              className="tap44 rounded-xl border border-border px-4 py-2 text-[13px] font-semibold text-text"
            >
              Back to start
            </a>
          </div>
        </>
      )}
    </div>
  );
}

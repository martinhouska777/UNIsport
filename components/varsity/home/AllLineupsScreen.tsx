"use client";

/*
  ALL BOATS — every published crew for one day, on a page of its own.
  ---------------------------------------------------------------------------
  Home shows you your boat and nothing else, because three published eights is
  a screen and a half of other people's names before anything you came for.
  This is where the rest went. Reached from "All boats" in the lineup section,
  which carries the day Home was looking at (?d=yyyy-mm-dd) so the two never
  disagree about which morning is on screen.

  Every card starts SHUT. The point of the page is to see the day at a glance —
  which boats are out, which ones you know people in — and then open the one you
  actually want. Yours, when you are in one, is marked and sits first.
*/
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAppState } from "@/components/AppState";
import LineupBoatCard, { isMyBoat } from "@/components/varsity/LineupBoatCard";
import SectionLabel from "@/components/ui/SectionLabel";
import { SkeletonCards } from "@/components/ui/Skeleton";
import { IconArrowLeft } from "@/components/icons";
import { parseDate, sessionKey, toISO } from "@/lib/varsity/coachPlan";
import { fetchTodayLineups } from "@/lib/varsity/lineupStore";
import { fetchProfileFullName } from "@/lib/varsity/planStore";
import type { Lineup } from "@/lib/varsity/home";

/* "Fri · 4 Sep" — the same shape the day detail on Home uses. */
function dateLabel(iso: string): string {
  const d = parseDate(iso);
  return `${d.toLocaleDateString("en-US", { weekday: "short" })} · ${d.toLocaleDateString(
    "en-US",
    { day: "numeric", month: "short" },
  )}`;
}

function AllLineups() {
  const { userId } = useAppState();
  const params = useSearchParams();
  // No day on the link means the day everybody means by default.
  const iso = params.get("d") || toISO(new Date());
  const [lineups, setLineups] = useState<Lineup[] | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const name = await fetchProfileFullName(userId);
      const found = await fetchTodayLineups((p) => sessionKey(parseDate(iso), p), name);
      if (active) setLineups(found);
    })();
    return () => {
      active = false;
    };
  }, [userId, iso]);

  // Yours first — on a page of eight boats, the one with your name in it should
  // not be the one you have to hunt for.
  const ordered = lineups ? [...lineups].sort((a, b) => Number(isMyBoat(b)) - Number(isMyBoat(a))) : null;

  return (
    <div className="mx-auto w-full max-w-screen-sm pb-6">
      <div className="flex items-center gap-2 px-3 pt-3">
        <Link
          href="/varsity/home"
          className="tap44 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted"
          aria-label="Back to Home"
        >
          <IconArrowLeft size={14} />
        </Link>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-text">All boats</div>
          <div className="text-[11px] text-muted">{dateLabel(iso)}</div>
        </div>
      </div>

      <div className="px-3 pt-4">
        {ordered === null ? (
          <SkeletonCards count={3} />
        ) : ordered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-6 text-center text-[12px] text-muted">
            No boats published for this day.
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between px-1">
              <SectionLabel>
                {ordered.length === 1 ? "1 boat" : `${ordered.length} boats`}
              </SectionLabel>
              <span className="text-[11px] text-muted">Tap one to open it</span>
            </div>
            <div className="flex flex-col gap-3">
              {ordered.map((l, i) => (
                <LineupBoatCard key={i} l={l} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AllLineupsScreen() {
  // The day comes out of the URL, which a page has to be allowed to wait for.
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-screen-sm px-3 pt-4">
          <SkeletonCards count={3} />
        </div>
      }
    >
      <AllLineups />
    </Suspense>
  );
}

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

  A SEARCH sits above them: type a name and only the boats carrying it are left,
  already open. "Which boat is Havel in" used to mean opening all of them.
*/
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAppState } from "@/components/AppState";
import LineupBoatCard, { isMyBoat } from "@/components/varsity/LineupBoatCard";
import { SkeletonCards } from "@/components/ui/Skeleton";
import { IconArrowLeft, IconSearch, IconX } from "@/components/icons";
import { parseDate, sessionKey, toISO } from "@/lib/varsity/coachPlan";
import { fetchTodayLineups } from "@/lib/varsity/lineupStore";
import { fetchSeatIdentity } from "@/lib/varsity/athleteProfile";
import { crewNames, type Lineup } from "@/lib/varsity/home";
import { fetchOutOn } from "@/lib/varsity/availabilityStore";
import OutOfBoatsCard, { outPeople, type OutPerson } from "@/components/varsity/OutOfBoatsCard";

/* "Fri · 4 Sep" — the same shape the day detail on Home uses. */
function dateLabel(iso: string): string {
  const d = parseDate(iso);
  return `${d.toLocaleDateString("en-US", { weekday: "short" })} · ${d.toLocaleDateString(
    "en-US",
    { day: "numeric", month: "short" },
  )}`;
}

/*
  THE DAY'S BOATS, AND A WAY TO LOOK SOMEBODY UP.

  "Which boat is Havel in?" is the question this page gets asked most after
  "where am I", and answering it meant opening eight crews and reading nine
  names in each. Type a name and only the boats carrying it are left — already
  OPEN, because a search that hands you a shut card has not answered anything.

  The search reads every name aboard, cox included (lib/varsity/home →
  crewNames), and matches anywhere in the name, so a surname finds them.
*/
function BoatSearchList({ lineups, out }: { lineups: Lineup[]; out: OutPerson[] }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? lineups.filter((l) => crewNames(l).some((n) => n.includes(needle)))
    : lineups;
  /* The search covers the out list too: somebody who is not in a boat is
     still an answer to "where is Richards this morning", and the most
     useful one. */
  const shownOut = needle ? out.filter((p) => p.name.toLowerCase().includes(needle)) : out;
  const hit = needle ? shown.length + shownOut.length : 1;

  return (
    <>
      {/* One field, no button — it filters as you type. 16px so a phone doesn't
          zoom the page the moment it is tapped. */}
      <div className="relative mb-3">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          <IconSearch size={15} />
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Find someone in a boat"
          placeholder="Find a name…"
          className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-9 text-base text-text outline-none focus:border-primary placeholder:text-muted"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Clear the search"
            className="tap44 absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-muted"
          >
            <IconX size={14} />
          </button>
        )}
      </div>

      {/* No count and no "Tap one to open it" above the list. The boats are
          right there to be counted, and a card that looks like a card does not
          need a caption telling you it can be pressed. */}
      {hit === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-6 text-center text-[12px] text-muted">
          Nobody by that name is on this day&rsquo;s sheet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map((l, i) => (
            /* The query is part of the key, so a card a search just matched
               re-opens instead of keeping the shut state it was mounted with. */
            <LineupBoatCard key={`${i}-${needle}`} l={l} defaultOpen={!!needle} />
          ))}
          {/* Last, because it is the answer to a different question than
              "which boat am I in" — and open straight away when a search
              is what put it there. */}
          <OutOfBoatsCard key={`out-${needle}`} people={shownOut} defaultOpen={!!needle} />
        </div>
      )}
    </>
  );
}

function AllLineups() {
  const { userId } = useAppState();
  const params = useSearchParams();
  // No day on the link means the day everybody means by default.
  const iso = params.get("d") || toISO(new Date());
  const [lineups, setLineups] = useState<Lineup[] | null>(null);
  const [out, setOut] = useState<OutPerson[]>([]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const me = await fetchSeatIdentity(userId);
      const [found, whoIsOut] = await Promise.all([
        fetchTodayLineups((p) => sessionKey(parseDate(iso), p), me),
        fetchOutOn(iso),
      ]);
      if (!active) return;
      setLineups(found);
      setOut(outPeople(whoIsOut));
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
        ) : ordered.length === 0 && out.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-6 text-center text-[12px] text-muted">
            No boats published for this day.
          </div>
        ) : (
          <BoatSearchList lineups={ordered} out={out} />
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

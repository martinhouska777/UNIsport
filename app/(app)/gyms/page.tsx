"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { gymsFor, type Gym } from "@/lib/gyms";
import { useAppState } from "@/components/AppState";
import { getUniversity } from "@/lib/themes";
import { useFavorites } from "@/lib/gymSocial";
import { gymOpenState, useClock, type Clock } from "@/lib/gymHours";
import OpenNow from "@/components/gyms/OpenNow";
import GoingLine from "@/components/gyms/GoingLine";
import { useBoardByGym } from "@/lib/gymGoing";
import type { GoingSummary } from "@/lib/buddyBoard";
import { gymScores, scoreLabel, type GymScore } from "@/lib/supabase/gymReviews";
import {
  IconSearch,
  IconHeart,
  IconChevronRight,
  IconStar,
  HouseSigil,
} from "@/components/icons";
import UniversityCrest from "@/components/UniversityCrest";

type Filter = "all" | "fav" | "main" | "house";

const filters: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "fav", label: "Favourites" },
  { key: "main", label: "Main" },
  { key: "house", label: "House" },
];

/*
  Heart toggle that sits on a gym card without triggering the card's link.
  `taps` exists purely so the pop plays when you favourite something and NOT on
  every render of an already-favourited gym: bumping it changes the inner span's
  key, which remounts it and restarts the animation from the top. It sits in
  line at the end of the row, before the chevron. (It also floated in the
  corner of a main gym's red band until those went on 2026-10-18, and on a
  gym's photo until gym photos went on 2026-10-02.)
*/
function FavHeart({ fav, onToggle }: { fav: boolean; onToggle: () => void }) {
  const [taps, setTaps] = useState(0);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setTaps((t) => t + 1);
        onToggle();
      }}
      aria-label={fav ? "Remove from favourites" : "Add to favourites"}
      aria-pressed={fav}
      className={`tap44 press-icon flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
        fav ? "text-primary-live" : "text-text-3"
      }`}
    >
      <span key={taps} className={taps > 0 && fav ? "react-pop block" : "block"}>
        <IconHeart size={15} filled={fav} />
      </span>
    </button>
  );
}

type CardProps = {
  gym: Gym;
  fav: boolean;
  onToggleFav: () => void;
  now: Clock | null;
  going: GoingSummary | null;
  /** What students gave it (db/gym_reviews.sql); null until someone has. */
  score: number | null;
  /* The tour presses the first card to open a gym in front of you, rather than
     arriving there behind your back (lib/tour.ts). Only that card gets one. */
  tour?: string;
};

/* The card chassis: white, a hairline edge, the soft lift. */
const CARD =
  "relative flex overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--card-shadow)]";

/*
  EVERY GYM IS ONE ROW (owner, 2026-10-18, version D of four drawn: "I like the
  D with houses having stripes but on left not top"; "i dont like how it is
  poster style"). A crest on a square tinted in the gym's colour, the name,
  the address for a main gym, when it is open, who is going, the heart, the
  chevron. The main gyms used to be a solid band of the school colour with the
  name in white (2026-09-27), which read as three posters stacked over the
  houses; now the school's crest carries the colour, the same way a house's
  crest carries its own.
  A house also wears its main colour as a stripe down the LEFT edge (it ran
  along the top until 2026-10-18): "Adams just yellow, Cabot red, Quincy just
  red" (owner, 2026-09-27). A main gym has no stripe.
  House colours are per-entity CONTENT from lib/gyms.ts, applied inline
  (rule 1's data exception); a main gym's colour is the theme's --primary.
*/
function GymRow({
  gym,
  fav,
  onToggleFav,
  now,
  going,
  score,
  tour,
  crest,
  tint,
  stripe,
  address,
}: CardProps & { crest: ReactNode; tint: string; stripe?: string; address?: string }) {
  return (
    <Link href={`/gyms/${gym.slug}`} data-tour={tour} className={CARD}>
      {stripe && <div className="w-1 flex-shrink-0" style={{ background: stripe }} />}
      <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5">
        <span
          className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ background: `color-mix(in oklab, ${tint} 14%, var(--surface))` }}
        >
          {crest}
        </span>
        {/* Just the name: no "House gym" / "Dorm gym" under it; the section
            heading above the cards already says what they are. */}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold text-text">{gym.name}</div>
          {address && <div className="truncate text-[12px] text-text">{address}</div>}
          <div className="mt-0.5 text-xs text-muted">
            <OpenNow hours={gym.hours} now={now} size={12} />
          </div>
          {/* The rating and how many are going, side by side (owner,
              2026-10-18: "show rating and just how many people are going and
              not when"). Only real ratings: a gym nobody has rated shows none
              rather than the made-up numbers in lib/gyms.ts. */}
          {(score !== null || going) && (
            <div className="mt-0.5 flex items-center gap-3">
              {score !== null && (
                <span className="flex items-center gap-1 text-xs font-medium text-text">
                  <span className="text-podium-1">
                    <IconStar size={13} />
                  </span>
                  {scoreLabel(score)}
                </span>
              )}
              {going && <GoingLine going={going} gymName={gym.name} compact />}
            </div>
          )}
        </div>
        <FavHeart fav={fav} onToggle={onToggleFav} />
        <span className="flex-shrink-0 text-muted">
          <IconChevronRight size={16} />
        </span>
      </div>
    </Link>
  );
}

function MainCard(props: CardProps) {
  return (
    <GymRow
      {...props}
      crest={<UniversityCrest size={32} />}
      tint="var(--primary)"
      address={props.gym.address}
    />
  );
}

function HouseCard(props: CardProps) {
  const colors = props.gym.houseColors;
  return (
    <GymRow
      {...props}
      crest={colors ? <HouseSigil primary={colors.primary} secondary={colors.secondary} size={30} /> : null}
      tint={colors?.primary ?? "var(--accent)"}
      stripe={colors?.primary ?? "var(--accent)"}
    />
  );
}

export default function GymsPage() {
  const { userId, universityKey } = useAppState();
  const { isFavorite, toggle } = useFavorites(userId);
  // The Buddy Board by gym — "3 going tonight" on the card people choose from.
  const { goingFor, loaded: boardLoaded } = useBoardByGym(userId);
  // Every gym's rating in one read, the same summary the gym page shows.
  const [scores, setScores] = useState<Record<string, GymScore> | null>(null);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    gymScores(userId)
      // A failed read is a card without a rating, not a broken list.
      .catch(() => ({}))
      .then((s) => active && setScores(s));
    return () => {
      active = false;
    };
  }, [userId]);
  const scoreFor = (slug: string) => {
    const s = scores?.[slug];
    return s && s.reviews > 0 ? s.score : null;
  };
  // One clock for the whole list, so every card agrees on what time it is.
  const now = useClock();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  // The school's list AND its words for the residential section — Harvard has
  // houses, Yale colleges, Brown dorms. Both come from data (rules 2, 7).
  const gyms = gymsFor(universityKey);
  const uni = getUniversity(universityKey);

  const q = query.trim().toLowerCase();
  const matches = (g: Gym) =>
    (q === "" ||
      g.name.toLowerCase().includes(q) ||
      g.address.toLowerCase().includes(q)) &&
    (filter !== "fav" || isFavorite(g.slug));

  const mainGyms = gyms.filter((g) => g.kind === "main" && matches(g));
  const houseGyms = gyms.filter((g) => g.kind === "house" && matches(g));

  const showMain = filter === "all" || filter === "fav" || filter === "main";
  const showHouse = filter === "all" || filter === "fav" || filter === "house";

  /*
    Open gyms first. A closed gym is not a result you can act on, so it sinks to
    the bottom of its own section rather than sitting between two you could walk
    into. The order INSIDE each group is left alone — that's the curated order in
    lib/gyms.ts — and nothing moves until the browser knows the time (`now`),
    which keeps the first paint identical to the server's.
  */
  const openFirst = (list: Gym[]) => {
    if (now === null) return list;
    const isOpen = (g: Gym) => gymOpenState(g.hours, now.minutes)?.open ?? true;
    return [...list].sort((a, b) => Number(isOpen(b)) - Number(isOpen(a)));
  };

  const visibleMain = showMain ? openFirst(mainGyms) : [];
  const visibleHouse = showHouse ? openFirst(houseGyms) : [];
  const nothing = visibleMain.length === 0 && visibleHouse.length === 0;
  // House gyms get their own section header in the mixed views.
  const showHouseHeader = (filter === "all" || filter === "fav") && visibleHouse.length > 0;
  // …and so do the main gyms above them, in the same small heading.
  const showMainHeader = (filter === "all" || filter === "fav") && visibleMain.length > 0;

  return (
    /*
      Phone: the usual 640px column. Laptop: the column widens and the cards
      below lay out in a grid, so a big screen shows the whole gym list at once
      instead of one narrow strip in the middle of the page.
    */
    <div className="mx-auto w-full max-w-screen-sm lg:max-w-5xl lg:px-4 lg:pt-3">
      {/* The route's title, for screen readers only — no visible "Gyms" on any
          screen size; the tab bar already says where you are. */}
      <h1 className="sr-only">Gyms</h1>
      {/* For the app walk (components/tour/TourOverlay): the first card is on
          screen but its "going" line is still loading, and will grow it. */}
      {(!boardLoaded || (userId && !scores)) && <span hidden data-tour-pending="gyms-first-card" />}

      {/* Search bar — filters the list as you type */}
      <div className="px-3 pt-3">
        {/* A search field stretched across a whole laptop screen looks broken,
            so it keeps a sane width once there's room. */}
        <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-muted focus-within:border-primary lg:max-w-md">
          <IconSearch size={15} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search gyms..."
            aria-label="Search gyms"
            // 16px text prevents mobile browsers from auto-zooming on focus.
            className="w-full min-w-0 bg-transparent text-base text-text placeholder:text-faint focus:outline-none"
          />
        </div>
      </div>

      {/* Filter pills */}
      <div className="px-3 py-2.5">
        {/* data-tour: the tour lights this row when it explains favourites
            (lib/tour.ts). */}
        <div data-tour="gyms-filters" className="flex gap-1.5">
          {filters.map((f) => {
            const active = filter === f.key;
            const label = f.key === "house" ? (uni?.housePill ?? f.label) : f.label;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`tap44 rounded-full px-3.5 py-1.5 text-[11px] font-medium transition-colors ${
                  active
                    ? "bg-text text-background"
                    : "border border-border bg-surface text-muted"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards — one column on a phone, two or three across on a laptop. */}
      <div className="grid grid-cols-1 items-start gap-2.5 px-3 pb-4 lg:grid-cols-2 xl:grid-cols-3">
        {showMainHeader && (
          <div className="pb-0.5 lg:col-span-full">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
              {uni?.mainSection ?? "Main gyms"}
            </h2>
          </div>
        )}

        {visibleMain.map((g, idx) => (
          <MainCard
            key={g.slug}
            gym={g}
            fav={isFavorite(g.slug)}
            onToggleFav={() => toggle(g.slug)}
            now={now}
            going={goingFor(g.name)}
            score={scoreFor(g.slug)}
            tour={idx === 0 ? "gyms-first-card" : undefined}
          />
        ))}

        {showHouseHeader && (
          // Section headings break the grid rather than sitting in a cell.
          <div className="pb-0.5 pt-1 lg:col-span-full lg:pt-3">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
              {uni?.houseSection ?? "House gyms"}
            </h2>
          </div>
        )}

        {visibleHouse.map((g) => (
          <HouseCard
            key={g.slug}
            gym={g}
            fav={isFavorite(g.slug)}
            onToggleFav={() => toggle(g.slug)}
            now={now}
            going={goingFor(g.name)}
            score={scoreFor(g.slug)}
          />
        ))}

        {nothing && (
          <div className="py-16 text-center text-sm text-muted lg:col-span-full">
            {filter === "fav" && q === ""
              ? "No favourites yet."
              : `No gyms match “${query}”.`}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { gymsFor, type Gym } from "@/lib/gyms";
import { useAppState } from "@/components/AppState";
import { getUniversity } from "@/lib/themes";
import { useFavorites, useGymPhotos } from "@/lib/gymSocial";
import { gymOpenState, useClock, type Clock } from "@/lib/gymHours";
import OpenNow from "@/components/gyms/OpenNow";
import GoingLine from "@/components/gyms/GoingLine";
import { useBoardByGym } from "@/lib/gymGoing";
import type { GoingSummary } from "@/lib/buddyBoard";
import {
  IconSearch,
  IconHeart,
  IconChevronRight,
  HouseSigil,
} from "@/components/icons";

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
  key, which remounts it and restarts the animation from the top.

  Two places, two looks: `band` floats in the corner of a main gym's colour
  band, in the band's own contrast colour; `row` sits in line at the end of a
  house row, before the chevron.
*/
function FavHeart({
  fav,
  onToggle,
  place,
}: {
  fav: boolean;
  onToggle: () => void;
  place: "band" | "row";
}) {
  const [taps, setTaps] = useState(0);
  const look =
    place === "band"
      ? "absolute right-2 top-2 z-10 h-7 w-7 bg-primary-contrast/15 text-primary-contrast"
      : `h-7 w-7 flex-shrink-0 ${fav ? "text-primary-live" : "text-text-3"}`;
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
      className={`tap44 press-icon flex items-center justify-center rounded-full ${look}`}
    >
      <span key={taps} className={taps > 0 && fav ? "react-pop block" : "block"}>
        <IconHeart size={15} filled={fav} />
      </span>
    </button>
  );
}

function StatsRow({
  gym,
  now,
  going,
}: {
  gym: Gym;
  now: Clock | null;
  going: GoingSummary | null;
}) {
  return (
    /* The card's white foot under the colour band, a hairline above it. It was
       a grey `ink` strip until 2026-09-27; the owner picked this look off five
       drawn options ("neater and better looking"). */
    <div className="flex flex-col gap-1.5 border-t border-border bg-surface px-3.5 py-2.5">
      {/* The Buddy Board, one line: who has already said they're going here.
          Nothing is drawn when nobody has — see GoingLine. */}
      <GoingLine going={going} gymName={gym.name} compact />
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        {/* Can you walk in right now — the one thing the timetable was hiding */}
        <OpenNow hours={gym.hours} now={now} />
        {/* No star average here. gym.rating / gym.ratingCount in lib/gyms.ts are
            placeholder numbers, and "4.8 · 142 ratings" on a real named gym is
            a claim nobody made. They come back when real ratings exist. */}
        {/* No "how busy" either (owner, 2026-09-22): a card says when the gym
            is open and where it is, and that is the whole of it. The crowd
            reporting it came from went off the gym page the same day. */}
      </div>
      <span className="flex-shrink-0 text-muted">
        <IconChevronRight size={16} />
      </span>
    </div>
    </div>
  );
}

type CardProps = {
  gym: Gym;
  fav: boolean;
  onToggleFav: () => void;
  now: Clock | null;
  going: GoingSummary | null;
  /* The tour presses the first card to open a gym in front of you, rather than
     arriving there behind your back (lib/tour.ts). Only that card gets one. */
  tour?: string;
  /* The newest photo anyone at the school has added to this gym (lib/gymSocial
     useGymPhotos). When there is one it replaces the colour band. */
  cover?: string | null;
};

/* The card chassis both kinds share: white, a hairline edge, the soft lift. */
const CARD =
  "relative block overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--card-shadow)]";

function MainCard({ gym, fav, onToggleFav, now, going, tour, cover }: CardProps) {
  return (
    <Link href={`/gyms/${gym.slug}`} data-tour={tour} className={CARD}>
      <FavHeart fav={fav} onToggle={onToggleFav} place="band" />
      {/*
        This block is where the gym's photo goes. Until there is one it is a
        SOLID BAND OF THE SCHOOL'S COLOUR with the name in white (owner,
        2026-09-27, option 3 of five drawn: "the top from 3"). It replaced a
        wash that took turns down the list through the school's palette
        (`gymCardColors` in lib/themes.ts, no longer read here), which left
        Harvard's list striped pink, white, pink. Every card is now the same
        `--primary` with `--primary-contrast` on it — tokens, so Yale's band is
        blue and Princeton's orange without a line of code (rules 1, 2).
      */}
      {cover ? (
        /*
          THE DAY THE BAND GOES (2026-09-22): a student has added a photo of
          this gym, so the card wears it. The name still has to read on top of
          whatever the picture is, so a veil of the card surface fades down
          from the top — the text sits on the veil, not on the photo.
        */
        <div className="relative flex h-24 items-start overflow-hidden pr-11">
          {/* eslint-disable-next-line @next/next/no-img-element -- user upload, sized here */}
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface)_88%,transparent),color-mix(in_oklab,var(--surface)_35%,transparent))]" />
          <div className="relative p-3">
            <div className="text-[15px] font-medium text-text">{gym.name}</div>
            <div className="text-[11px] text-text-2">{gym.address}</div>
          </div>
        </div>
      ) : (
        <div className="flex h-[68px] items-center bg-primary px-3.5 pr-11">
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold text-primary-contrast">{gym.name}</div>
            <div className="truncate text-[12px] text-primary-contrast/75">{gym.address}</div>
          </div>
        </div>
      )}
      <StatsRow gym={gym} now={now} going={going} />
    </Link>
  );
}

/*
  A house gym is one compact ROW (owner, 2026-09-27: "the list from 4 for the
  house teams"): the house's crest on a square tinted in its own colour, the
  name, when it is open, the heart, the chevron. Each house keeps its own card
  with a gap between (the spacing of option 3), and the house's two colours
  run along the top, half and half — the same split the logo makes.
  House colours are per-entity CONTENT from lib/gyms.ts, applied inline
  (rule 1's data exception).
*/
function HouseCard({ gym, fav, onToggleFav, now, going }: CardProps) {
  const colors = gym.houseColors;
  return (
    <Link href={`/gyms/${gym.slug}`} className={CARD}>
      {colors ? (
        <div className="flex h-1.5">
          <span className="flex-1" style={{ background: colors.primary }} />
          <span className="flex-1" style={{ background: colors.secondary }} />
        </div>
      ) : (
        <div className="h-1.5 bg-accent" />
      )}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <span
          className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-surface-2"
          style={
            colors
              ? { background: `color-mix(in oklab, ${colors.primary} 14%, var(--surface))` }
              : undefined
          }
        >
          {colors ? (
            <HouseSigil primary={colors.primary} secondary={colors.secondary} size={30} />
          ) : null}
        </span>
        {/* Just the name — no "House gym" / "Dorm gym" under it; the section
            heading above the cards already says what they are. */}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold text-text">{gym.name}</div>
          <div className="mt-0.5 text-xs text-muted">
            <OpenNow hours={gym.hours} now={now} size={12} />
          </div>
          {going ? (
            <div className="mt-0.5">
              <GoingLine going={going} gymName={gym.name} compact />
            </div>
          ) : null}
        </div>
        <FavHeart fav={fav} onToggle={onToggleFav} place="row" />
        <span className="flex-shrink-0 text-muted">
          <IconChevronRight size={16} />
        </span>
      </div>
    </Link>
  );
}

export default function GymsPage() {
  const { userId, universityKey } = useAppState();
  const { isFavorite, toggle } = useFavorites(userId);
  // The school's photos of its gyms (db/gym_photos.sql) — the newest one
  // becomes the card's picture in place of the colour band.
  const { coverFor } = useGymPhotos(userId);
  // The Buddy Board by gym — "3 going tonight" on the card people choose from.
  const { goingFor } = useBoardByGym(userId);
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
            className="w-full min-w-0 bg-transparent text-base text-text placeholder:text-muted focus:outline-none"
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
            tour={idx === 0 ? "gyms-first-card" : undefined}
            cover={coverFor(g.slug)?.url ?? null}
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
          />
        ))}

        {nothing && (
          <div className="py-16 text-center text-sm text-muted lg:col-span-full">
            {filter === "fav" && q === ""
              ? "No favourites yet. Tap the heart on a gym to save it here."
              : `No gyms match “${query}”.`}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { gyms, type Gym, type GalleryIcon } from "@/lib/gyms";
import { useAppState } from "@/components/AppState";
import { useFavorites, useGymStats, type GymCrowd } from "@/lib/gymSocial";
import { RatingValue, CrowdChip } from "@/components/gyms/RateCrowd";
import {
  IconSearch,
  IconClock,
  IconFloors,
  IconHeart,
  IconChevronRight,
  IconBarbell,
  IconRun,
  IconSwimming,
  IconBasketball,
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
      className={`tap44 press-icon absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/55 backdrop-blur ${
        fav ? "text-primary-live" : "text-text-2"
      }`}
    >
      <span key={taps} className={taps > 0 && fav ? "react-pop block" : "block"}>
        <IconHeart size={15} filled={fav} />
      </span>
    </button>
  );
}

function StatsRow({ gym, crowd }: { gym: Gym; crowd: GymCrowd | null }) {
  return (
    <div className="flex items-center justify-between gap-2 bg-surface px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1">
          <IconClock size={13} /> {gym.hours}
        </span>
        {/* The gym's rating + how many rated it (hidden if nobody has) */}
        <RatingValue value={gym.rating} count={gym.ratingCount} />
        {/* Live crowd ("how busy right now") — hidden when there's no fresh report */}
        <CrowdChip crowd={crowd} />
        <span className="flex items-center gap-1">
          <IconFloors size={13} /> {gym.floors} {gym.floors === 1 ? "floor" : "floors"}
        </span>
      </div>
      <span className="flex-shrink-0 text-muted">
        <IconChevronRight size={16} />
      </span>
    </div>
  );
}

type CardProps = {
  gym: Gym;
  fav: boolean;
  onToggleFav: () => void;
  crowd: GymCrowd | null;
};

/*
  The gym's own activity icon, ghosted into the empty photo slot. Which icon it
  is comes from the gym's DATA (its gallery), never from this component.
*/
const watermarks: Record<GalleryIcon, (p: { size?: number }) => React.ReactNode> = {
  barbell: IconBarbell,
  run: IconRun,
  swimming: IconSwimming,
  basketball: IconBasketball,
};

function Watermark({ gym }: { gym: Gym }) {
  const kind = gym.gallery[0]?.icon;
  if (!kind) return null;
  const Icon = watermarks[kind];
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -right-3 -top-2 text-text/[0.06]"
    >
      <Icon size={92} />
    </span>
  );
}

function MainCard({ gym, fav, onToggleFav, crowd }: CardProps) {
  return (
    <Link
      href={`/gyms/${gym.slug}`}
      className="relative block overflow-hidden rounded-2xl border border-border"
    >
      <FavHeart fav={fav} onToggle={onToggleFav} />
      {/*
        This block is where the gym's photo goes. Until there is one it used to
        be filled with a crimson wash, which put a big brand-coloured field
        directly above the crimson button — so crimson stopped meaning "tap me".
        It's now a neutral surface with the gym's own activity icon watermarked
        into it, the same treatment the photo gallery on the gym page uses, so
        an empty slot reads as "photo coming" rather than as a void.
      */}
      <div className="relative flex h-24 items-end overflow-hidden bg-gradient-to-br from-surface-2 to-background">
        <Watermark gym={gym} />
        <span className="absolute left-2.5 top-2 rounded-lg bg-background/60 px-2 py-0.5 text-[11px] tracking-wider text-text-2">
          MAIN GYM
        </span>
        <div className="relative p-3">
          <div className="text-[15px] font-medium text-text">{gym.name}</div>
          <div className="text-[11px] text-text-2">{gym.address}</div>
        </div>
      </div>
      <StatsRow gym={gym} crowd={crowd} />
    </Link>
  );
}

function HouseCard({ gym, fav, onToggleFav, crowd }: CardProps) {
  const colors = gym.houseColors;
  return (
    <Link
      href={`/gyms/${gym.slug}`}
      className="relative block overflow-hidden rounded-2xl border border-border"
    >
      <FavHeart fav={fav} onToggle={onToggleFav} />
      <div className="relative flex h-[75px] items-center gap-2.5 bg-surface-2 px-3 pr-11">
        <span
          className="absolute inset-x-0 top-0 h-[3px]"
          style={
            colors
              ? { background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})` }
              : { background: "var(--accent)" }
          }
        />
        {colors ? (
          <HouseSigil primary={colors.primary} secondary={colors.secondary} size={28} />
        ) : null}
        <div>
          <div className="text-sm font-medium text-text">{gym.name}</div>
          {/* 9px muted was too faint to read in light mode; 10px + a stronger
              colour, still clearly secondary to the gym name. */}
          <div className="text-[11px] text-text-2">House gym</div>
        </div>
      </div>
      <StatsRow gym={gym} crowd={crowd} />
    </Link>
  );
}

export default function GymsPage() {
  const { userId } = useAppState();
  const { isFavorite, toggle } = useFavorites(userId);
  const { getCrowd } = useGymStats(userId);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

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

  const visibleMain = showMain ? mainGyms : [];
  const visibleHouse = showHouse ? houseGyms : [];
  const nothing = visibleMain.length === 0 && visibleHouse.length === 0;
  // House gyms get their own section header in the mixed views.
  const showHouseHeader = (filter === "all" || filter === "fav") && visibleHouse.length > 0;

  return (
    /*
      Phone: the usual 640px column. Laptop: the column widens and the cards
      below lay out in a grid, so a big screen shows the whole gym list at once
      instead of one narrow strip in the middle of the page.
    */
    <div className="mx-auto w-full max-w-screen-sm lg:max-w-5xl lg:px-4 lg:pt-3">
      {/* The route's title. Hidden on phones, where the design has no header
          bar; on a laptop there's room for a real one. Either way screen
          readers and the document outline get their heading. */}
      <h1 className="sr-only px-3 text-lg font-semibold text-text lg:not-sr-only lg:mb-1 lg:block">
        Gyms
      </h1>

      {/* Search bar — filters the list as you type */}
      <div className="px-3 pt-3">
        {/* A search field stretched across a whole laptop screen looks broken,
            so it keeps a sane width once there's room. */}
        <div className="flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-2 text-muted focus-within:border-primary lg:max-w-md">
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
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-3.5 py-1.5 text-[11px] font-medium transition-colors ${
                  active
                    ? "bg-text text-background"
                    : "border border-border bg-surface-2 text-muted"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards — one column on a phone, two or three across on a laptop. */}
      <div className="grid grid-cols-1 items-start gap-2.5 px-3 pb-4 lg:grid-cols-2 xl:grid-cols-3">
        {visibleMain.map((g) => (
          <MainCard
            key={g.slug}
            gym={g}
            fav={isFavorite(g.slug)}
            onToggleFav={() => toggle(g.slug)}
            crowd={getCrowd(g.slug)}
          />
        ))}

        {showHouseHeader && (
          // Section headings break the grid rather than sitting in a cell.
          <div className="pb-0.5 pt-1 lg:col-span-full lg:pt-3">
            <h2 className="text-[11px] font-medium tracking-[0.1em] text-muted">HOUSE GYMS</h2>
          </div>
        )}

        {visibleHouse.map((g) => (
          <HouseCard
            key={g.slug}
            gym={g}
            fav={isFavorite(g.slug)}
            onToggleFav={() => toggle(g.slug)}
            crowd={getCrowd(g.slug)}
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

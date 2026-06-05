"use client";

import { useState } from "react";
import Link from "next/link";
import { gyms, type Gym } from "@/lib/gyms";
import { useAppState } from "@/components/AppState";
import { useFavorites } from "@/lib/gymSocial";
import {
  IconSearch,
  IconClock,
  IconStar,
  IconFloors,
  IconHeart,
  HouseSigil,
} from "@/components/icons";

type Filter = "all" | "fav" | "main" | "house";

const filters: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "fav", label: "Favourites" },
  { key: "main", label: "Main" },
  { key: "house", label: "House" },
];

// Heart toggle that sits on a gym card without triggering the card's link.
function FavHeart({ fav, onToggle }: { fav: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      aria-label={fav ? "Remove from favourites" : "Add to favourites"}
      aria-pressed={fav}
      className={`absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/55 backdrop-blur ${
        fav ? "text-primary" : "text-text/70"
      }`}
    >
      <IconHeart size={15} filled={fav} />
    </button>
  );
}

function StatsRow({ gym }: { gym: Gym }) {
  return (
    <div className="flex items-center justify-between bg-surface px-3 py-2.5">
      <div className="flex items-center gap-3.5 text-xs text-muted">
        <span className="flex items-center gap-1">
          <IconClock size={13} /> {gym.hours}
        </span>
        <span className="flex items-center gap-1">
          <IconStar size={13} className="text-accent" /> {gym.rating}
        </span>
        <span className="flex items-center gap-1">
          <IconFloors size={13} /> {gym.floors} {gym.floors === 1 ? "floor" : "floors"}
        </span>
      </div>
      <span className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-contrast">
        View
      </span>
    </div>
  );
}

function MainCard({ gym, fav, onToggleFav }: { gym: Gym; fav: boolean; onToggleFav: () => void }) {
  return (
    <Link
      href={`/gyms/${gym.slug}`}
      className="relative block overflow-hidden rounded-2xl border border-border"
    >
      <FavHeart fav={fav} onToggle={onToggleFav} />
      <div className="relative flex h-24 items-end bg-gradient-to-br from-primary/30 to-surface-2">
        <span className="absolute left-2.5 top-2 rounded-lg bg-background/60 px-2 py-0.5 text-[9px] tracking-wider text-text/70">
          MAIN GYM
        </span>
        <div className="p-3">
          <div className="text-[15px] font-medium text-text">{gym.name}</div>
          <div className="text-[10px] text-muted">{gym.address}</div>
        </div>
      </div>
      <StatsRow gym={gym} />
    </Link>
  );
}

function HouseCard({ gym, fav, onToggleFav }: { gym: Gym; fav: boolean; onToggleFav: () => void }) {
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
          <div className="text-[9px] text-muted">House gym</div>
        </div>
      </div>
      <StatsRow gym={gym} />
    </Link>
  );
}

export default function GymsPage() {
  const { userId } = useAppState();
  const { isFavorite, toggle } = useFavorites(userId);
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
    <div className="mx-auto w-full max-w-screen-sm">
      {/* Search bar — filters the list as you type */}
      <div className="px-3 pt-3">
        <div className="flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-2 text-muted focus-within:border-primary">
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
        <div className="flex gap-1.5">
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-3.5 py-1.5 text-[11px] font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-contrast"
                    : "border border-border bg-surface-2 text-muted"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2.5 px-3 pb-4">
        {visibleMain.map((g) => (
          <MainCard
            key={g.slug}
            gym={g}
            fav={isFavorite(g.slug)}
            onToggleFav={() => toggle(g.slug)}
          />
        ))}

        {showHouseHeader && (
          <div className="pb-0.5 pt-1">
            <div className="text-[10px] font-medium tracking-[0.1em] text-muted">
              HOUSE GYMS
            </div>
          </div>
        )}

        {visibleHouse.map((g) => (
          <HouseCard
            key={g.slug}
            gym={g}
            fav={isFavorite(g.slug)}
            onToggleFav={() => toggle(g.slug)}
          />
        ))}

        {nothing && (
          <div className="py-16 text-center text-sm text-muted">
            {filter === "fav" && q === ""
              ? "No favourites yet. Tap the heart on a gym to save it here."
              : `No gyms match “${query}”.`}
          </div>
        )}
      </div>
    </div>
  );
}

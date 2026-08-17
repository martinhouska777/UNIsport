"use client";

/*
  The one-line leaderboard strip on the Profile tab.
  ---------------------------------------------------------------------------
  Deliberately about a centimetre tall. It sits above the session calendar and
  is the ONLY leaderboard surface on the profile: three numbers — where you sit
  among your housemates, where your house sits, and where you sit on campus —
  and a chevron into the full boards.

  It never shows a row of dashes. Before you've logged anything for the period
  there is no rank to report, so it becomes a single invitation instead; and it
  holds its own height while loading so the calendar underneath doesn't jump.

  All color comes from theme tokens (rule 1). The one exception is the tint on
  the house cell, which is that house's identity color from lib/gyms.ts — DATA,
  applied via inline style, exactly as the gym and lineup screens do it.
*/
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppState } from "@/components/AppState";
import { IconTrophy, IconChevronRight } from "@/components/icons";
import {
  fetchStanding,
  houseColor,
  type Period,
  type Standing,
} from "@/lib/leaderboards";
import { residenceLabel } from "@/lib/onboarding";

const ordinal = (n: number): string => {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
};

function Cell({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 flex-1 text-center">
      <div className="truncate text-[13px] font-semibold leading-none text-text">{value}</div>
      <div className="mt-1 truncate text-[8px] uppercase tracking-[0.08em] text-muted">{label}</div>
    </div>
  );
}

export default function LeaderboardStrip({ period = "month" }: { period?: Period }) {
  const { userId } = useAppState();
  const [standing, setStanding] = useState<Standing | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetchStanding(period)
      .then((s) => {
        if (!active) return;
        setStanding(s);
        setLoaded(true);
      })
      .catch(() => active && setLoaded(true));
    return () => {
      active = false;
    };
  }, [period, userId]);

  // Same height either way, so nothing below moves when the numbers land.
  if (!loaded) return <div className="h-[53px] border-b border-border" />;

  const house = standing?.residence ?? null;
  const tint = houseColor(house);
  const ranked = !!standing && standing.campusRank !== null;

  return (
    <Link
      href="/leaderboards"
      className="flex items-center gap-2 border-b border-border px-3.5 py-2.5 active:bg-surface-2"
    >
      <span
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-primary"
        style={tint ? { background: `${tint}22`, color: tint } : undefined}
        // No tint for a Yard dorm (only the 12 Houses carry identity colors),
        // in which case it falls back to the theme's primary.
      >
        <IconTrophy size={15} />
      </span>

      {ranked && standing ? (
        <div className="flex min-w-0 flex-1 items-center">
          <Cell
            value={standing.houseRankIn ? ordinal(standing.houseRankIn) : "—"}
            label={house ? `in ${house}` : "in house"}
          />
          <div className="h-6 w-px bg-border" />
          <Cell
            value={standing.houseRank ? `#${standing.houseRank}` : "—"}
            label={house ? residenceLabel(house) : "your house"}
          />
          <div className="h-6 w-px bg-border" />
          <Cell value={`#${standing.campusRank}`} label="on campus" />
        </div>
      ) : (
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium leading-tight text-text">Leaderboards</div>
          <div className="mt-0.5 truncate text-[11px] text-muted">
            Log a session to take your place{house ? ` for ${residenceLabel(house)}` : ""}.
          </div>
        </div>
      )}

      <span className="flex-shrink-0 text-muted">
        <IconChevronRight size={16} />
      </span>
    </Link>
  );
}

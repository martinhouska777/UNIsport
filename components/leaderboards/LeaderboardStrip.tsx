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
  type Period,
  type Standing,
} from "@/lib/leaderboards";
import { residenceLabel } from "@/lib/onboarding";
import { teamFor } from "@/lib/cohorts";

const ordinal = (n: number): string => {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
};

function Cell({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 flex-1 text-center">
      <div className="truncate text-[15px] font-semibold leading-none text-text">{value}</div>
      <div className="mt-1 truncate text-[9px] uppercase tracking-[0.08em] text-muted">{label}</div>
    </div>
  );
}

export default function LeaderboardStrip({ period = "month" }: { period?: Period }) {
  const { userId, universityKey } = useAppState();
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
  if (!loaded) return <div className="h-[66px] border-b border-border" />;

  const house = standing?.residence ?? null;
  // Your TEAM's colour: the house, or the first-year cohort's (lib/cohorts.ts)
  // — a first-year in a Yard dorm is never the theme's fallback grey.
  const team = teamFor(universityKey, house, standing?.classYear);
  const ranked = !!standing && standing.campusRank !== null;

  return (
    <Link
      href="/leaderboards"
      /* data-tour: the Profile tour lights this once the ranks have loaded —
         it is deliberately NOT on the placeholder above, so the tour waits for
         real numbers rather than pointing at an empty bar (lib/tour.ts). */
      data-tour="profile-leaderboards"
      className="flex items-center gap-2.5 border-b border-border px-3.5 py-3.5 active:bg-surface-2"
    >
      {/* GOLD. A trophy is gold everywhere else in the world and everywhere
          else in this app (the podium colours, the varsity mark) — it is the
          school's accent token, so a school whose accent isn't gold still gets
          its own colour rather than a hardcoded one (rule 1). */}
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent-tint text-accent">
        <IconTrophy size={19} />
      </span>

      {ranked && standing ? (
        <div className="flex min-w-0 flex-1 items-center">
          {/* Never a dash: with every group on the boards (lib/leaderboards.ts)
              a rank exists the moment you've logged, and a group with a name
              says the name. */}
          <Cell
            value={standing.houseRankIn ? ordinal(standing.houseRankIn) : `#${standing.campusRank}`}
            label={house ? `in ${house}` : team ? `in ${team.label}` : "on campus"}
          />
          <div className="h-6 w-px bg-border" />
          <Cell
            value={standing.houseRank ? `#${standing.houseRank}` : team ? team.label : "—"}
            label={house ? residenceLabel(house) : team ? "your team" : "your house"}
          />
          <div className="h-6 w-px bg-border" />
          <Cell value={`#${standing.campusRank}`} label="on campus" />
        </div>
      ) : (
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold leading-tight text-text">Leaderboards</div>
          <div className="mt-0.5 truncate text-[11px] text-muted">
            Log a session to take your place{team ? ` for ${team.label}` : ""}.
          </div>
        </div>
      )}

      <span className="flex-shrink-0 text-muted">
        <IconChevronRight size={16} />
      </span>
    </Link>
  );
}

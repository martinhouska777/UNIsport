"use client";

/*
  THE PROFILE'S WINTER POINTS ROW (owner, 2026-11-08), under Team, the same
  card as it. It is only there while the event runs (and the week after, for
  the results). A trophy, and your team's colour with its place this week,
  the same week the standings open on.
*/
import Link from "next/link";
import { IconChevronRight, IconTrophy } from "@/components/icons";
import { useAppState } from "@/components/AppState";
import { useMembership } from "@/components/varsity/useMembership";
import { useWinterConfig, useWinterStandings } from "@/components/varsity/winter/useWinter";
import { Dot } from "@/components/varsity/winter/WinterDayCard";
import { isoToday, isRunning, ordinal, teamOf, teamValue } from "@/lib/varsity/winterPoints";

export default function WinterPointsRow() {
  const { userId } = useAppState();
  const { membership } = useMembership();
  const teamId = membership ? membership.teamId : undefined;
  const { config } = useWinterConfig(teamId);
  const running = isRunning(config, isoToday());
  const myTeam = running && userId ? teamOf(config, userId) : undefined;
  // The team's sessions are read only when there is a place to show.
  const st = useWinterStandings(teamId, userId, myTeam ? config : null);
  if (!running) return null;

  let place = 0;
  if (myTeam && st.ready && st.cur) {
    const order = config.teams
      .map((t) => ({ t, v: teamValue(config, st.scores, t, st.cur, st.cur) }))
      .sort((a, b) => b.v - a.v);
    place = order.findIndex((x) => x.t.id === myTeam.id) + 1;
  }

  return (
    <Link
      href="/varsity/profile/winter-points"
      className="mx-3.5 mt-2.5 flex w-[calc(100%-1.75rem)] items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] border border-primary-line bg-primary-tint text-primary">
        <IconTrophy size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-text">{config.name}</div>
      </div>
      {myTeam && place > 0 && (
        <span className="flex flex-shrink-0 items-center gap-1.5 text-[13px] font-semibold text-text">
          <Dot color={myTeam.color} />
          {ordinal(place)}
        </span>
      )}
      <span className="text-muted">
        <IconChevronRight size={17} />
      </span>
    </Link>
  );
}

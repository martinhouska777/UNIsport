"use client";

/*
  A DAY'S WINTER POINTS, under the sessions in the Calendar's day sheet (owner,
  2026-11-08: the points come from logging and the calendar). Your own days
  only, inside the event, when you are on one of its teams. The day is scored
  with its week, because the weekly limits (3 weights, 2 hard workouts, the
  first 150 min at 1:1) depend on the days before it.
*/
import { useEffect, useState } from "react";
import { useAppState } from "@/components/AppState";
import { useMembership } from "@/components/varsity/useMembership";
import { useWinterConfig } from "@/components/varsity/winter/useWinter";
import WinterDayCard from "@/components/varsity/winter/WinterDayCard";
import { fetchLogsInRange } from "@/lib/varsity/logStore";
import { logToWp } from "@/lib/varsity/winterPointsStore";
import {
  addDays,
  fmtPoints,
  inEvent,
  isoToday,
  isRunning,
  scoreWeek,
  teamOf,
  weekOf,
  weekStart,
  type DayScore,
} from "@/lib/varsity/winterPoints";

export default function WinterPointsDay({ iso }: { iso: string }) {
  const { userId } = useAppState();
  const { membership } = useMembership();
  const { config } = useWinterConfig(membership ? membership.teamId : undefined);
  const today = isoToday();
  const live = isRunning(config, today) && inEvent(config, iso, today) && !!userId && !!teamOf(config, userId);
  const [day, setDay] = useState<{ iso: string; score: DayScore | null } | null>(null);

  useEffect(() => {
    if (!live || !config || !userId) return;
    let active = true;
    const w = weekOf(config, iso);
    const ws = weekStart(config, w);
    let we = addDays(ws, 6);
    if (we > config.end) we = config.end;
    if (we > today) we = today;
    fetchLogsInRange(userId, ws, we).then((logs) => {
      if (!active) return;
      const week = scoreWeek(config, userId, logs.map(logToWp), w, today);
      setDay({ iso, score: week.days.find((d) => d.date === iso) ?? null });
    });
    return () => {
      active = false;
    };
  }, [live, config, userId, iso, today]);

  const score = day?.iso === iso ? day.score : null;
  if (!live || !config || !score || score.sessions.length === 0) return null;
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between px-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{config.name}</span>
        <span className="text-[15px] font-bold tabular-nums text-text">{fmtPoints(score.total)}</span>
      </div>
      <WinterDayCard day={score} head={false} />
    </div>
  );
}

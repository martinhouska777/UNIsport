"use client";

/*
  STREAK & POINTS (Slice D) — both rise ONLY from VERIFIED sessions (a chat-
  planned session both people confirmed happened). Streak is the current
  consecutive-day run (one per day); points are total verified-session days.
  Always shown once loaded — at zero it teaches the loop. Colors are theme
  tokens (rule 1); the flame is content (an emoji), not a hardcoded color.
*/
import { useEffect, useState } from "react";
import { listVerifiedDays, streakStats } from "@/lib/supabase/workouts";

export default function StreakCard({ userId }: { userId: string | null }) {
  const [stats, setStats] = useState<{ points: number; streak: number } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    listVerifiedDays(userId)
      .then((days) => active && setStats(streakStats(days)))
      .catch(() => active && setStats({ points: 0, streak: 0 }));
    return () => {
      active = false;
    };
  }, [userId]);

  if (!stats) return null;

  return (
    <div className="border-b border-border px-3.5 py-3">
      <div className="flex items-stretch gap-2.5">
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 py-3">
          <div className="text-[20px] font-semibold text-primary">🔥 {stats.streak}</div>
          <div className="mt-0.5 text-[9px] uppercase tracking-[0.08em] text-muted">
            day streak
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-border bg-surface-2 py-3">
          <div className="text-[20px] font-semibold text-text">{stats.points}</div>
          <div className="mt-0.5 text-[9px] uppercase tracking-[0.08em] text-muted">points</div>
        </div>
      </div>
      {stats.points === 0 && (
        <div className="mt-2 text-center text-[11px] text-muted">
          Plan a session in chat and both confirm it to start your streak.
        </div>
      )}
    </div>
  );
}

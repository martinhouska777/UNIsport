"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { memoryStats, type MemoryStats } from "@/lib/supabase/workouts";
import { shortDate } from "@/lib/memories";
import { IconCamera, IconChevronRight } from "@/components/icons";

/*
  The way into Memories, on the Profile tab directly under the session calendar —
  the calendar tells you WHICH days, this opens the PHOTOS from them.

  It shows your newest session photo as the thumbnail, so the row itself is a
  glimpse of what's behind it. The count and that one image come from
  my_memory_stats() (db/memories.sql) rather than from downloading every photo
  you've ever taken just to render a row. Colors are theme tokens (rule 1).
*/
export default function MemoriesRow({ userId }: { userId: string | null }) {
  const [stats, setStats] = useState<MemoryStats | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    memoryStats(userId)
      .then((s) => active && setStats(s))
      .catch(() => active && setStats({ count: 0, latestPhoto: null, latestDate: null }));
    return () => {
      active = false;
    };
  }, [userId]);

  // Until the count lands, hold the row's height so the page doesn't jump.
  if (!stats) return <div className="h-[70px] border-b border-border" />;

  const empty = stats.count === 0;

  return (
    <Link
      href="/memories"
      className="flex items-center gap-3 border-b border-border px-3.5 py-3 transition-colors active:bg-surface-2"
    >
      {stats.latestPhoto ? (
        <span className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={stats.latestPhoto} alt="" className="h-full w-full object-cover" />
        </span>
      ) : (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary bg-primary-tint text-primary">
          <IconCamera size={18} />
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium text-text">Memories</span>
        <span className="mt-0.5 block truncate text-[11px] text-muted">
          {empty
            ? "Add a photo to a session and it shows up here"
            : `${stats.count} photo${stats.count === 1 ? "" : "s"}${
                stats.latestDate ? ` · latest ${shortDate(stats.latestDate)}` : ""
              }`}
        </span>
      </span>

      <IconChevronRight size={16} className="shrink-0 text-muted" />
    </Link>
  );
}

"use client";

/*
  The Memories row on the Profile tab — the way into the gallery.
  ---------------------------------------------------------------------------
  It sits directly under the session calendar, because it is the same history
  seen the other way round: the calendar is what you did, this is what it looked
  like. One line, a few of your latest photos, and a chevron into /memories.

  It shows the pictures themselves rather than an icon and a number, because a
  row of your own training photos is the thing that makes you tap it.

  Like the leaderboard strip above it, it never renders an empty shell: with no
  photos yet there is nothing to preview and nothing to open, so the whole row
  stays away until there is. It also holds its height while loading so the rest
  of the profile doesn't jump.

  All colour is theme tokens (rule 1).
*/
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppState } from "@/components/AppState";
import { IconCamera, IconChevronRight } from "@/components/icons";
import { listPhotoLogs, type WorkoutLog } from "@/lib/supabase/workouts";
import { dayLabel, toMemories } from "@/lib/memories";

// Enough to fill the row on the widest phone, and no more — every extra one is
// a full-size photo over the wire (see listPhotoLogs).
const PREVIEW_SESSIONS = 4;
const PREVIEW_TILES = 4;

export default function MemoriesStrip() {
  const { userId } = useAppState();
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!userId) return;
    listPhotoLogs(userId, PREVIEW_SESSIONS).then((rows) => {
      if (!alive) return;
      setLogs(rows);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [userId]);

  // Holds the row's height while the photos are on their way.
  if (!loaded) return <div className="h-[68px] border-b border-border" aria-hidden="true" />;

  const memories = toMemories(logs);
  if (memories.length === 0) return null;

  const tiles = memories.slice(0, PREVIEW_TILES);
  const latest = memories[0];

  return (
    <Link
      href="/memories"
      className="flex items-center gap-3 border-b border-border px-3.5 py-3 active:bg-surface-2"
    >
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary-tint text-primary">
        <IconCamera size={16} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-text">Memories</div>
        <div className="truncate text-[11px] text-muted">
          {[dayLabel(latest.date), latest.trained].filter(Boolean).join(" · ")}
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1">
        {tiles.map((m) => (
          <span
            key={m.id}
            className="h-9 w-9 overflow-hidden rounded-md border border-border bg-surface-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.src} alt="" className="h-full w-full object-cover" />
          </span>
        ))}
      </div>

      <span className="flex-shrink-0 text-muted">
        <IconChevronRight size={16} />
      </span>
    </Link>
  );
}

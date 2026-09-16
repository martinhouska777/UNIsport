"use client";

/*
  The Memories row on the Profile tab — the way into the gallery.
  ---------------------------------------------------------------------------
  It sits directly under the session calendar, because it is the same history
  seen the other way round: the calendar is what you did, this is what it looked
  like. One line, a few of your latest photos, and a chevron into /memories.

  It shows the pictures themselves rather than an icon and a number, because a
  row of your own training photos is the thing that makes you tap it.

  With no photos yet it still shows (name and chevron only), so people know the
  gallery exists. It holds its height while loading so the rest of the profile
  doesn't jump.

  All colour is theme tokens (rule 1).
*/
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppState } from "@/components/AppState";
import { IconChevronRight } from "@/components/icons";
import { listPhotoLogs, type WorkoutLog } from "@/lib/supabase/workouts";
import { toMemories } from "@/lib/memories";

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
  if (!loaded) return <div className="mx-3.5 my-2 h-[66px] rounded-2xl border border-border bg-surface" aria-hidden="true" />;

  // The row is ALWAYS there now, photos or not (owner, 2026-09-16: the tab
  // vanishing looked like a missing feature). With none yet it is just the
  // name and the chevron, and /memories says how to add the first.
  const memories = toMemories(logs);

  const tiles = memories.slice(0, PREVIEW_TILES);

  return (
    <Link
      href="/memories"
      className="mx-3.5 my-2 flex items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3 active:bg-surface-2"
    >
      {/* The camera sticker (public/camera.webp — the owner's download, made
          black) on a square of the school colour, the pair of the trophy on
          the Leaderboards bar (owner, 2026-09-16). */}
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/camera.webp" alt="" className="w-[30px]" draggable={false} />
      </span>

      <div className="min-w-0 flex-1">
        {/* Its name only. The grey line under it (the latest day and what
            was trained) was cut on 2026-09-13 at the owner's ask; the day,
            the gym and the partner are inside. The name went up from 13px to
            15px the same day, to use the room the grey line left. */}
        <div className="text-[15px] font-semibold text-text">Memories</div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1">
        {tiles.map((m) => (
          <span
            key={m.id}
            className="h-9 w-9 overflow-hidden rounded-md border border-border bg-surface"
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

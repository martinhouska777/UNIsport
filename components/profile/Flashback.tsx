"use client";

/*
  FLASHBACK — a memory from this day, earlier, at the top of Memories.
  ---------------------------------------------------------------------------
  Owner, 2026-09-15: "Flashback from September 10, gym with somebody", like
  Snapchat's. The same date in an earlier year first; until there is a year of
  photos, the same date in an earlier month (lib/memories.ts, flashbackDates).
  One session, its photos swiped like every other session on the screen, and a
  tap opens them full screen.

  With nothing on any of those dates there is no card at all — an empty
  Flashback is not a memory. Colours are theme tokens.
*/
import { useEffect, useState } from "react";
import { IconCamera } from "@/components/icons";
import PhotoSwipe from "@/components/profile/PhotoSwipe";
import { listPhotoLogsOn } from "@/lib/supabase/workouts";
import { flashbackDates, flashbackLabel, toMemories, type Memory } from "@/lib/memories";

export default function Flashback({
  userId,
  onOpen,
}: {
  userId: string | null;
  /** Opens the viewer on these photos, at this one. */
  onOpen: (memories: Memory[], index: number) => void;
}) {
  const [memories, setMemories] = useState<Memory[]>([]);

  useEffect(() => {
    let alive = true;
    if (!userId) return;
    const { years, months } = flashbackDates();
    (async () => {
      let logs = await listPhotoLogsOn(userId, years);
      if (logs.length === 0) logs = await listPhotoLogsOn(userId, months);
      if (alive) setMemories(toMemories(logs));
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, [userId]);

  const first = memories[0];
  if (!first) return null;

  const what = `${first.activity}${first.partner ? ` with ${first.partner}` : ""}`;
  const more = [first.detail, first.gym].filter(Boolean).join(" · ");

  return (
    <section className="mx-3.5 mt-3 rounded-2xl border border-primary/30 bg-primary-tint p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-contrast">
          <IconCamera size={14} />
        </span>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Flashback</div>
          <div className="truncate text-[13px] font-semibold text-text">
            From {flashbackLabel(first.date)}
          </div>
        </div>
      </div>
      <PhotoSwipe
        photos={memories}
        label={`Flashback from ${flashbackLabel(first.date)}`}
        onOpen={(i) => onOpen(memories, i)}
      />
      <div className="mt-2 text-[14px] font-semibold text-text">{what}</div>
      {more && <div className="text-[12px] text-text-2">{more}</div>}
    </section>
  );
}

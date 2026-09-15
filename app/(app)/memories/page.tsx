"use client";

/*
  MEMORIES — every photo you've taken at training, by day.
  ---------------------------------------------------------------------------
  Reached from the Memories row on the Profile tab, under the calendar. The
  calendar answers "what did I do this month"; this screen answers "what did it
  look like" — the same sessions, as pictures.

  ONE CARD PER DAY, EACH SESSION INSIDE IT (owner, 2026-09-15). A session is
  its photos on top — swiped sideways, one at a time, dots underneath — then
  what it was ("Gym"), then what was trained ("Chest"), then where and who
  with. A second session that day sits under the first in the same card, so a
  photo is never separated from the session it came from. Tapping a photo
  opens the viewer, which browses the whole gallery.

  At the top, a FLASHBACK: a session from this date in an earlier year, or an
  earlier month (components/profile/Flashback.tsx).

  Nothing here is new data. These are the photos already attached to logged
  sessions (db/workout_logs.sql). Colours are theme tokens (rule 1).
*/
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import Button from "@/components/ui/Button";
import { IconArrowLeft, IconCamera, IconMapPin, IconUser } from "@/components/icons";
import Flashback from "@/components/profile/Flashback";
import MemoryViewer from "@/components/profile/MemoryViewer";
import PhotoSwipe from "@/components/profile/PhotoSwipe";
import { listPhotoLogs, PHOTO_PAGE, type WorkoutLog } from "@/lib/supabase/workouts";
import { groupByDay, toMemories, type Memory } from "@/lib/memories";

export default function MemoriesPage() {
  const router = useRouter();
  const { userId } = useAppState();
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [more, setMore] = useState(false); // another page might exist
  const [loadingMore, setLoadingMore] = useState(false);
  // Which photos the viewer walks through — the gallery, or a Flashback — and
  // where in them it is.
  const [open, setOpen] = useState<{ list: Memory[]; index: number } | null>(null);

  useEffect(() => {
    let alive = true;
    if (!userId) return;
    listPhotoLogs(userId).then((rows) => {
      if (!alive) return;
      setLogs(rows);
      setMore(rows.length === PHOTO_PAGE);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [userId]);

  // Photos are heavy (see listPhotoLogs), so older sessions are fetched only
  // when asked for.
  const loadMore = async () => {
    if (!userId || loadingMore) return;
    setLoadingMore(true);
    const rows = await listPhotoLogs(userId, PHOTO_PAGE, logs.length);
    setLogs((prev) => [...prev, ...rows]);
    setMore(rows.length === PHOTO_PAGE);
    setLoadingMore(false);
  };

  // One flat, newest-first list drives the viewer; the same list grouped by day
  // and session draws the screen.
  const memories = useMemo(() => toMemories(logs), [logs]);
  const days = useMemo(() => groupByDay(memories), [memories]);

  return (
    <div className="mx-auto w-full max-w-screen-sm pb-10">
      {/* Back bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-3 py-3">
        <button type="button" aria-label="Back" onClick={() => router.back()} className="text-muted">
          <IconArrowLeft size={18} />
        </button>
        <span className="text-sm font-medium text-text">Memories</span>
        <span className="w-[18px]" aria-hidden="true" />
      </div>

      <Flashback userId={userId} onOpen={(list, index) => setOpen({ list, index })} />

      {!loaded && (
        <div className="mx-3.5 mt-3 rounded-2xl border border-border bg-surface p-3">
          <div className="mb-2 h-3 w-28 rounded bg-surface-2" />
          <div className="aspect-square w-full rounded-xl bg-surface-2" />
        </div>
      )}

      {loaded && memories.length === 0 && (
        <div className="px-3.5 py-14 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-muted">
            <IconCamera size={20} />
          </span>
          <div className="mt-3 text-sm font-medium text-text">No memories yet</div>
          <p className="mx-auto mt-1.5 max-w-[16rem] text-[13px] leading-relaxed text-muted">
            Add a photo when you log a session and it shows up here, with where you
            were and what you trained.
          </p>
        </div>
      )}

      {loaded &&
        days.map((day) => (
          <section key={day.date} className="mx-3.5 mt-3 rounded-2xl border border-border bg-surface p-3">
            <div className="mb-2 text-[13px] font-semibold text-text">{day.label}</div>

            {day.sessions.map((s, i) => (
              <div key={s.logId} className={i > 0 ? "mt-3 border-t border-border pt-3" : ""}>
                <PhotoSwipe
                  photos={s.memories}
                  label={`${s.activity} on ${day.label}`}
                  onOpen={(k) => setOpen({ list: memories, index: memories.indexOf(s.memories[k]) })}
                />
                <div className="mt-2 text-[14px] font-semibold text-text">{s.activity}</div>
                {s.detail && <div className="text-[12px] text-text-2">{s.detail}</div>}
                {(s.gym || s.partner) && (
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-muted">
                    {s.gym && (
                      <span className="flex items-center gap-1">
                        <IconMapPin size={12} />
                        {s.gym}
                      </span>
                    )}
                    {s.partner && (
                      <span className="flex items-center gap-1">
                        <IconUser size={12} />
                        with {s.partner}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </section>
        ))}

      {loaded && more && (
        <div className="px-3.5 pt-5">
          <Button variant="secondary" size="md" onClick={loadMore} className="w-full">
            {loadingMore ? "Loading…" : "Load older"}
          </Button>
        </div>
      )}

      {open !== null && (
        <MemoryViewer
          memories={open.list}
          index={open.index}
          onIndex={(index) => setOpen((o) => (o ? { ...o, index } : o))}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

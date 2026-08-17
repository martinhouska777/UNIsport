"use client";

/*
  MEMORIES — every photo you've taken at training, by day.
  ---------------------------------------------------------------------------
  Reached from the Memories row on the Profile tab, under the calendar. The
  calendar answers "what did I do this month"; this screen answers "what did it
  look like" — the same sessions, as pictures.

  Days run newest first, each headed by its name and what you trained that day.
  Tapping any tile opens the viewer, which then browses the whole gallery rather
  than just that session.

  Nothing here is new data. These are the photos already attached to logged
  sessions (db/workout_logs.sql), which until now could only be seen one session
  at a time. Colours are theme tokens (rule 1).
*/
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import Button from "@/components/ui/Button";
import { IconArrowLeft, IconCamera } from "@/components/icons";
import MemoryViewer from "@/components/profile/MemoryViewer";
import { listPhotoLogs, PHOTO_PAGE, type WorkoutLog } from "@/lib/supabase/workouts";
import { groupByDay, toMemories } from "@/lib/memories";

export default function MemoriesPage() {
  const router = useRouter();
  const { userId } = useAppState();
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [more, setMore] = useState(false); // another page might exist
  const [loadingMore, setLoadingMore] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

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
  // draws the screen. Building both from one array keeps a tile's position in
  // the gallery and its position in the viewer identical.
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

      {!loaded && (
        <div className="px-3.5 py-4">
          <div className="mb-2 h-3 w-28 rounded bg-surface-2" />
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-md bg-surface-2" />
            ))}
          </div>
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
          <section key={day.date} className="px-3.5 pt-4">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-text">{day.label}</div>
                {day.trained && (
                  <div className="truncate text-[11px] text-muted">{day.trained}</div>
                )}
              </div>
              <span className="shrink-0 text-[11px] text-muted">
                {day.memories.length} {day.memories.length === 1 ? "photo" : "photos"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1">
              {day.memories.map((m) => {
                const flatIndex = memories.indexOf(m);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setOpen(flatIndex)}
                    aria-label={`${m.trained || "Session"} on ${day.label}`}
                    className="press relative aspect-square overflow-hidden rounded-md border border-border bg-surface-2"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.src} alt="" className="h-full w-full object-cover" />
                    {/* Who you were with — the one thing worth seeing before you
                        open it. Initials, so the tile stays a photo. */}
                    {m.partner && (
                      <span className="absolute bottom-1 left-1 rounded-full bg-background/80 px-1.5 py-0.5 text-[9px] font-semibold text-text">
                        {m.partner
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((w) => w[0]?.toUpperCase() ?? "")
                          .join("")}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
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
          memories={memories}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

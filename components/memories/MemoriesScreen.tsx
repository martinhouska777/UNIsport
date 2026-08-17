"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useAppState } from "@/components/AppState";
import { listWithPhotos, type WorkoutLog } from "@/lib/supabase/workouts";
import { memoriesFromLogs, type Memory } from "@/lib/memories";
import MemoriesGrid from "./MemoriesGrid";
import MemoryViewer from "./MemoryViewer";
import ShareMemorySheet from "./ShareMemorySheet";
import { IconArrowLeft, IconCamera } from "@/components/icons";

/*
  MEMORIES — every photo you've attached to a logged session, on one screen.

  The session calendar (Profile tab) is the grid of DAYS. This is the grid of
  PHOTOS: the same sessions, opened from the other end. Nothing new is stored —
  it reads the photos already sitting on your workout logs, which is why each one
  arrives knowing the gym it was taken at, what you trained, and the comment you
  wrote.

  Two views, one toggle: everything at once, or split by training day.
  Colors are theme tokens (rule 1).
*/

const MODES: { key: "all" | "days"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "days", label: "By day" },
];

// Stable empty list for the no-user case, so it isn't a new array every render.
const NO_LOGS: WorkoutLog[] = [];

export default function MemoriesScreen() {
  const { userId } = useAppState();
  const router = useRouter();

  const [fetched, setFetched] = useState<WorkoutLog[] | null>(null);
  const [mode, setMode] = useState<"all" | "days">("all");
  const [viewing, setViewing] = useState<number | null>(null); // index into `memories`
  const [sharing, setSharing] = useState<Memory | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    listWithPhotos(userId)
      .then((l) => active && setFetched(l))
      .catch(() => active && setFetched([]));
    return () => {
      active = false;
    };
  }, [userId]);

  // Derived, not stored: with no signed-in user there is nothing to wait for, so
  // the screen goes straight to its empty state instead of loading forever.
  const logs = userId ? fetched : NO_LOGS;
  const memories = logs ? memoriesFromLogs(logs) : [];
  const days = new Set(memories.map((m) => m.date)).size;

  return (
    <div className="mx-auto w-full max-w-screen-sm">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b border-border bg-surface">
        <div className="flex items-center gap-2.5 px-3.5 py-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="tap44 press-icon flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-text"
          >
            <IconArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-medium text-text">Memories</h1>
            {memories.length > 0 && (
              <div className="text-[11px] text-muted">
                {memories.length} photo{memories.length === 1 ? "" : "s"} · {days} day
                {days === 1 ? "" : "s"} trained
              </div>
            )}
          </div>
        </div>

        {/* The "show it by days" toggle. Only earns its space once there's more
            than one day to split. */}
        {days > 1 && (
          <div className="flex gap-1.5 px-3.5 pb-2.5">
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMode(m.key)}
                aria-pressed={mode === m.key}
                className={`press h-8 rounded-full px-3.5 text-[12px] font-semibold ${
                  mode === m.key
                    ? "bg-primary-live text-primary-contrast"
                    : "border border-border bg-surface-2 text-muted"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {logs === null ? (
        // Grid-shaped placeholder, so nothing moves when the photos land.
        <div className="grid grid-cols-3 gap-1.5 px-3.5 pt-3" aria-busy="true" aria-label="Loading">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="skeleton aspect-square rounded-md" />
          ))}
        </div>
      ) : memories.length === 0 ? (
        <div className="px-6 pb-10 pt-14 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-primary bg-primary-tint text-primary">
            <IconCamera size={22} />
          </span>
          <div className="mt-3.5 text-[15px] font-medium text-text">No memories yet</div>
          <p className="mx-auto mt-1.5 max-w-[16rem] text-[12px] leading-relaxed text-muted">
            Add a photo when you log a session and it lands here — with the gym, what
            you trained and whatever you wrote about it.
          </p>
          <Button size="md" className="mt-4" onClick={() => router.push("/profile")}>
            Log a session
          </Button>
        </div>
      ) : (
        <MemoriesGrid
          memories={memories}
          mode={mode}
          onOpen={(m) => setViewing(memories.findIndex((x) => x.id === m.id))}
        />
      )}

      {viewing !== null && memories[viewing] && (
        <MemoryViewer
          memories={memories}
          index={viewing}
          onIndexChange={setViewing}
          onClose={() => setViewing(null)}
          onShare={setSharing}
        />
      )}

      {sharing && <ShareMemorySheet memory={sharing} onClose={() => setSharing(null)} />}
    </div>
  );
}

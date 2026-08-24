"use client";

/*
  WRITE A POST.
  ---------------------------------------------------------------------------
  Two ways in, and the sheet is the same either way:

    • pick one of your logged sessions from the calendar and put a caption on
      it — the normal case, and the one the + button leads with;
    • or just words and a picture, for "going at 6 tomorrow, anyone?".

  A session brings its own photos and its own note along (db/posts_workout.sql
  reads them straight out of the log), so once one is attached this sheet stops
  offering a photo: the pictures are already there, and a second one competing
  with them would only be confusing. What you type becomes the caption, and it
  is what the card shows instead of the note you wrote while logging.

  Sessions already on the feed are listed but not pickable — one post per
  session, so a list that let you pick a shared one would be offering a thing
  that quietly does nothing.

  Colours are theme tokens (rule 1); the textarea stays text-base so phones
  don't zoom on focus.
*/
import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { IconCamera, IconChevronRight, IconX } from "@/components/icons";
import { fileToDataUrl } from "@/lib/image";
import { createPost, sharedLogIds } from "@/lib/supabase/posts";
import { dayLabel, trainedLine } from "@/lib/memories";
import { listRecentLogs, type WorkoutLog } from "@/lib/supabase/workouts";

const MAX = 600;

export default function ComposeSheet({
  userId,
  onPosted,
  onClose,
}: {
  userId: string;
  onPosted: () => void;
  onClose: () => void;
}) {
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [session, setSession] = useState<WorkoutLog | null>(null);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  // Your recent sessions, and which of them are already on the feed.
  const [logs, setLogs] = useState<WorkoutLog[] | null>(null);
  const [shared, setShared] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    Promise.all([listRecentLogs(userId), sharedLogIds()]).then(([rows, ids]) => {
      if (!alive) return;
      setLogs(rows);
      setShared(ids);
    });
    return () => {
      alive = false;
    };
  }, [userId]);

  const canPost = (body.trim().length > 0 || photo !== null || session !== null) && !saving;

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    try {
      // Smaller than a profile photo: a feed picture is read at phone width and
      // lives in a row that gets fetched twenty at a time.
      setPhoto(await fileToDataUrl(file, 1080, 0.75));
    } catch {
      setError("That image couldn’t be read. Try another one.");
    }
  };

  const post = async () => {
    if (!canPost) return;
    setSaving(true);
    setError("");
    try {
      await createPost(body.trim(), session ? null : photo, session?.id ?? null);
      onPosted();
      onClose();
    } catch {
      setError("Couldn’t post that. Check your connection and try again.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 [animation:backdrop-in_0.2s_ease-out]"
      />

      <div className="relative flex max-h-[90%] flex-col rounded-t-3xl border-t border-border bg-surface [animation:sheet-up_0.28s_cubic-bezier(0.2,0.8,0.2,1)]">
        <div>
          <div className="flex justify-center pb-1.5 pt-2.5">
            <div className="h-1 w-9 rounded-full bg-border" />
          </div>
          <div className="flex items-center justify-between border-b border-border px-4 pb-3">
            <div>
              <div className="text-[15px] font-medium text-text">
                {picking ? "Pick a session" : "New post"}
              </div>
              <div className="mt-0.5 text-[11px] text-muted">
                {picking
                  ? "From your calendar — newest first."
                  : "Everyone can see this — your school and the others."}
              </div>
            </div>
            <button
              type="button"
              onClick={picking ? () => setPicking(false) : onClose}
              aria-label={picking ? "Back" : "Close"}
              className="tap44 press-icon flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-muted"
            >
              <IconX size={14} />
            </button>
          </div>
        </div>

        {picking ? (
          <SessionList
            logs={logs}
            shared={shared}
            onPick={(log) => {
              setSession(log);
              setPhoto(null); // the session's own photos travel with it
              setPicking(false);
            }}
          />
        ) : (
          <div className="flex flex-col gap-3 overflow-y-auto px-4 py-3.5">
            {/* THE SESSION — the thing a post is normally about. */}
            {session ? (
              <div className="flex items-center gap-3 rounded-xl border border-primary bg-primary-tint px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-text">
                    {trainedLine(session)}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-muted">
                    {[dayLabel(session.date), session.gym].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSession(null)}
                  aria-label="Remove session"
                  className="tap44 press-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-muted"
                >
                  <IconX size={13} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPicking(true)}
                className="tap44 press flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-text">Add a session</div>
                  <div className="mt-0.5 text-[11px] text-muted">
                    Pick a workout from your calendar — its photos come with it.
                  </div>
                </div>
                <IconChevronRight size={16} className="shrink-0 text-muted" />
              </button>
            )}

            {/* text-base / 16px so phones don't zoom the page on focus. */}
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, MAX))}
              rows={3}
              autoFocus
              placeholder={
                session
                  ? "Say something about it…"
                  : "Going at 6 tomorrow. Anyone want to join?"
              }
              className="w-full resize-none rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-base text-text placeholder:text-text-3 focus:border-primary focus:outline-none"
            />

            {/* A session already carries pictures, so the photo button is only
                for posts that have none of their own. */}
            {!session &&
              (photo ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a data URL */}
                  <img
                    src={photo}
                    alt="The picture on your post"
                    className="w-full rounded-xl border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setPhoto(null)}
                    aria-label="Remove photo"
                    className="tap44 press-icon absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-text"
                  >
                    <IconX size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="tap44 press flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-2 py-3 text-[13px] font-medium text-muted"
                >
                  <IconCamera size={16} />
                  Add a photo
                </button>
              ))}

            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                pickPhoto(e.target.files?.[0]);
                e.target.value = ""; // so picking the same file twice still fires
              }}
            />

            {error && <p className="text-[12px] text-danger">{error}</p>}
          </div>
        )}

        {!picking && (
          <div className="flex items-center gap-3 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <span className="text-[11px] text-text-3">
              {body.length}/{MAX}
            </span>
            <div className="flex-1" />
            <Button variant="secondary" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={post} disabled={!canPost}>
              {saving ? "Posting…" : "Post"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Your recent sessions. The ones already on the feed are shown but inert. */
function SessionList({
  logs,
  shared,
  onPick,
}: {
  logs: WorkoutLog[] | null;
  shared: Set<string>;
  onPick: (log: WorkoutLog) => void;
}) {
  if (logs === null) {
    return <p className="px-6 py-12 text-center text-[13px] text-muted">Loading…</p>;
  }
  if (logs.length === 0) {
    return (
      <p className="px-6 py-12 text-center text-[13px] leading-relaxed text-muted">
        No logged sessions yet. Log one from your Profile tab and it’ll show up here.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border overflow-y-auto">
      {logs.map((log) => {
        const already = shared.has(log.id);
        return (
          <li key={log.id}>
            <button
              type="button"
              disabled={already}
              onClick={() => onPick(log)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left disabled:opacity-45"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-medium text-text">
                  {trainedLine(log)}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-muted">
                  {[dayLabel(log.date), log.gym].filter(Boolean).join(" · ")}
                </div>
              </div>
              <span className="shrink-0 text-[11px] text-text-3">
                {already ? "On the feed" : <IconChevronRight size={16} />}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

"use client";

/*
  WRITE A POST.
  ---------------------------------------------------------------------------
  A sheet with three things in it: what you want to say, a picture, and Post.
  Nothing else — a first post should take ten seconds, and every extra field is
  a reason not to bother.

  The photo is downscaled in the browser before it ever leaves it
  (lib/image.ts), the same way session photos and profile pictures already are:
  a phone photo is 4 MB, a post's worth of it is ~150 KB.

  600 characters is the cap the database enforces (db/posts.sql), so the counter
  here shows the same number rather than a friendlier lie.
*/
import { useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { IconCamera, IconX } from "@/components/icons";
import { fileToDataUrl } from "@/lib/image";
import { createPost } from "@/lib/supabase/posts";

const MAX = 600;

export default function ComposeSheet({
  onPosted,
  onClose,
}: {
  onPosted: () => void;
  onClose: () => void;
}) {
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const canPost = (body.trim().length > 0 || photo !== null) && !saving;

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
      await createPost(body.trim(), photo);
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
              <div className="text-[15px] font-medium text-text">New post</div>
              <div className="mt-0.5 text-[11px] text-muted">
                Everyone can see this — your school and the others.
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="tap44 press-icon flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-muted"
            >
              <IconX size={14} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto px-4 py-3.5">
          {/* text-base / 16px so phones don't zoom the page on focus. */}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, MAX))}
            rows={4}
            autoFocus
            placeholder="Morning erg done. Anyone going at 6 tomorrow?"
            className="w-full resize-none rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-base text-text placeholder:text-text-3 focus:border-primary focus:outline-none"
          />

          {photo ? (
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
          )}
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
      </div>
    </div>
  );
}

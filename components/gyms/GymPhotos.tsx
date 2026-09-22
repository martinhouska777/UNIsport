"use client";

/*
  PHOTOS OF A GYM — the strip on the gym page.

  Where the four empty carousel panels used to be, and later nothing: the gym
  had no pictures because nobody was ever going to walk every gym with a camera.
  So the people who train there take them. The first tile is the camera; after
  it come the photos, newest first. Your own carry a small × so you can take
  them down. That is the whole control — the tile IS the state, so there is no
  caption under it saying what it does.
*/
import { useRef, useState } from "react";
import type { GymPhoto } from "@/lib/gymSocial";
import { IconCamera, IconX } from "@/components/icons";
import SectionLabel from "@/components/ui/SectionLabel";

type Props = {
  photos: GymPhoto[];
  onAdd: (file: File) => Promise<void>;
  onRemove: (photo: GymPhoto) => Promise<void>;
};

export default function GymPhotos({ photos, onAdd, onRemove }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setFailed(false);
    try {
      await onAdd(file);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-surface py-3.5">
      <SectionLabel className="px-3.5">Photos</SectionLabel>
      {/* One row, scrolling sideways; the gutter is inside the scroller so the
          first and last tiles line up with the rest of the page. */}
      <ul className="mt-2 flex gap-2 overflow-x-auto px-3.5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <li className="flex-shrink-0">
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className={`press-icon flex h-28 w-36 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed text-[11px] font-medium ${
              failed ? "border-danger text-danger" : "border-border text-muted"
            } ${busy ? "opacity-60" : ""}`}
          >
            <IconCamera size={20} />
            {busy ? "Adding…" : failed ? "Didn’t upload · try again" : "Add a photo"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </li>
        {photos.map((p) => (
          <li key={p.id} className="relative flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- user uploads, sized here, not through the image optimiser */}
            <img
              src={p.url}
              alt=""
              loading="lazy"
              className="h-28 w-36 rounded-xl border border-border object-cover"
            />
            {p.mine && (
              <button
                type="button"
                aria-label="Remove your photo"
                onClick={() => onRemove(p)}
                className="tap44 press-icon absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-background/70 text-text backdrop-blur"
              >
                <IconX size={14} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

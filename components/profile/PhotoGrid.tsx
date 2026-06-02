"use client";

import { useRef, useState } from "react";
import { IconPlus, IconX } from "@/components/icons";
import { fileToDataUrl } from "@/lib/image";
import VisibilityToggle from "@/components/profile/VisibilityToggle";

/*
  Functional photo grid. The dashed tile opens the device photo picker; chosen
  images are downscaled (see lib/image) and stored as data URLs on the profile.
  Each tile opens a full-screen viewer on tap and has a corner X to remove it.
  Colors come from theme variables only.
*/
export default function PhotoGrid({
  photos,
  onChange,
  visible,
  onVisibleChange,
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const added: string[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) continue;
      try {
        added.push(await fileToDataUrl(f));
      } catch {
        // Skip anything that won't decode.
      }
    }
    setBusy(false);
    if (added.length) onChange([...photos, ...added]);
  };

  const remove = (i: number) => onChange(photos.filter((_, idx) => idx !== i));

  return (
    <div className="border-b border-border px-3.5 py-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[9px] font-medium uppercase tracking-[0.1em] text-primary">
          Photos
        </div>
        <VisibilityToggle visible={visible} onChange={onVisibleChange} />
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = ""; // allow picking the same file again
        }}
      />

      <div className="grid grid-cols-3 gap-1.5">
        {photos.map((src, i) => (
          <div
            key={i}
            className="relative aspect-square overflow-hidden rounded-md border border-border bg-surface-2"
          >
            <button
              type="button"
              onClick={() => setViewer(i)}
              aria-label={`View photo ${i + 1}`}
              className="block h-full w-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
            </button>
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Remove photo ${i + 1}`}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-background/80 text-text backdrop-blur transition-colors hover:text-danger"
            >
              <IconX size={11} />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-label="Add photo"
          className="flex aspect-square items-center justify-center rounded-md border border-dashed border-border bg-surface-2 text-muted disabled:opacity-50"
        >
          <IconPlus size={20} />
        </button>
      </div>

      {viewer != null && photos[viewer] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-6"
          onClick={() => setViewer(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[viewer]}
            alt=""
            className="max-h-full max-w-full rounded-lg object-contain"
          />
          <button
            type="button"
            onClick={() => setViewer(null)}
            aria-label="Close photo"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-text"
          >
            <IconX size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { IconX } from "@/components/icons";

/*
  Read-only photo grid (for viewing someone else's profile). Tapping a tile opens
  a full-screen viewer. No add/remove — that lives in the editable PhotoGrid.
  Colors come from theme variables only.
*/
export default function PhotoGallery({ photos }: { photos: string[] }) {
  const [viewer, setViewer] = useState<number | null>(null);
  if (photos.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-3 gap-1.5">
        {photos.map((src, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setViewer(i)}
            aria-label={`View photo ${i + 1}`}
            className="aspect-square overflow-hidden rounded-md border border-border bg-surface-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
          </button>
        ))}
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
    </>
  );
}

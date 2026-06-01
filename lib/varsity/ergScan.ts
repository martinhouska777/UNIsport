/*
  ERG SCAN (client) — send a C2/RP3 monitor photo to /api/varsity/erg-scan and
  get back structured metrics. Downscales the photo first so the upload stays
  small and within the vision API's limits.
*/
export type ErgScan = {
  monitor: "C2" | "RP3" | "other";
  totalMinutes: number | null;
  totalMetres: number | null;
  splitPer500: string | null;
  strokeRate: number | null;
  avgWatts: number | null;
  confident: boolean;
};

export type ScanResult = { result?: ErgScan; error?: string };

// Shrink a photo to a JPEG data URL (long edge ≤ maxEdge) before upload.
async function fileToDataUrl(file: File, maxEdge = 1600): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no-canvas");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

export async function scanErgPhoto(file: File): Promise<ScanResult> {
  let image: string;
  try {
    image = await fileToDataUrl(file);
  } catch {
    return { error: "image" };
  }
  try {
    const res = await fetch("/api/varsity/erg-scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { error: (json as { error?: string }).error ?? "scan_failed" };
    return { result: (json as { result: ErgScan }).result };
  } catch {
    return { error: "network" };
  }
}

// Turn a decimal-minutes value into a "m:ss" clock string (for the note).
export function minutesToClock(min: number): string {
  const total = Math.round(min * 60);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

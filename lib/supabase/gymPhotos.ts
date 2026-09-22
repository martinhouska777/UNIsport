/*
  GYM PHOTOS — pictures of a gym, added by the people who train there.
  ------------------------------------------------------------------------
  Typed helpers for the SECURITY DEFINER RPCs and the public `gym-photos`
  bucket in db/gym_photos.sql. Anyone signed in can add a photo to a gym,
  everyone at the school sees it, and you can take your own down. The newest
  photo of a gym is also what its card wears on the Gyms list.

  The file lives at '<userId>/<gymSlug>/<stamp>.jpg' — the first folder IS the
  write permission (the storage policy only lets you write inside a folder named
  with your own user id), so this module must never build a path any other way.

  Falls back to localStorage when Supabase env isn't configured (same approach
  as lib/supabase/gymCrowd.ts), so the app still runs in a no-database
  environment — there the "school" is just this browser.
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { fileToDataUrl } from "@/lib/image";

const BUCKET = "gym-photos";

// Gym photos are shown as card backgrounds and thumbnails, never zoomed into,
// so they are shrunk harder than profile photos before they leave the phone.
const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.8;

// One photo of one gym, as the app reads it.
export type GymPhoto = {
  id: string;
  gymSlug: string;
  url: string; // a plain (public) url, or a data url in the no-database fallback
  at: number; // epoch ms
  mine: boolean; // the signed-in user's own photo — the only kind you may remove
};

// "data:image/jpeg;base64,…" → the bytes to upload.
function dataUrlToBlob(dataUrl: string): Blob | null {
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(dataUrl);
  if (!m) return null;
  try {
    const bytes = atob(m[2]);
    const buf = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
    return new Blob([buf], { type: m[1] });
  } catch {
    return null;
  }
}

/* ── localStorage fallback (no Supabase env) ── */
const LOCAL_KEY = "gymPhotos";
type LocalRow = { id: string; userId: string; gymSlug: string; url: string; at: number };

function loadLocal(): LocalRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(LOCAL_KEY) ?? "[]");
    return Array.isArray(raw) ? (raw as LocalRow[]) : [];
  } catch {
    return [];
  }
}
function saveLocal(rows: LocalRow[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
}

/** The newest photos of every gym, newest first within each gym. */
export async function listGymPhotos(userId: string): Promise<GymPhoto[]> {
  if (!userId) return [];
  if (!hasSupabaseEnv()) {
    return loadLocal()
      .sort((a, b) => b.at - a.at)
      .map((r) => ({ id: r.id, gymSlug: r.gymSlug, url: r.url, at: r.at, mine: r.userId === userId }));
  }
  const supabase = createClient();
  const { data, error } = await supabase.rpc("gym_photos_recent", { per_gym: 24 });
  if (error) throw new Error(`listGymPhotos failed: ${error.message}`);
  return (data as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    gymSlug: r.gym_slug as string,
    url: supabase.storage.from(BUCKET).getPublicUrl(r.path as string).data.publicUrl,
    at: Date.parse(r.created_at as string),
    mine: !!r.mine,
  }));
}

/*
  Shrink a picked file, upload it, and record it against the gym. Returns the
  new photo so the screen can show it at once. Throws when the upload or the
  record fails — the caller decides how to say so.
*/
export async function addGymPhoto(userId: string, gymSlug: string, file: File): Promise<GymPhoto> {
  if (!userId) throw new Error("not signed in");
  const dataUrl = await fileToDataUrl(file, MAX_EDGE, JPEG_QUALITY);
  const at = Date.now();

  if (!hasSupabaseEnv()) {
    const row: LocalRow = { id: `local-${at}`, userId, gymSlug, url: dataUrl, at };
    saveLocal([...loadLocal(), row]);
    return { id: row.id, gymSlug, url: dataUrl, at, mine: true };
  }

  const blob = dataUrlToBlob(dataUrl);
  if (!blob) throw new Error("could not read the picture");
  const ext = blob.type === "image/png" ? "png" : "jpg";
  const path = `${userId}/${gymSlug}/${at}.${ext}`;
  const supabase = createClient();

  const up = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type, upsert: false });
  if (up.error) throw new Error(`upload failed: ${up.error.message}`);

  const { data, error } = await supabase.rpc("gym_photo_add", { p_gym_slug: gymSlug, p_path: path });
  if (error) {
    // Don't leave an orphan file behind a failed record.
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error(`addGymPhoto failed: ${error.message}`);
  }
  return {
    id: data as string,
    gymSlug,
    url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl,
    at,
    mine: true,
  };
}

/** Take down one of YOUR photos — the row and the file. Someone else's is left alone. */
export async function removeGymPhoto(userId: string, photo: GymPhoto): Promise<void> {
  if (!userId || !photo.mine) return;
  if (!hasSupabaseEnv()) {
    saveLocal(loadLocal().filter((r) => r.id !== photo.id));
    return;
  }
  const supabase = createClient();
  const { error } = await supabase.rpc("gym_photo_remove", { p_id: photo.id });
  if (error) throw new Error(`removeGymPhoto failed: ${error.message}`);
  // The file path is the tail of the public url, after '/gym-photos/'.
  const marker = `/${BUCKET}/`;
  const i = photo.url.indexOf(marker);
  if (i >= 0) {
    const path = decodeURIComponent(photo.url.slice(i + marker.length).split("?")[0]);
    await supabase.storage.from(BUCKET).remove([path]);
  }
}

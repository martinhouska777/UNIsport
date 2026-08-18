/*
  ERG PHOTOS — the monitor shot behind a team-workout result.
  ---------------------------------------------------------------------------
  A board of self-reported times is only worth what people trust it with. The
  photo is the evidence: tap any result and see the screen the numbers came off.
  It is also what makes a misread scan fixable — you correct the numbers against
  the picture rather than re-rowing the piece.

  Stored in the PRIVATE `erg-photos` bucket (db/varsity_results.sql) at
  '<athleteId>/<dayKey>.jpg'. That first folder is the entire write permission:
  the storage policy only lets you write inside a folder named with your own
  user id, so this module must never build a path any other way.

  Reads go through short-lived SIGNED urls, so a photo can't be hotlinked out of
  the app by anyone who guesses a path.
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";

const BUCKET = "erg-photos";

// How long a viewing link stays alive. Long enough to open a board and scroll
// it, short enough that a copied url is worthless tomorrow.
const SIGNED_URL_SECONDS = 60 * 60;

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

/*
  Upload (or replace) the photo behind one athlete's result for one workout.
  Returns the stored path, or null if there was nothing to store / no database —
  the caller treats a missing photo as normal, never as a failed save.
*/
export async function uploadErgPhoto(
  athleteId: string,
  dayKey: string,
  dataUrl: string,
): Promise<string | null> {
  if (!athleteId || !dataUrl || !hasSupabaseEnv()) return null;
  const blob = dataUrlToBlob(dataUrl);
  if (!blob) return null;

  // One photo per athlete per workout: re-logging replaces it rather than
  // leaving the old screen attached to corrected numbers.
  const path = `${athleteId}/${dayKey}.jpg`;
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type, upsert: true });
  if (error) {
    console.error("uploadErgPhoto:", error.message);
    return null;
  }
  return path;
}

/* A short-lived link to view one photo. Null when it can't be signed.
   A value that is already an image (the drawn stand-in the example board uses)
   is handed straight back — there is nothing stored to sign. */
export async function ergPhotoUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("data:")) return path;
  if (!hasSupabaseEnv()) return null;
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error || !data) {
    console.error("ergPhotoUrl:", error?.message);
    return null;
  }
  return data.signedUrl;
}

/* Remove a photo — used when its result comes off the board. */
export async function deleteErgPhoto(path: string | null): Promise<void> {
  if (!path || path.startsWith("data:") || !hasSupabaseEnv()) return;
  const supabase = createClient();
  await supabase.storage.from(BUCKET).remove([path]);
}

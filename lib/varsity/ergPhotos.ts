/*
  ERG PHOTOS — the monitor shot behind a team-workout result, and behind a
  rower's own logged session.
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

  The same photo can be kept twice: once on the squad board (above, everyone
  signed in can see it) when the session is a team workout, and once with the
  rower's private log, in `log-photos` (db/varsity_log_photos.sql) at
  '<athleteId>/<logId>.jpg' — readable only by whoever can read that log, which
  is the rower and their coach. Every scanned session gets the second copy.
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";

const BUCKET = "erg-photos";
const LOG_BUCKET = "log-photos";

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

// Put one photo at `path` in `bucket`, replacing what was there.
async function put(bucket: string, path: string, dataUrl: string): Promise<string | null> {
  const blob = dataUrlToBlob(dataUrl);
  if (!blob) return null;
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType: blob.type, upsert: true });
  if (error) {
    console.error(`upload to ${bucket}:`, error.message);
    return null;
  }
  return path;
}

async function signed(bucket: string, path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("data:")) return path;
  if (!hasSupabaseEnv()) return null;
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error || !data) {
    console.error(`sign ${bucket}:`, error?.message);
    return null;
  }
  return data.signedUrl;
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
  // One photo per athlete per workout: re-logging replaces it rather than
  // leaving the old screen attached to corrected numbers.
  return put(BUCKET, `${athleteId}/${dayKey}.jpg`, dataUrl);
}

/* A short-lived link to view one photo. Null when it can't be signed.
   A value that is already an image (the drawn stand-in the example board uses)
   is handed straight back — there is nothing stored to sign. */
export const ergPhotoUrl = (path: string | null): Promise<string | null> => signed(BUCKET, path);

/* Remove a photo — used when its result comes off the board. */
export async function deleteErgPhoto(path: string | null): Promise<void> {
  if (!path || path.startsWith("data:") || !hasSupabaseEnv()) return;
  const supabase = createClient();
  await supabase.storage.from(BUCKET).remove([path]);
}

/* ── The photo kept with a private log ── */

/* Where a log's photo lives. One per log, named after it, so a re-scan
   replaces the old screen and deleting the log knows what to delete without
   reading the row first. */
export const logPhotoPath = (athleteId: string, logId: string) => `${athleteId}/${logId}.jpg`;

/* Upload the photo for one saved log. Returns its path, or null (no database,
   nothing to store, or the upload failed — never a failed save). */
export async function uploadLogPhoto(
  athleteId: string,
  logId: string,
  dataUrl: string,
): Promise<string | null> {
  if (!athleteId || !logId || !dataUrl || !hasSupabaseEnv()) return null;
  return put(LOG_BUCKET, logPhotoPath(athleteId, logId), dataUrl);
}

export const logPhotoUrl = (path: string | null | undefined): Promise<string | null> =>
  signed(LOG_BUCKET, path);

export async function deleteLogPhoto(athleteId: string, logId: string): Promise<void> {
  if (!athleteId || !logId || !hasSupabaseEnv()) return;
  const supabase = createClient();
  await supabase.storage.from(LOG_BUCKET).remove([logPhotoPath(athleteId, logId)]);
}

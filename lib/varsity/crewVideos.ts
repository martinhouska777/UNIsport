/*
  CREW VIDEOS — footage that belongs to a BOAT, not to a folder.
  ---------------------------------------------------------------------------
  The squad's video lives on one shared drive today: everything in one heap,
  named IMG_4471.mov, and no rower can tell which clip they are in. Nothing
  about that is a storage problem — it is a LABELLING problem, and the lineup
  already holds every label anybody wanted: the date, AM or PM, the rigging,
  the boat, and who sat in each seat.

  So a video here is never filed on its own. It is attached to one boat in one
  practice, and everything else is derived:
    • the TITLE writes itself (nobody types a filename),
    • the CREW is copied in at upload time — a lineup keeps being edited for
      weeks after an outing, and the video must keep saying who was actually
      aboard,
    • "which one am I in, and where" has an answer, because the seats travel
      with the file.

  Files go to the PRIVATE `crew-videos` bucket (db/varsity_videos.sql) and play
  through short-lived signed URLs. Step 2 of this feature uploads to the squad's
  own drive instead; `externalUrl` is already here for that, so rows written
  today keep playing when the destination changes.
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { rosterById, seatLabel, type Boat, type Side } from "./coachLineup";
import { dayKeyLabel, parseSessionKey, sessionLabel } from "./coachPlan";
import { fetchPlan } from "./planStore";
import {
  DRIVE_FOLDER_ID,
  driveConfigured,
  driveFolderPath,
  driveToken,
  driveUpload,
} from "./drive";

/* One seat, frozen at the moment the video was uploaded. */
export type CrewSeat = {
  seat: string; // "1"…"8", or "C" for the coxswain
  athleteId: string;
  name: string;
  side: Side;
  cox?: boolean;
};

export type CrewVideo = {
  id: string;
  dayKey: string;
  boatId: string;
  boatName: string;
  boatBadge: string;
  title: string;
  note: string;
  storagePath: string | null;
  externalUrl: string | null;
  crew: CrewSeat[];
  addedBy: string | null;
  createdAt: string;
};

/* How long a playback link stays alive: long enough to watch an outing twice,
   short enough that a link copied out of the app is dead by tomorrow. */
const SIGNED_URL_SECONDS = 60 * 60 * 3;

const BUCKET = "crew-videos";

/* ── Naming ────────────────────────────────────────────────────────────── */

/* The crew, bow → stroke, cox last: the order the coach's own sheet is written
   in, and the order the boat is drawn in the builder. */
export function crewFromBoat(boat: Boat): CrewSeat[] {
  const out: CrewSeat[] = [];
  boat.seats.forEach((s, i) => {
    const a = s.athleteId ? rosterById[s.athleteId] : null;
    if (a) out.push({ seat: seatLabel(i), athleteId: a.id, name: a.name, side: a.side });
  });
  if (boat.hasCox && boat.coxId) {
    const c = rosterById[boat.coxId];
    if (c) out.push({ seat: "C", athleteId: c.id, name: c.name, side: c.side, cox: true });
  }
  return out;
}

/* Whoever is in the stroke seat — the highest-numbered seat, so the LAST rowing
   seat in the list. A crew is named by its stroke everywhere a crew is talked
   about, which is why the title leans on it rather than on the boat alone. */
export function strokeName(crew: CrewSeat[]): string | null {
  const rowers = crew.filter((c) => !c.cox);
  return rowers.length ? rowers[rowers.length - 1].name : null;
}

// "Cech" out of "Adam Cech" — a title has room for one word, and the surname is
// the word a boathouse uses.
const lastName = (full: string) => full.trim().split(/\s+/).slice(-1)[0];

/*
  THE TITLE, which nobody types:
    "Tue 22 Jun · AM · 1V 8+ · stroke Cech · start"
  Everything but the last part comes out of the lineup. The last part is the
  optional couple of words the uploader adds when one outing produced five
  clips ("start", "20 stroke", "home").
*/
export function videoTitle(dayKey: string, boat: Boat, note = ""): string {
  const period = parseSessionKey(dayKey)?.period ?? "";
  const stroke = strokeName(crewFromBoat(boat));
  const boatBit = [boat.name.trim(), boat.badge].filter(Boolean).join(" ");
  return [
    dayKeyLabel(dayKey),
    period,
    boatBit,
    stroke ? `stroke ${lastName(stroke)}` : "",
    note.trim(),
  ]
    .filter(Boolean)
    .join(" · ");
}

/* Nothing in a name that a drive, a phone or a URL would argue with. */
const safeName = (s: string) => s.replace(/[\\/:*?"<>|]/g, "-").trim();

/*
  WHAT TO CALL THE BOAT. The folders around the file already say the date and
  which session it was, so the only question a Drive listing still has to answer
  is which boat this is — and it answers it the way a boathouse does.

  The coach's own name for the boat wins ("1V 8+"). An unnamed boat is named by
  its crew: by the stroke, or by the cox when the seats hold no stroke to point
  at. A boat with nobody in it is left with its rigging, which is the only thing
  anybody could truthfully call it.
*/
export function videoBoatName(boat: Boat): string {
  const named = boat.name.trim();
  if (named) return [named, boat.badge].filter(Boolean).join(" ");
  const crew = crewFromBoat(boat);
  const stroke = strokeName(crew);
  if (stroke) return [`stroke ${lastName(stroke)}`, boat.badge].filter(Boolean).join(" ");
  const cox = crew.find((c) => c.cox);
  if (cox) return [`cox ${lastName(cox.name)}`, boat.badge].filter(Boolean).join(" ");
  return boat.badge || "Boat";
}

/*
  The name the file itself gets. `index` is how many clips this boat already has
  from this session: the second one must not arrive in Drive under the same name
  as the first.
*/
export function videoFileName(boat: Boat, ext: string, index = 0): string {
  const suffix = index > 0 ? ` (${index + 1})` : "";
  return `${safeName(videoBoatName(boat))}${suffix}.${ext}`;
}

/*
  THE FOLDERS the file lands in. The squad browses this drive without the app —
  on a phone, between pieces — so the path itself has to answer "when was this,
  and what were we doing" before anybody opens a single file:

    HUBC Footage 25-26 / September / 04 Fri / AM · 3×25' UT2 / 1V 8+.mp4

  The day is numbered first so a month folder sorts itself into date order, and
  the workout is the coach's own words lifted out of the published plan — nobody
  types the same thing twice. A day nobody filmed gets no folder at all: these
  are made on the way past, at the moment of an upload.
*/
export function videoMonthFolder(dayKey: string): string {
  const d = parseSessionKey(dayKey)?.date ?? new Date();
  return d.toLocaleDateString("en-US", { month: "long" });
}

export function videoDayFolder(dayKey: string): string {
  const parsed = parseSessionKey(dayKey);
  if (!parsed) return safeName(dayKey);
  const d = parsed.date;
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  return `${String(d.getDate()).padStart(2, "0")} ${weekday}`;
}

/* "AM · 3×25' UT2", or just "AM" on a day the coach wrote no description. */
export function videoSessionFolder(dayKey: string, workout: string): string {
  const period = parseSessionKey(dayKey)?.period ?? "";
  const words = workout.trim().slice(0, 60);
  return safeName([period, words].filter(Boolean).join(" · ")) || "Session";
}

/*
  The workout in the coach's own words, out of the published plan. It only ever
  names a folder, so every way this can fail ends the same way: no words, and a
  folder that just says AM or PM.
*/
async function sessionWorkout(dayKey: string): Promise<string> {
  try {
    const plan = await fetchPlan();
    const session = plan.sessions[dayKey];
    if (!session) return "";
    return session.description.trim() || sessionLabel(session);
  } catch {
    return "";
  }
}

/* ── Store ─────────────────────────────────────────────────────────────── */

type Row = {
  id: string;
  day_key: string;
  boat_id: string;
  boat_name: string | null;
  boat_badge: string | null;
  title: string;
  note: string | null;
  storage_path: string | null;
  external_url: string | null;
  crew: CrewSeat[] | null;
  added_by: string | null;
  created_at: string;
};

const fromRow = (r: Row): CrewVideo => ({
  id: r.id,
  dayKey: r.day_key,
  boatId: r.boat_id,
  boatName: r.boat_name ?? "",
  boatBadge: r.boat_badge ?? "",
  title: r.title,
  note: r.note ?? "",
  storagePath: r.storage_path,
  externalUrl: r.external_url,
  crew: r.crew ?? [],
  addedBy: r.added_by,
  createdAt: r.created_at,
});

/* Every video attached to one practice, oldest first (the order they were
   filmed in, which is the order an outing is watched back in). */
export async function fetchVideos(dayKey: string): Promise<CrewVideo[]> {
  if (!hasSupabaseEnv()) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("varsity_videos")
    .select("*")
    .eq("day_key", dayKey)
    .order("created_at", { ascending: true });
  if (error || !data) {
    if (error) console.error("fetchVideos:", error.message);
    return [];
  }
  return (data as Row[]).map(fromRow);
}

/* One boat's footage. The strip on a boat card asks for exactly this, so both
   the coach's builder and an athlete's Home read the same rows the same way. */
export async function fetchBoatVideos(dayKey: string, boatId: string): Promise<CrewVideo[]> {
  if (!hasSupabaseEnv()) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("varsity_videos")
    .select("*")
    .eq("day_key", dayKey)
    .eq("boat_id", boatId)
    .order("created_at", { ascending: true });
  if (error || !data) {
    if (error) console.error("fetchBoatVideos:", error.message);
    return [];
  }
  return (data as Row[]).map(fromRow);
}

/*
  Put one file up against one boat. Returns the stored video, or an error
  message plain enough to read standing on a dock.
*/
export async function uploadCrewVideo(
  dayKey: string,
  boat: Boat,
  file: File,
  note = "",
  onProgress?: (fraction: number) => void,
): Promise<{ video?: CrewVideo; error?: string }> {
  if (!hasSupabaseEnv()) return { error: "No database connected yet." };
  const supabase = createClient();

  /*
    WHERE THE FILE GOES. The squad's own Drive when it is set up — that is the
    real destination, and the only one a full-length outing fits in. The app's
    own bucket is the fallback for a school that has not connected a drive.
    Either way the ROW below is identical, which is the whole point of keeping
    `storage_path` and `external_url` side by side.
  */
  let path: string | null = null;
  let externalUrl: string | null = null;

  if (driveConfigured()) {
    const token = await driveToken(true);
    if (!token) return { error: "Google Drive isn't connected. Tap Connect Drive and sign in." };
    /*
      WHERE IT LANDS: the month the squad already files by, then the day, then
      the session — named with the coach's own description of that workout, so
      the drive reads like the training week rather than like a camera roll.
    */
    const workout = await sessionWorkout(dayKey);
    const folder = await driveFolderPath(
      DRIVE_FOLDER_ID,
      [
        // Prefix-matched: the squad's month list is hand-made and misspelt.
        { name: videoMonthFolder(dayKey), prefixMatch: true },
        { name: videoDayFolder(dayKey) },
        { name: videoSessionFolder(dayKey, workout) },
      ],
      token,
    );
    const ext = (file.name.split(".").pop() || "mp4").toLowerCase().slice(0, 5);
    // How many clips this boat already has from this session — the second one
    // must not arrive under the same name as the first and shadow it.
    const already = await fetchBoatVideos(dayKey, boat.id);
    const result = await driveUpload(
      file,
      videoFileName(boat, ext, already.length),
      folder,
      token,
      onProgress,
    );
    if ("error" in result) return { error: result.error };
    externalUrl = result.link;
  } else {
    const ext = (file.name.split(".").pop() || "mp4").toLowerCase().slice(0, 5);
    // A boat's folder, and a random name inside it: two coaches uploading the
    // same clip name in the same minute must not overwrite each other.
    path = `${dayKey}/${boat.id}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type || "video/mp4", upsert: false });
    if (upErr) {
      console.error("uploadCrewVideo:", upErr.message);
      // The one failure a coach will actually hit, said in their words.
      return {
        error: /exceed|too large|size/i.test(upErr.message)
          ? "That file is too big for the app's own storage — this is what the Drive upload fixes."
          : "Upload failed. Check the signal and try again.",
      };
    }
    onProgress?.(1);
  }

  const { data, error } = await supabase
    .from("varsity_videos")
    .insert({
      day_key: dayKey,
      boat_id: boat.id,
      boat_name: boat.name.trim(),
      boat_badge: boat.badge,
      title: videoTitle(dayKey, boat, note),
      note: note.trim(),
      storage_path: path,
      external_url: externalUrl,
      crew: crewFromBoat(boat),
    })
    .select("*")
    .single();

  if (error || !data) {
    // The row is what makes the file findable — an orphan in the bucket helps
    // nobody, so it goes back out. A file already on the squad's Drive is left
    // alone: it is in the folder they browse by hand, so it is not lost, and
    // deleting somebody's footage to tidy up after ourselves would be worse.
    if (path) await supabase.storage.from(BUCKET).remove([path]);
    console.error("uploadCrewVideo row:", error?.message);
    return {
      error: externalUrl
        ? "The video is on Drive, but the app could not record which boat it belongs to."
        : "Could not save the video's details. Nothing was kept.",
    };
  }
  return { video: fromRow(data as Row) };
}

/* Where to point a <video> at. A drive-hosted file (step 2) is already a URL;
   anything in our own bucket gets a short-lived signed one. */
export async function videoSrc(v: CrewVideo): Promise<string | null> {
  if (v.externalUrl) return v.externalUrl;
  if (!v.storagePath || !hasSupabaseEnv()) return null;
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(v.storagePath, SIGNED_URL_SECONDS);
  if (error || !data) {
    console.error("videoSrc:", error?.message);
    return null;
  }
  return data.signedUrl;
}

/*
  Take a video down: the row first (that is what the team sees), then the file —
  but only a file in OUR bucket. A video on the squad's Drive is left where it
  is: that folder is theirs, people browse it without the app, and quietly
  deleting footage out of it because somebody tidied a list in here would be a
  nasty surprise. Removing it in the app un-files it, nothing more.
*/
export async function deleteCrewVideo(v: CrewVideo): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: "No database connected yet." };
  const supabase = createClient();
  const { error } = await supabase.from("varsity_videos").delete().eq("id", v.id);
  if (error) {
    console.error("deleteCrewVideo:", error.message);
    return { error: "Could not remove that video." };
  }
  if (v.storagePath) await supabase.storage.from(BUCKET).remove([v.storagePath]);
  return {};
}

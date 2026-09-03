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
import { dayKeyLabel, parseSessionKey } from "./coachPlan";

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

/*
  The name the file itself gets. Same information as the title, shaped so it
  still sorts and reads in a plain folder listing — because in step 2 these land
  in the squad's drive, where people browse them without the app.
*/
export function videoFileName(dayKey: string, boat: Boat, note: string, ext: string): string {
  const parsed = parseSessionKey(dayKey);
  const stamp = parsed
    ? `${parsed.date.getFullYear()}-${String(parsed.date.getMonth() + 1).padStart(2, "0")}-${String(
        parsed.date.getDate(),
      ).padStart(2, "0")} ${parsed.period}`
    : dayKey;
  const stroke = strokeName(crewFromBoat(boat));
  const bits = [stamp, [boat.name.trim(), boat.badge].filter(Boolean).join(" ")];
  if (stroke) bits.push(`(stroke ${lastName(stroke)})`);
  if (note.trim()) bits.push(note.trim());
  // Nothing in a filename that a drive, a phone or a URL would argue with.
  return `${bits.join(" — ").replace(/[\\/:*?"<>|]/g, "-")}.${ext}`;
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
): Promise<{ video?: CrewVideo; error?: string }> {
  if (!hasSupabaseEnv()) return { error: "No database connected yet." };
  const supabase = createClient();

  const ext = (file.name.split(".").pop() || "mp4").toLowerCase().slice(0, 5);
  // A boat's folder, and a random name inside it: two coaches uploading the
  // same clip name in the same minute must not overwrite each other.
  const path = `${dayKey}/${boat.id}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || "video/mp4", upsert: false });
  if (upErr) {
    console.error("uploadCrewVideo:", upErr.message);
    // The one failure a coach will actually hit, said in their words.
    return {
      error: /exceed|too large|size/i.test(upErr.message)
        ? "That file is too big for the app's own storage — this is what the drive upload fixes."
        : "Upload failed. Check the signal and try again.",
    };
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
      crew: crewFromBoat(boat),
    })
    .select("*")
    .single();

  if (error || !data) {
    // The row is what makes the file findable — an orphan in the bucket helps
    // nobody, so it goes back out.
    await supabase.storage.from(BUCKET).remove([path]);
    console.error("uploadCrewVideo row:", error?.message);
    return { error: "Could not save the video's details. Nothing was kept." };
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

/* Take a video down: the row first (that is what the team sees), then the file. */
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

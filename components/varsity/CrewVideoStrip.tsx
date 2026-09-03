"use client";

/*
  THE VIDEO STRIP — one component, both sides of the squad.
  ---------------------------------------------------------------------------
  A crew video is attached to a BOAT in a PRACTICE, never filed on its own
  (lib/varsity/crewVideos.ts). Who attaches it is not the point: the coach films
  from the launch, an athlete films from the bank, and both end up pointing at
  the same nine people. So this strip is written once and dropped into the
  coach's Lineup Builder and the athlete's Home alike — the same button, the
  same automatic title, the same crew list underneath.

  It fetches its own boat's footage, so a screen only has to say WHICH boat.

  Colors: theme tokens throughout, except the rowing-side blade colours, which
  are per-athlete CONTENT colours and come from data (the rule-1 exception the
  lineup screens already use).
*/
import { useEffect, useRef, useState, type CSSProperties } from "react";
import Sheet from "@/components/varsity/Sheet";
import { useAppState } from "@/components/AppState";
import { IconPlay, IconPlus, IconTrash, IconVideo } from "@/components/icons";
import { COX_COLOR, COX_INK, sideMeta, type Boat } from "@/lib/varsity/coachLineup";
import {
  deleteCrewVideo,
  fetchBoatVideos,
  uploadCrewVideo,
  videoSrc,
  type CrewSeat,
  type CrewVideo,
} from "@/lib/varsity/crewVideos";

/* A painted blade, the way the lineup screens paint one. */
const blade = (color: string, ink: string): CSSProperties => ({
  background: color,
  color: ink,
  borderColor: "rgba(0,0,0,0.25)",
});

/* The crew as it was when the camera rolled, seat by seat. This is the answer
   the shared drive never had: which of these people is me, and where. */
function CrewList({ crew }: { crew: CrewSeat[] }) {
  return (
    <div className="mt-3 flex flex-col gap-1">
      {crew.map((c) => (
        <div key={c.seat} className="flex items-center gap-2.5">
          <span
            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border text-[10px] font-semibold"
            style={
              c.cox ? blade(COX_COLOR, COX_INK) : blade(sideMeta[c.side].color, sideMeta[c.side].ink)
            }
          >
            {c.seat}
          </span>
          <span className="text-[12px] text-text">{c.name}</span>
        </div>
      ))}
    </div>
  );
}

/* Watch one video and see who was in the boat. The source is fetched on open:
   a bucket link is signed and short-lived, so holding one for a list nobody
   has tapped is worth nothing. */
function VideoSheet({
  video,
  canRemove,
  onClose,
  onRemoved,
}: {
  video: CrewVideo;
  canRemove: boolean;
  onClose: () => void;
  onRemoved: () => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const url = await videoSrc(video);
      if (!active) return;
      setSrc(url);
      setFailed(!url);
    })();
    return () => {
      active = false;
    };
  }, [video]);

  return (
    <Sheet title={video.title} onClose={onClose}>
      {src ? (
        <video src={src} controls playsInline className="w-full rounded-xl bg-black" />
      ) : (
        <div className="flex h-40 items-center justify-center rounded-xl border border-border bg-surface-2 text-[12px] text-muted">
          {failed ? "This video could not be opened." : "Loading…"}
        </div>
      )}

      <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        In this boat
      </div>
      <CrewList crew={video.crew} />

      {/* Only whoever put it up can take it down — the database says so too,
          so this is about not showing a button that would bounce. */}
      {canRemove && (
        <button
          type="button"
          disabled={removing}
          onClick={async () => {
            if (!window.confirm("Remove this video for the whole team?")) return;
            setRemoving(true);
            const { error } = await deleteCrewVideo(video);
            if (error) {
              window.alert(error);
              setRemoving(false);
              return;
            }
            onRemoved();
          }}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-[12px] font-medium text-danger active:bg-surface-2"
        >
          <IconTrash size={14} /> {removing ? "Removing…" : "Remove video"}
        </button>
      )}
    </Sheet>
  );
}

export default function CrewVideoStrip({ dayKey, boat }: { dayKey: string; boat: Boat }) {
  const { userId } = useAppState();
  const fileRef = useRef<HTMLInputElement>(null);
  const [videos, setVideos] = useState<CrewVideo[]>([]);
  const [playing, setPlaying] = useState<CrewVideo | null>(null);
  const [label, setLabel] = useState("");
  const [busyText, setBusyText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const found = await fetchBoatVideos(dayKey, boat.id);
      if (active) setVideos(found);
    })();
    return () => {
      active = false;
    };
  }, [dayKey, boat.id]);

  // A video of an empty boat is a video of nobody: the whole point of attaching
  // it here is the crew that travels with it.
  const seated = boat.seats.some((s) => s.athleteId) || !!boat.coxId;

  const pick = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setError(null);
    const list = Array.from(files);
    for (let i = 0; i < list.length; i++) {
      setBusyText(list.length > 1 ? `Uploading ${i + 1} of ${list.length}…` : "Uploading…");
      const { video, error: err } = await uploadCrewVideo(dayKey, boat, list[i], label);
      if (err) {
        setError(err);
        break;
      }
      if (video) setVideos((prev) => [...prev, video]);
    }
    setBusyText(null);
    setLabel("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="border-t border-border px-3.5 py-2.5">
      <div className="flex items-center gap-2 text-muted">
        <IconVideo size={14} />
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.12em]">
          Video{videos.length ? ` · ${videos.length}` : ""}
        </span>
      </div>

      {videos.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5">
          {videos.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setPlaying(v)}
              className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-2 px-2.5 py-2 text-left active:border-primary-line"
            >
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-tint text-primary">
                <IconPlay size={12} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-medium text-text">{v.title}</span>
                <span className="block text-[11px] text-muted">{v.crew.length} in the boat</span>
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          aria-label="Video label"
          placeholder="Label — start, 20 stroke… (optional)"
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-base text-[12px] text-text outline-none placeholder:italic placeholder:text-text-3"
        />
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          multiple
          hidden
          onChange={(e) => void pick(e.target.files)}
        />
        <button
          type="button"
          disabled={!!busyText || !seated}
          onClick={() => fileRef.current?.click()}
          className="tap44 flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-border px-2.5 py-1.5 text-[12px] font-medium text-muted active:border-primary-line active:text-primary disabled:opacity-50"
        >
          <IconPlus size={13} /> {busyText ?? "Add video"}
        </button>
      </div>

      {!seated && (
        <div className="mt-1.5 text-[11px] italic text-muted">
          Seat the boat first — a video is filed by its crew.
        </div>
      )}
      {error && <div className="mt-1.5 text-[11px] text-danger">{error}</div>}

      {playing && (
        <VideoSheet
          video={playing}
          canRemove={!!userId && playing.addedBy === userId}
          onClose={() => setPlaying(null)}
          onRemoved={() => {
            setVideos((prev) => prev.filter((v) => v.id !== playing.id));
            setPlaying(null);
          }}
        />
      )}
    </div>
  );
}

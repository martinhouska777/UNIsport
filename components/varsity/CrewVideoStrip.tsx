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
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Sheet from "@/components/varsity/Sheet";
import { useAppState } from "@/components/AppState";
import {
  IconChevronDown,
  IconChevronUp,
  IconPlay,
  IconPlus,
  IconTrash,
  IconVideo,
} from "@/components/icons";
import { COX_COLOR, COX_INK, sideMeta, type Boat } from "@/lib/varsity/coachLineup";
import {
  deleteCrewVideo,
  fetchBoatVideos,
  uploadCrewVideo,
  videoSrc,
  type CrewSeat,
  type CrewVideo,
} from "@/lib/varsity/crewVideos";
import {
  driveConfigured,
  driveConnected,
  driveFileId,
  driveShareAnyone,
  driveToken,
  drivePreviewUrl,
} from "@/lib/varsity/drive";

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
  const [playHere, setPlayHere] = useState(false);

  /*
    A file on the squad's Drive lives on Drive, so playing it means Drive's own
    player. Embedding that player is the nice version and the fragile one: it
    streams against the VIEWER's Google session, which a phone browser blocking
    third-party cookies never hands over, and a clip nobody shared is private to
    whoever uploaded it. Either way the embed shows Google's authorization page
    where the video should be.

    So the LINK leads. It opens the file in a real Drive tab, where the session
    is the browser's own and it simply plays. The embed is still one tap away
    for anyone it does work for. New uploads are shared by link as they land
    (driveShareAnyone), so this is the fallback, not the plan.
  */
  const preview = video.externalUrl ? drivePreviewUrl(video.externalUrl) : null;

  useEffect(() => {
    if (preview) return; // nothing to sign — Drive's embed carries its own access
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
  }, [video, preview]);

  /*
    Clips uploaded before videos were shared on the way up are still private.
    The one person who can fix that is the uploader, so when they open their own
    video we quietly ask Drive to share it by link — silently: `driveToken(false)`
    returns nothing rather than opening a popup at somebody who only came to
    watch. Nothing in the UI depends on it working.
  */
  useEffect(() => {
    if (!preview || !canRemove) return;
    const id = driveFileId(video.externalUrl ?? "");
    if (!id) return;
    void (async () => {
      const token = await driveToken(false);
      if (token) await driveShareAnyone(id, token);
    })();
  }, [preview, canRemove, video.externalUrl]);

  return (
    <Sheet title={video.title} onClose={onClose}>
      {preview ? (
        <>
          {/* The way to the video that always works. Drive is also where the
              squad browses footage without the app, and that must stay true. */}
          <a
            href={video.externalUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex aspect-video w-full flex-col items-center justify-center gap-2.5 rounded-xl border border-border bg-surface-2 text-center active:bg-surface"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-contrast">
              <IconPlay size={22} />
            </span>
            <span className="text-[13px] font-semibold text-text">Watch in Google Drive</span>
            <span className="px-6 text-[11px] leading-relaxed text-muted">
              Opens the clip in a new tab. Playing it inside the app is coming.
            </span>
          </a>
          {playHere ? (
            <iframe
              src={preview}
              title={video.title}
              allow="autoplay; fullscreen"
              allowFullScreen
              className="mt-2 aspect-video w-full rounded-xl border-0 bg-black"
            />
          ) : (
            <button
              type="button"
              onClick={() => setPlayHere(true)}
              className="mt-2 w-full text-[11px] text-muted underline"
            >
              Try playing it here instead
            </button>
          )}
        </>
      ) : src ? (
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
            const msg = video.externalUrl
              ? "Take this video off the boat for the whole team? The file stays in the squad's Drive folder."
              : "Remove this video for the whole team?";
            if (!window.confirm(msg)) return;
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
  /*
    Whether this browser can already talk to the squad's Drive. Checked without
    ever opening a popup: somebody who only came to read their lineup must not
    be shown a Google sign-in they never asked for. The popup only happens on
    the button.
  */
  const [connected, setConnected] = useState(driveConnected());
  /* Shut by default — see the strip's own comment at the bottom of the file. */
  const [open, setOpen] = useState(false);

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

  // A quiet ask: if Google can answer without a popup (already signed in, and
  // already said yes once), the button says "Add video" instead of "Connect".
  useEffect(() => {
    if (!driveConfigured() || connected) return;
    let active = true;
    void driveToken(false).then((t) => {
      if (active && t) setConnected(true);
    });
    return () => {
      active = false;
    };
  }, [connected]);

  // A video of an empty boat is a video of nobody: the whole point of attaching
  // it here is the crew that travels with it.
  const seated = boat.seats.some((s) => s.athleteId) || !!boat.coxId;
  const needsConnect = driveConfigured() && !connected;

  /*
    Open the file picker. Before Drive is connected this signs you in first,
    which has to happen inside a real tap — a browser only lets a popup open
    from one, which is why this is a click path and never an effect.
  */
  const openPicker = useCallback(async () => {
    setError(null);
    if (needsConnect) {
      const t = await driveToken(true);
      if (!t) {
        setError("Google sign-in didn't finish, so nothing was uploaded.");
        return;
      }
      setConnected(true);
    }
    fileRef.current?.click();
  }, [needsConnect]);

  const pick = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setError(null);
    const list = Array.from(files);
    for (let i = 0; i < list.length; i++) {
      // An outing video is big and the boathouse signal is not. A percentage is
      // the difference between "it's working" and "it's frozen".
      const of = list.length > 1 ? ` (${i + 1}/${list.length})` : "";
      setBusyText(`Uploading${of}…`);
      const { video, error: err } = await uploadCrewVideo(dayKey, boat, list[i], label, (f) =>
        setBusyText(`Uploading${of} ${Math.round(f * 100)}%`),
      );
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
    /*
      SHUT UNTIL ASKED FOR. Filed under a boat, this strip is three rows —
      the clips, a label field and an upload button — and it sat open under
      every single crew, which on a phone is most of a screen spent on the one
      thing nobody is reading on the way to the boathouse. Now the header says
      whether there is any footage at all, and the rest opens on a tap.
    */
    <div className="border-t border-border px-3.5 py-2.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-muted"
      >
        <IconVideo size={14} />
        <span className="flex-1 text-left text-[11px] font-semibold uppercase tracking-[0.12em]">
          Video{videos.length ? ` · ${videos.length}` : ""}
        </span>
        {open ? <IconChevronUp size={13} /> : <IconChevronDown size={13} />}
      </button>

      {open && videos.length > 0 && (
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

      <div className={`mt-2 flex items-center gap-2 ${open ? "" : "hidden"}`}>
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
        {/* One button, two jobs. Before Drive is connected it signs you in —
            which has to be a real tap, because a browser only lets a popup
            open from one. After that it is simply "Add video". */}
        <button
          type="button"
          disabled={!!busyText || !seated}
          onClick={() => void openPicker()}
          className="tap44 flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-border px-2.5 py-1.5 text-[12px] font-medium text-muted active:border-primary-line active:text-primary disabled:opacity-50"
        >
          <IconPlus size={13} /> {busyText ?? (needsConnect ? "Connect Drive" : "Add video")}
        </button>
      </div>

      {open && needsConnect && seated && (
        <div className="mt-1.5 text-[11px] italic text-muted">
          Sign in to Google once, and video goes straight to the squad&apos;s Drive folder.
        </div>
      )}

      {open && !seated && (
        <div className="mt-1.5 text-[11px] italic text-muted">
          Seat the boat first — a video is filed by its crew.
        </div>
      )}
      {open && error && <div className="mt-1.5 text-[11px] text-danger">{error}</div>}

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

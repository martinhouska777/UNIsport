"use client";

/*
  UPLOAD VIDEO — the whole job in one sheet, opened from the top of Home.
  ---------------------------------------------------------------------------
  The first version of that button tried to be clever: it guessed which boat you
  meant (yours, today) and greyed itself out when it couldn't tell. Most
  mornings it couldn't tell, so the button did nothing and read as broken.

  This asks instead. ANY practice the coach has published, ANY boat in it, by
  anybody — because whoever is holding the footage is often not in the boat it
  is of, and it is just as often yesterday's outing being posted today.

  The list is built from the practices that actually HAVE a published lineup,
  newest first, so every row in it is a row that can take a video. A video is
  still filed against a CREW (lib/varsity/crewVideos.ts): that is the whole
  point of the feature and has not changed. What has changed is that the app no
  longer guesses which crew.

  WHY CONNECTING AND CHOOSING ARE TWO SEPARATE TAPS: a phone browser only opens
  a file picker from a real tap, and it stops counting once the code has waited
  for something. Signing in to Google is a wait. So the sign-in is its own
  button, and "Choose video" opens the picker with nothing awaited in front of
  it — which is exactly what the old button got wrong.
*/
import { useEffect, useRef, useState } from "react";
import Sheet from "@/components/varsity/Sheet";
import { IconPlus, IconVideo, IconCheckCircle } from "@/components/icons";
import { dayKeyLabel, parseSessionKey, sessionLabel } from "@/lib/varsity/coachPlan";
import { fetchLineup, fetchLineupStatuses } from "@/lib/varsity/lineupStore";
import { fetchPlan } from "@/lib/varsity/planStore";
import { uploadCrewVideo, videoBoatName, videoSuggestedName } from "@/lib/varsity/crewVideos";
import { driveConfigured, driveConnected, driveToken } from "@/lib/varsity/drive";
import type { Boat } from "@/lib/varsity/coachLineup";

type Practice = { dayKey: string; label: string; workout: string; at: number };

/* Today and the seven days before it. Footage gets posted the same morning or
   the next one; a season's worth of old practices is a list nobody scrolls. */
const DAYS_BACK = 7;

/*
  Every published practice in that window, newest first — the order somebody
  posting footage thinks in ("this morning", "yesterday afternoon"). Drafts are
  left out: a lineup the squad cannot see yet is not one they can film.

  Each row also carries WHAT WAS DONE, in the coach's own words out of the
  plan — "Thu 3 Sep · PM" alone does not tell you which of two outings you are
  about to file a video under, and "3×25' UT2" does.
*/
async function fetchPractices(): Promise<Practice[]> {
  const [statuses, plan] = await Promise.all([fetchLineupStatuses(), fetchPlan()]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const oldest = todayStart.getTime() - DAYS_BACK * 24 * 60 * 60 * 1000;

  return Object.entries(statuses)
    .filter(([, status]) => status === "published")
    .map(([dayKey]) => {
      const parsed = parseSessionKey(dayKey);
      if (!parsed) return null;
      const day = parsed.date.getTime();
      if (day < oldest || day > todayStart.getTime()) return null;
      const session = plan.sessions[dayKey];
      // A nudge for PM, so two practices on one day sort morning-then-afternoon.
      const at = day + (parsed.period === "PM" ? 1 : 0);
      return {
        dayKey,
        label: `${dayKeyLabel(dayKey)} · ${parsed.period}`,
        workout: session ? session.description.trim() || sessionLabel(session) : "",
        at,
      };
    })
    .filter((p): p is Practice => !!p)
    .sort((a, b) => b.at - a.at);
}

/* A row that reads as picked or not picked. Both lists are made of these. */
function Row({
  label,
  sub,
  picked,
  onClick,
}: {
  label: string;
  sub?: string;
  picked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tap44 flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left ${
        picked
          ? "border-primary-line bg-primary-tint text-primary"
          : "border-border bg-surface-2 text-text"
      }`}
    >
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium">{label}</span>
        {sub && <span className="block text-[11px] text-muted">{sub}</span>}
      </span>
      {picked && <IconCheckCircle size={15} />}
    </button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
      {children}
    </div>
  );
}

export default function UploadVideoSheet({ onClose }: { onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [practices, setPractices] = useState<Practice[] | null>(null);
  const [dayKey, setDayKey] = useState<string | null>(null);
  /* Remembered WITH the practice they belong to, so a slow fetch can never
     leave yesterday's eight standing under today's heading — and so nothing has
     to be cleared on the way in. */
  const [boatsFor, setBoatsFor] = useState<{ dayKey: string; boats: Boat[] } | null>(null);
  const [boat, setBoat] = useState<Boat | null>(null);
  /* Chosen, and NOT yet sent. The upload used to start the instant the picker
     closed; now the file waits here while its name is agreed (owner,
     2026-09-06: "ten muzu odsouhlasit a kdyz odsouhlasim tak se to muze
     nahrat"). */
  const [picked, setPicked] = useState<File[] | null>(null);
  /* A name typed by hand, remembered WITH the boat it was typed for — the same
     trick as boatsFor above. Absent, or belonging to another boat, and the
     suggestion is what the field shows. */
  const [typed, setTyped] = useState<{ boatId: string; value: string } | null>(null);
  const [connected, setConnected] = useState(driveConnected());
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchPractices().then((p) => {
      if (active) setPractices(p);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!dayKey) return;
    let active = true;
    void fetchLineup(dayKey).then((l) => {
      if (active) setBoatsFor({ dayKey, boats: l?.boats ?? [] });
    });
    return () => {
      active = false;
    };
  }, [dayKey]);

  // null while this practice's boats are still on their way.
  const boats = boatsFor && boatsFor.dayKey === dayKey ? boatsFor.boats : null;

  const needsConnect = driveConfigured() && !connected;

  /* The coach's own words for this practice — half of the suggested name, and
     already on the row the reader tapped, so nothing is fetched twice. */
  const workout = practices?.find((p) => p.dayKey === dayKey)?.workout ?? "";

  /* Derived, not stored: the suggestion follows the boat and the practice, and
     is replaced only for as long as somebody is typing over it. */
  const suggested = boat ? videoSuggestedName(boat, workout) : "";
  const name = typed && typed.boatId === boat?.id ? typed.value : suggested;

  /* The picker closing no longer starts anything. */
  const pick = (files: FileList | null) => {
    setError(null);
    setPicked(files && files.length ? Array.from(files) : null);
  };

  const upload = async () => {
    if (!picked || !dayKey || !boat) return;
    setError(null);
    for (let i = 0; i < picked.length; i++) {
      // An outing video is big and the boathouse signal is not. A percentage is
      // the difference between "it's working" and "it's frozen".
      const of = picked.length > 1 ? ` (${i + 1}/${picked.length})` : "";
      setBusy(`Uploading${of}…`);
      const { error: err } = await uploadCrewVideo(
        dayKey,
        boat,
        picked[i],
        "",
        (f) => setBusy(`Uploading${of} ${Math.round(f * 100)}%`),
        name.trim(),
      );
      if (err) {
        setError(err);
        break;
      }
      setDone((n) => n + 1);
    }
    setBusy(null);
    setPicked(null);
    setTyped(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  /* Whatever the phone called it — the extension is the one thing about the
     name that is not the uploader's to choose. */
  const ext = picked ? (picked[0].name.split(".").pop() || "mp4").toLowerCase().slice(0, 5) : "";

  return (
    <Sheet title="Upload video" onClose={onClose}>
      <div className="flex flex-col gap-2">
        <Label>Which practice</Label>
        {practices === null ? (
          <div className="text-[12px] text-muted">Loading practices…</div>
        ) : practices.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-[12px] text-muted">
            No published lineups in the last week. A video hangs on a crew, so
            there has to be a boat to hang it on.
          </div>
        ) : (
          <div className="flex max-h-44 flex-col gap-1.5 overflow-y-auto">
            {practices.map((p) => (
              <Row
                key={p.dayKey}
                label={p.label}
                sub={p.workout}
                picked={p.dayKey === dayKey}
                onClick={() => {
                  setDayKey(p.dayKey);
                  setBoat(null); // a boat from the last practice is not in this one
                }}
              />
            ))}
          </div>
        )}

        {dayKey && (
          <>
            <Label>Which boat</Label>
            {boats === null ? (
              <div className="text-[12px] text-muted">Loading boats…</div>
            ) : boats.length === 0 ? (
              <div className="text-[12px] italic text-muted">No boats in that practice.</div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {boats.map((b) => (
                  <Row
                    key={b.id}
                    label={videoBoatName(b)}
                    sub={`${b.seats.filter((s) => s.athleteId).length} seated`}
                    picked={b.id === boat?.id}
                    onClick={() => setBoat(b)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {boat && (
          <div className="pt-2">
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              multiple
              hidden
              onChange={(e) => pick(e.target.files)}
            />
            {needsConnect ? (
              <button
                type="button"
                onClick={async () => {
                  setError(null);
                  const t = await driveToken(true);
                  if (t) setConnected(true);
                  else setError("Google sign-in didn't finish. Tap to try again.");
                }}
                className="tap44 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-[13px] font-semibold text-text"
              >
                <IconVideo size={14} /> Connect Google Drive
              </button>
            ) : picked ? (
              /*
                THE NAME, BEFORE THE UPLOAD. The suggestion is the boat and the
                coach's own words for the outing; the field is the uploader's to
                take or type over, and nothing leaves the phone until they press
                the button under it.
              */
              <>
                <Label>Save it as</Label>
                <div className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-3 py-2">
                  <input
                    value={name}
                    onChange={(e) => setTyped({ boatId: boat.id, value: e.target.value })}
                    disabled={!!busy}
                    aria-label="File name"
                    /* text-base: anything smaller and a phone zooms the page in
                       when the field takes focus. */
                    className="min-w-0 flex-1 bg-transparent text-base text-text outline-none placeholder:text-muted"
                    placeholder={videoBoatName(boat)}
                  />
                  <span className="flex-shrink-0 text-[12px] text-muted">.{ext}</span>
                </div>
                <div className="pb-2 pt-1.5 text-[11px] text-muted">
                  {picked.length === 1
                    ? picked[0].name
                    : `${picked.length} clips — the rest land under the same name, numbered (2), (3)…`}
                </div>
                <button
                  type="button"
                  disabled={!!busy || !name.trim()}
                  onClick={() => void upload()}
                  className="tap44 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-[13px] font-semibold text-primary-contrast disabled:opacity-50"
                >
                  <IconPlus size={14} />{" "}
                  {busy ?? (picked.length === 1 ? "Upload" : `Upload ${picked.length} videos`)}
                </button>
                {!busy && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="tap44 w-full pt-2 text-center text-[12px] text-muted underline underline-offset-4"
                  >
                    Choose a different video
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                disabled={!!busy}
                onClick={() => fileRef.current?.click()}
                className="tap44 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-[13px] font-semibold text-primary-contrast disabled:opacity-50"
              >
                <IconPlus size={14} /> {busy ?? "Choose video"}
              </button>
            )}
            {needsConnect && (
              <div className="pt-1.5 text-[11px] italic text-muted">
                One sign-in, and the video goes straight to the squad&apos;s Drive folder.
              </div>
            )}
          </div>
        )}

        {done > 0 && !busy && (
          <div className="pt-1 text-[12px] text-success">
            {done === 1 ? "Video uploaded." : `${done} videos uploaded.`} It is on the
            boat now — close this to see it.
          </div>
        )}
        {error && <div className="pt-1 text-[12px] text-danger">{error}</div>}
      </div>
    </Sheet>
  );
}

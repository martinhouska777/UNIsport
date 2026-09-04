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
import { dayKeyLabel, parseSessionKey } from "@/lib/varsity/coachPlan";
import { fetchLineup, fetchLineupStatuses } from "@/lib/varsity/lineupStore";
import { uploadCrewVideo, videoBoatName } from "@/lib/varsity/crewVideos";
import { driveConfigured, driveConnected, driveToken } from "@/lib/varsity/drive";
import type { Boat } from "@/lib/varsity/coachLineup";

type Practice = { dayKey: string; label: string; at: number };

/*
  Every published practice, newest first — the order somebody posting footage
  thinks in ("this morning", "yesterday afternoon"). Drafts are left out: a
  lineup the squad cannot see yet is not one they can film.
*/
async function fetchPractices(): Promise<Practice[]> {
  const statuses = await fetchLineupStatuses();
  return Object.entries(statuses)
    .filter(([, status]) => status === "published")
    .map(([dayKey]) => {
      const parsed = parseSessionKey(dayKey);
      if (!parsed) return null;
      // A nudge for PM, so two practices on one day sort morning-then-afternoon.
      const at = parsed.date.getTime() + (parsed.period === "PM" ? 1 : 0);
      return { dayKey, label: `${dayKeyLabel(dayKey)} · ${parsed.period}`, at };
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

  const upload = async (files: FileList | null) => {
    if (!files || !files.length || !dayKey || !boat) return;
    setError(null);
    const list = Array.from(files);
    for (let i = 0; i < list.length; i++) {
      // An outing video is big and the boathouse signal is not. A percentage is
      // the difference between "it's working" and "it's frozen".
      const of = list.length > 1 ? ` (${i + 1}/${list.length})` : "";
      setBusy(`Uploading${of}…`);
      const { error: err } = await uploadCrewVideo(dayKey, boat, list[i], "", (f) =>
        setBusy(`Uploading${of} ${Math.round(f * 100)}%`),
      );
      if (err) {
        setError(err);
        break;
      }
      setDone((n) => n + 1);
    }
    setBusy(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Sheet title="Upload video" onClose={onClose}>
      <div className="flex flex-col gap-2">
        <Label>Which practice</Label>
        {practices === null ? (
          <div className="text-[12px] text-muted">Loading practices…</div>
        ) : practices.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-[12px] text-muted">
            No published lineups yet. A video hangs on a crew, so there has to be a
            boat to hang it on.
          </div>
        ) : (
          <div className="flex max-h-44 flex-col gap-1.5 overflow-y-auto">
            {practices.map((p) => (
              <Row
                key={p.dayKey}
                label={p.label}
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
              onChange={(e) => void upload(e.target.files)}
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

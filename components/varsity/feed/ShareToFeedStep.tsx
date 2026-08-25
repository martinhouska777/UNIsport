"use client";

/*
  SHARE TO FEED — the step that comes AFTER the session is saved.
  ---------------------------------------------------------------------------
  THE ORDER IS THE POINT (the product owner's call). Logging a session and
  posting about it are two different acts, so they are two different screens:

    1. you log the piece — numbers, note, done. It is in your log.
    2. THEN you are asked whether it also goes on the feed.
    3. ONLY if you say yes do you get a photo box and a comment box.

  Which is why there is no photo and no comment in the log editor itself. A
  picture and a caption are things you write for other people; the log is for
  you and (on a team workout) for the coach, and asking for them there put a
  social question inside a private diary.

  The audience is chosen per post, right next to the words:
    Team     — your own squad.
    Everyone — every varsity athlete, at every school. The Instagram slot.
  The last choice is remembered, because somebody who posts to the whole world
  usually keeps doing it — but it is always on screen, never assumed silently.

  THE COACH IS NOT IN EITHER OF THEM. That is said out loud on this screen: a
  privacy promise nobody can see is not a promise. db/varsity_posts.sql is
  where it is actually enforced.

  Colors are theme tokens (rule 1); inputs stay text-base so phones don't zoom.
*/
import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { fileToDataUrl } from "@/lib/image";
import { formatMetrics } from "@/lib/varsity/logParse";
import {
  createVarsityPost,
  deleteVarsityPost,
  varsityPostForLog,
  type Audience,
} from "@/lib/varsity/postsStore";
import {
  IconArrowLeft,
  IconCamera,
  IconCheckCircle,
  IconUsers,
  IconGlobe,
  IconX,
} from "@/components/icons";

const MAX = 600;

// Who you posted to last time — the switch's starting point, never a decision
// made for you: it is on screen and changeable before anything is published.
const AUDIENCE_KEY = "unisport.varsity.feed.audience";

/** The session that was just saved, in the little it takes to show one line. */
export type SharedSession = {
  id: string;
  title: string;
  minutes: number | null;
  metres: number | null;
  split: string | null;
};

export default function ShareToFeedStep({
  session,
  onBoard = false,
  onDone,
}: {
  session: SharedSession;
  /* This was a TEAM WORKOUT, so the time is already on the squad's board
     (db/varsity_results.sql). Saying "nobody else can see it" would be a lie
     on exactly the sessions people care most about. */
  onBoard?: boolean;
  onDone: () => void;
}) {
  const [step, setStep] = useState<"ask" | "compose">("ask");
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [audience, setAudience] = useState<Audience>(() => {
    try {
      return localStorage.getItem(AUDIENCE_KEY) === "everyone" ? "everyone" : "team";
    } catch {
      return "team";
    }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Set when this session is ALREADY on the feed — editing a session must show
  // the truth, not offer to share it a second time.
  const [postId, setPostId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    varsityPostForLog(session.id).then((id) => {
      if (alive && id) setPostId(id);
    });
    return () => {
      alive = false;
    };
  }, [session.id]);

  const numbers = formatMetrics(session.minutes, session.metres, session.split);

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    try {
      // Smaller than a profile photo: a feed picture is read at phone width and
      // arrives twenty at a time.
      setPhoto(await fileToDataUrl(file, 1080, 0.75));
    } catch {
      setError("That image couldn’t be read. Try another one.");
    }
  };

  const publish = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await createVarsityPost({
      logId: session.id,
      body: body.trim(),
      photo,
      audience,
      session: { ...session, date: "", category: null },
    });
    if (res.error) {
      // Never swallow a write error the user can't see: the log is saved, the
      // post is not, and only saying so makes that recoverable.
      setBusy(false);
      setError("Couldn’t post that. Your session is saved — try again.");
      return;
    }
    try {
      localStorage.setItem(AUDIENCE_KEY, audience);
    } catch {
      /* no storage — next post just starts from Team */
    }
    setBusy(false);
    onDone();
  };

  const takeDown = async () => {
    if (!postId || busy) return;
    setBusy(true);
    const res = await deleteVarsityPost(postId);
    setBusy(false);
    if (res.error) {
      setError("Couldn’t take it off the feed. Try again.");
      return;
    }
    setPostId(null);
  };

  const sessionCard = (
    <div className="rounded-2xl border border-border bg-surface px-3.5 py-3">
      <div className="text-[14px] font-semibold text-text">{session.title}</div>
      {numbers && <div className="mt-1 text-[12px] text-muted">{numbers}</div>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[61] flex h-dvh flex-col bg-background">
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-border px-4 py-3">
        {step === "compose" ? (
          <button
            type="button"
            onClick={() => setStep("ask")}
            className="flex items-center gap-1 text-[13px] text-muted"
          >
            <IconArrowLeft size={18} /> Back
          </button>
        ) : (
          <button type="button" onClick={onDone} className="text-[13px] text-muted">
            Done
          </button>
        )}
        <div className="ml-1 text-[15px] font-semibold text-text">
          {step === "compose" ? "Share to feed" : "Session saved"}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4">
        <div className="mx-auto flex w-full max-w-screen-sm flex-col gap-4">
          {step === "ask" ? (
            <>
              <div className="flex items-start gap-2.5">
                <span className="mt-px text-success">
                  <IconCheckCircle size={18} />
                </span>
                <p className="text-[13px] leading-relaxed text-muted">
                  {postId
                    ? "It’s in your log — and on the feed."
                    : onBoard
                      ? "It’s in your log, and your time is on the squad’s board. Nothing is on the feed."
                      : "It’s in your log. Nobody else can see it."}
                </p>
              </div>

              {sessionCard}

              {postId ? (
                <div className="flex flex-col gap-2.5">
                  <p className="text-[12px] leading-relaxed text-muted">
                    This session is already on the feed.
                  </p>
                  <Button variant="dangerSoft" size="lg" full onClick={takeDown} disabled={busy}>
                    Take it off the feed
                  </Button>
                </div>
              ) : (
                <>
                  <Button size="lg" full onClick={() => setStep("compose")}>
                    Share to feed
                  </Button>
                  <button
                    type="button"
                    onClick={onDone}
                    className="tap44 py-1 text-[13px] font-medium text-muted"
                  >
                    Not now
                  </button>
                  <p className="text-[11px] leading-relaxed text-muted">
                    A photo and a comment come next — only if you share. The coach never sees
                    the feed.
                  </p>
                </>
              )}
              {error && <p className="text-[12px] text-danger">{error}</p>}
            </>
          ) : (
            <>
              {sessionCard}

              {/* THE PHOTO — the whole reason this screen exists after the log. */}
              {photo ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a data URL */}
                  <img
                    src={photo}
                    alt="The picture on your post"
                    className="w-full rounded-xl border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setPhoto(null)}
                    aria-label="Remove photo"
                    className="tap44 press-icon absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-text"
                  >
                    <IconX size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="tap44 press flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-2 py-4 text-[13px] font-medium text-muted"
                >
                  <IconCamera size={16} /> Add a photo (optional)
                </button>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  pickPhoto(e.target.files?.[0]);
                  e.target.value = ""; // so picking the same file twice still fires
                }}
              />

              {/* text-base / 16px so phones don't zoom the page on focus. */}
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, MAX))}
                rows={3}
                autoFocus
                placeholder="Say something about it…"
                className="w-full resize-none rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-base text-text placeholder:text-muted focus:border-primary focus:outline-none"
              />

              {/* WHO SEES IT */}
              <div>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Who sees it
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { key: "team", label: "My team", icon: <IconUsers size={15} /> },
                      { key: "everyone", label: "Everyone", icon: <IconGlobe size={15} /> },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setAudience(option.key)}
                      aria-pressed={audience === option.key}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border py-3 text-[13px] font-semibold ${
                        audience === option.key
                          ? "border-primary bg-primary-tint text-primary"
                          : "border-border bg-surface text-text"
                      }`}
                    >
                      {option.icon}
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted">
                  {audience === "team"
                    ? "Only your squad sees this post. The coach doesn’t."
                    : "Every varsity athlete sees this post, at every school. The coach doesn’t."}
                </p>
              </div>

              {error && <p className="text-[12px] text-danger">{error}</p>}
            </>
          )}
        </div>
      </div>

      {step === "compose" && (
        <div className="flex-shrink-0 border-t border-border bg-background px-4 pb-6 pt-3">
          <div className="mx-auto flex max-w-screen-sm items-center gap-3">
            <span className="text-[11px] text-muted">
              {body.length}/{MAX}
            </span>
            <div className="flex-1" />
            <Button size="lg" onClick={publish} disabled={busy}>
              {busy ? "Posting…" : "Post"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

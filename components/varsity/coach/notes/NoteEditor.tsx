"use client";

/*
  ONE ATHLETE'S NOTE FROM THE COACH — the full-screen editor.

  It used to be reached from a Notes tab of its own in the Coach Console: a
  list of every athlete, each opening this. The owner cut that tab — a second
  list of the same squad was extra — so the note now lives on the athlete's
  own screen (Team → a rower → Coach's note), and this editor opens from
  there. Saving writes the note (lib/varsity/notesStore.ts) SIGNED with the
  name of whoever is writing it; the athlete then sees it on their Home each
  time they open the app, with that name on it.

  Colors are theme tokens.
*/
import { useEffect, useState } from "react";
import Button, { buttonClass } from "@/components/ui/Button";
import { createPortal } from "react-dom";
import ThemeProvider from "@/components/ThemeProvider";
import { useVarsityTheme } from "@/components/varsity/useVarsityTheme";
import { useAppState } from "@/components/AppState";
import { saveNote, type TeamMember } from "@/lib/varsity/notesStore";
import { fetchProfileFullName } from "@/lib/varsity/planStore";
import { notifySquad } from "@/lib/push/client";
import { IconArrowLeft, IconCheck } from "@/components/icons";

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

export default function NoteEditor({
  member,
  initialNote,
  onBack,
  onSaved,
}: {
  member: TeamMember;
  initialNote: string;
  onBack: () => void;
  onSaved: (note: string) => void;
}) {
  const vTheme = useVarsityTheme();
  const { userId } = useAppState();
  const [text, setText] = useState(initialNote);
  const [busy, setBusy] = useState(false);
  const dirty = text.trim() !== initialNote.trim();

  /* WHO IS SIGNING IT. Read while the coach types rather than at the moment
     they hit Send, so a slow profile lookup can never be the reason a note
     goes out unsigned. */
  const [myName, setMyName] = useState("");
  useEffect(() => {
    let active = true;
    fetchProfileFullName(userId).then((n) => active && setMyName(n));
    return () => {
      active = false;
    };
  }, [userId]);

  const save = async () => {
    setBusy(true);
    const { error } = await saveNote(member.id, text, { id: userId, name: myName });
    setBusy(false);
    if (error) {
      console.error("saveNote:", error);
      return;
    }
    /*
      Tell the athlete — the only notification in the console addressed to ONE
      person, which is the whole point of a technical note. Not on a CLEAR: an
      empty note means "nothing to fix", and buzzing someone's phone to say
      nothing is worse than saying nothing quietly. The preview is the note
      itself, so most of the time it is read from the lock screen and never
      needs opening.
    */
    if (text.trim()) {
      notifySquad({ kind: "note", athleteId: member.id, preview: text.trim() });
    }
    onSaved(text.trim());
  };

  const overlay = (
    <div className="fixed inset-0 z-[60] flex h-dvh flex-col bg-background">
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-border px-4 py-3">
        <button type="button" onClick={onBack} className="flex items-center gap-1 text-[13px] text-muted">
          <IconArrowLeft size={18} /> Back
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-5">
        <div className="mx-auto w-full max-w-screen-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-[15px] font-bold text-text">
              {initialsOf(member.name)}
            </span>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
                Coach&apos;s note
              </div>
              <h1 className="text-xl font-semibold text-text">{member.name}</h1>
            </div>
          </div>

          <p className="mt-4 text-[12px] leading-relaxed text-muted">
            What should they work on? This shows on {member.name.split(/\s+/)[0]}&apos;s Home every
            time they open the app. Leave it blank to clear it (they&apos;ll see a green
            &ldquo;Good job&rdquo;).
          </p>

          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            className="mt-3 w-full resize-none rounded-2xl border border-border bg-surface px-3.5 py-3 text-base leading-relaxed text-text outline-none placeholder:text-text-3 focus:border-primary"
          />
        </div>
      </div>

      {/* footer with save — a flex sibling (flex-shrink-0), so it stays pinned
          while the content scrolls instead of drifting */}
      <div className="flex-shrink-0 border-t border-border bg-background px-4 pb-6 pt-3">
        <div className="mx-auto flex max-w-screen-sm gap-2.5">
          {initialNote.trim() && (
            <button
              type="button"
              onClick={() => setText("")}
              disabled={busy}
              className={buttonClass({ variant: "secondary", size: "lg" })}
            >
              Clear
            </button>
          )}
          {/*
            THE ONE SCREEN IN THE CONSOLE THAT KEEPS A BUTTON. Everywhere else
            the coach's work saves itself — but a note is not work in progress,
            it is words landing on one rower's Home and buzzing their phone, and
            half a sentence must never do that. So the button stays, and says
            who it is about to reach.
          */}
          <Button size="lg" onClick={save} disabled={busy || !dirty} className="flex-1">
            <IconCheck size={16} />
            {busy
              ? "Sending…"
              : text.trim()
                ? `Send to ${member.name.split(/\s+/)[0]}`
                : "Clear the note"}
          </Button>
        </div>
      </div>
    </div>
  );

  // Portal to <body> with the varsity theme, so the full-screen editor escapes
  // the coach layout's stacking context (same fix as the plan session editor).
  return createPortal(
    <ThemeProvider tokens={vTheme.dark} light={vTheme.light}>
      {overlay}
    </ThemeProvider>,
    document.body,
  );
}

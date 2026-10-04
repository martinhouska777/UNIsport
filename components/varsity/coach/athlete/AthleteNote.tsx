"use client";

/*
  THE COACH'S NOTE, on one athlete's screen in the Coach Console.

  What the Notes tab used to be for, where a coach already is when they are
  thinking about one rower: their name, their training, and the one thing
  they should work on. The note shows on the athlete's Home (red "!" while
  there is one, a green "Good job" when it is cleared). Tapping opens the
  full-screen editor, which keeps its Send button — words landing on one
  rower's phone must never go half-written.

  A note is the coach's feedback, not an error: a white card with the school
  colour as its accent (it was a red wash and a red "!" until the launch audit,
  2026-09-27). Green = no note. Colors are theme tokens.
*/
import { useEffect, useState } from "react";
import NoteEditor from "@/components/varsity/coach/notes/NoteEditor";
import { fetchNote } from "@/lib/varsity/notesStore";
import { IconCheckCircle, IconPencil } from "@/components/icons";

export default function AthleteNote({ athleteId, name }: { athleteId: string; name: string }) {
  const [note, setNote] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let active = true;
    fetchNote(athleteId).then((n) => active && setNote(n.note));
    return () => {
      active = false;
    };
  }, [athleteId]);

  const hasNote = !!note?.trim();

  return (
    <>
      <button
        type="button"
        onClick={() => setEditing(true)}
        disabled={note === null}
        className={`flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors disabled:opacity-60 ${
          hasNote ? "border-primary-line bg-surface active:bg-surface-2" : "border-border bg-surface active:bg-surface-2"
        }`}
      >
        {/* A note is its words alone — the speech-bubble icon in front of it
            is gone (owner, 2026-10-04: "nechci to message emoji tam"). */}
        {!hasNote && (
          <span className="mt-0.5 flex-shrink-0 text-success">
            <IconCheckCircle size={18} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className={`block text-[13px] leading-relaxed ${hasNote ? "text-text" : "text-muted"}`}>
            {note === null
              ? "Loading…"
              : hasNote
                ? note
                : "No note — they see “Good job”. Tap to write one."}
          </span>
        </span>
        <span className="mt-0.5 flex-shrink-0 text-muted">
          <IconPencil size={15} />
        </span>
      </button>

      {editing && (
        <NoteEditor
          member={{ id: athleteId, name }}
          initialNote={note ?? ""}
          onBack={() => setEditing(false)}
          onSaved={(n) => {
            setNote(n);
            setEditing(false);
          }}
        />
      )}
    </>
  );
}

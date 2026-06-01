"use client";

/*
  Coach NOTES screen.
  Two views:
    • "list"   — every athlete (real onboarded accounts) with a status chip:
                 red "!" when they have a technical note, green "Good job"
                 when they're all clear.
    • "edit"   — write/clear one athlete's note. Saving persists to the DB; the
                 athlete then sees it on their Home each time they open the app.

  Backed by lib/varsity/notesStore.ts. Colors are theme tokens (red = danger,
  green = success), so it re-skins with the theme.
*/
import { useEffect, useMemo, useState } from "react";
import {
  fetchTeamRoster,
  fetchNotes,
  saveNote,
  type TeamMember,
} from "@/lib/varsity/notesStore";
import {
  IconArrowLeft,
  IconChevronRight,
  IconCheckCircle,
  IconCheck,
  IconUser,
} from "@/components/icons";

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

/* The red "!" / green "Good job" status indicator (shared by list + Home). */
function StatusChip({ hasNote }: { hasNote: boolean }) {
  if (hasNote) {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-danger/40 bg-danger/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-danger">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[11px] font-black leading-none text-background">
          !
        </span>
        Note
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-success">
      <IconCheckCircle size={13} />
      Good job
    </span>
  );
}

/* ─────────────────────────  list view  ───────────────────────── */
function AthleteRow({
  member,
  note,
  onPick,
}: {
  member: TeamMember;
  note: string | undefined;
  onPick: () => void;
}) {
  const hasNote = !!note?.trim();
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3 text-left active:bg-surface-2"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-[12px] font-bold text-text">
        {initialsOf(member.name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold text-text">{member.name}</div>
        <div className="mt-0.5 truncate text-[11px] text-muted">
          {hasNote ? note : "No note — all clear"}
        </div>
      </div>
      <StatusChip hasNote={hasNote} />
      <span className="text-muted">
        <IconChevronRight size={16} />
      </span>
    </button>
  );
}

/* ─────────────────────────  edit view  ───────────────────────── */
function Editor({
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
  const [text, setText] = useState(initialNote);
  const [busy, setBusy] = useState(false);
  const dirty = text.trim() !== initialNote.trim();

  const save = async () => {
    setBusy(true);
    const { error } = await saveNote(member.id, text);
    setBusy(false);
    if (error) {
      console.error("saveNote:", error);
      return;
    }
    onSaved(text.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <button type="button" onClick={onBack} className="flex items-center gap-1 text-[13px] text-muted">
          <IconArrowLeft size={18} /> Team
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-32 pt-5">
        <div className="mx-auto w-full max-w-screen-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-[15px] font-bold text-text">
              {initialsOf(member.name)}
            </span>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
                Technical note
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
            placeholder="e.g. Finish the stroke — you're rushing the catch. Drive through to the hips before extracting."
            className="mt-3 w-full resize-none rounded-2xl border border-border bg-surface px-3.5 py-3 text-base leading-relaxed text-text outline-none placeholder:text-muted/60 focus:border-primary"
          />
        </div>
      </div>

      {/* save bar */}
      <div className="absolute inset-x-0 bottom-0 z-10 border-t border-border bg-surface px-4 pb-6 pt-3">
        <div className="mx-auto flex max-w-screen-sm gap-2.5">
          {initialNote.trim() && (
            <button
              type="button"
              onClick={() => setText("")}
              disabled={busy}
              className="rounded-2xl border border-border bg-surface px-4 py-3.5 text-[13px] font-medium text-muted disabled:opacity-50"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={busy || !dirty}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-[14px] font-semibold text-primary-contrast disabled:opacity-40"
          >
            <IconCheck size={16} />
            {busy ? "Saving…" : "Save note"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────  screen  ───────────────────────── */
export default function CoachNotesScreen() {
  const [roster, setRoster] = useState<TeamMember[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<TeamMember | null>(null);

  useEffect(() => {
    (async () => {
      const [r, n] = await Promise.all([fetchTeamRoster(), fetchNotes()]);
      setRoster(r);
      setNotes(n);
    })();
  }, []);

  const withNote = useMemo(
    () => (roster ?? []).filter((m) => notes[m.id]?.trim()).length,
    [roster, notes],
  );

  return (
    <>
      <div className="mx-auto w-full max-w-screen-sm px-4 pb-8 pt-4">
        <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-accent">Notes</div>
        <h1 className="mt-0.5 text-2xl font-semibold text-text">Athlete Notes</h1>
        <p className="mt-1 text-[12px] text-muted">
          Tap an athlete to write a technical note. They see it on their Home.
        </p>

        {roster === null ? (
          <div className="mt-10 text-center text-[13px] text-muted">Loading team…</div>
        ) : roster.length === 0 ? (
          <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center">
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
              <IconUser size={20} />
            </span>
            <div className="text-[14px] font-semibold text-text">No athletes yet</div>
            <p className="mt-1 max-w-[16rem] text-[12px] leading-relaxed text-muted">
              Notes are for real signed-up accounts. Once teammates onboard, they show up here.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                {roster.length} athlete{roster.length === 1 ? "" : "s"}
              </span>
              <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-muted">
                {withNote} with a note
              </span>
            </div>
            <div className="mt-2.5 flex flex-col gap-2">
              {roster.map((m) => (
                <AthleteRow key={m.id} member={m} note={notes[m.id]} onPick={() => setEditing(m)} />
              ))}
            </div>
          </>
        )}
      </div>

      {editing && (
        <Editor
          member={editing}
          initialNote={notes[editing.id] ?? ""}
          onBack={() => setEditing(null)}
          onSaved={(note) => {
            setNotes((prev) => {
              const next = { ...prev };
              if (note) next[editing.id] = note;
              else delete next[editing.id];
              return next;
            });
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

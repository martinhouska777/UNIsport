"use client";

/*
  "WRITE A TECHNICAL NOTE" — the button on top of the coach's Team tab.

  The quick way to the note, for when the coach is thinking of what they want
  to say rather than of whose page to open: press it, pick the rower from the
  squad (searchable), write, Send — the note lands on that rower's Home and
  buzzes their phone. The same note is also on each rower's own screen (Team →
  a rower → Technical note); both open the one editor, NoteEditor.tsx.

  Only real signed-up accounts can get a note (lib/varsity/notesStore.ts), so
  the picker lists those, not the mock roster underneath. Colors are theme
  tokens (red = has a note).
*/
import { useState } from "react";
import Button from "@/components/ui/Button";
import Sheet from "@/components/varsity/Sheet";
import NoteEditor from "@/components/varsity/coach/notes/NoteEditor";
import { fetchTeamRoster, fetchNotes, type TeamMember } from "@/lib/varsity/notesStore";
import { IconPencil, IconSearch, IconUser, IconChevronRight } from "@/components/icons";

export default function WriteNoteButton() {
  const [picking, setPicking] = useState(false);
  const [roster, setRoster] = useState<TeamMember[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [writing, setWriting] = useState<TeamMember | null>(null);

  // Loaded when the picker opens, so a note sent a minute ago shows as sent.
  const open = async () => {
    setQuery("");
    setPicking(true);
    const [r, n] = await Promise.all([fetchTeamRoster(), fetchNotes()]);
    setRoster(r);
    setNotes(n);
  };

  const q = query.trim().toLowerCase();
  const shown = (roster ?? []).filter((m) => !q || m.name.toLowerCase().includes(q));

  return (
    <>
      <Button variant="secondary" size="lg" full onClick={open}>
        <IconPencil size={16} /> Write a technical note
      </Button>

      {picking && (
        <Sheet title="Technical note for…" onClose={() => setPicking(false)}>
          {roster === null ? (
            <div className="py-8 text-center text-[13px] text-muted">Loading the squad…</div>
          ) : roster.length === 0 ? (
            <div className="py-8 text-center text-[12px] leading-relaxed text-muted">
              Notes are for signed-up accounts. Once teammates join, they show up here.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
                <span className="text-muted">
                  <IconSearch size={16} />
                </span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search athlete"
                  aria-label="Search athlete"
                  // 16px so a phone doesn't zoom in on focus.
                  className="w-full bg-transparent text-base text-text outline-none placeholder:text-muted"
                />
              </div>
              <div className="mt-3 flex flex-col gap-1.5">
                {shown.map((m) => {
                  const note = notes[m.id]?.trim();
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setPicking(false);
                        setWriting(m);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-left active:bg-surface"
                    >
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary-tint text-primary">
                        <IconUser size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-text">{m.name}</span>
                        <span className={`block truncate text-[11px] ${note ? "text-danger" : "text-muted"}`}>
                          {note ? `Note: ${note}` : "No note"}
                        </span>
                      </span>
                      <span className="text-muted">
                        <IconChevronRight size={15} />
                      </span>
                    </button>
                  );
                })}
                {shown.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-[12px] text-muted">
                    No one matches “{query}”.
                  </div>
                )}
              </div>
            </>
          )}
        </Sheet>
      )}

      {writing && (
        <NoteEditor
          member={writing}
          initialNote={notes[writing.id] ?? ""}
          onBack={() => setWriting(null)}
          onSaved={(n) => {
            setNotes((prev) => {
              const next = { ...prev };
              if (n) next[writing.id] = n;
              else delete next[writing.id];
              return next;
            });
            setWriting(null);
          }}
        />
      )}
    </>
  );
}

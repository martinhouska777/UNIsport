"use client";

/*
  THE WATER LEADERBOARD — one session's race pieces, as a board.
  ---------------------------------------------------------------------------
  Opened from a row on the Water side of Workouts. What the erg side does for
  a 2k, this does for the timing sheet (owner, 2026-09-21: "we want
  leaderboards for the water workout as well… who on which piece number wins,
  but by margins as well").

  Across the top: one tab per piece, and COMBINED. On a piece, every class of
  boat is its own table — the fours are not raced against the pairs — with
  the crews in finishing order, their time, the gap to the winner and the gap
  to the boat just ahead. On Combined, a crew's day is the SUM of its margins
  to its class winner over the pieces, smallest on top; each piece's margin is
  written after it so the sum can be checked by eye.

  IN THE COACH CONSOLE the board is also where the sheet is typed: a pencil on
  the piece opens its crews with a Start and a Finish field each (the running
  watch, "25:14.48"), an overall time when there is no watch reading, and a
  note ("Bridge"). Crews are the session's lineup boats; one that did not race
  the piece is simply removed from it, and can be put back. New pieces come
  from the + at the end of the tabs. A rower sees the board, never the fields.

  Times are typed at 16px (the phone-zoom rule). All colours are theme tokens.
*/
import { useMemo, useState } from "react";
import Sheet from "@/components/varsity/Sheet";
import { IconPencil, IconPlus, IconTrash, IconX } from "@/components/icons";
import type { Boat } from "@/lib/varsity/coachLineup";
import {
  combinedBoards,
  crewFromBoat,
  crewTime,
  formatClock,
  formatMargin,
  newPiece,
  parseClock,
  pieceBoards,
  type RaceCrew,
  type RaceDay,
  type RacePiece,
} from "@/lib/varsity/racePieces";
import { deleteRaceDay, saveRaceDay } from "@/lib/varsity/raceStore";

const COMBINED = "combined";

export default function RaceBoard({
  day,
  dateLabel,
  title,
  boats,
  inConsole = false,
  onChange,
  onDeleted,
  onClose,
}: {
  day: RaceDay;
  /** "Tue 15 Sep · AM" */
  dateLabel: string;
  /** The plan's words for the session — "2x2k open in small boats". */
  title: string;
  /** The session's lineup boats, so a crew can be added to a piece. */
  boats: Boat[];
  inConsole?: boolean;
  /** The day as saved, so the list behind stays current. */
  onChange: (day: RaceDay) => void;
  onDeleted: () => void;
  onClose: () => void;
}) {
  const [picked, setTab] = useState<string>(day.pieces[0]?.id ?? COMBINED);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [refused, setRefused] = useState(false);

  // A piece deleted from under the open tab: the first one left is shown.
  const tab =
    picked === COMBINED || day.pieces.some((p) => p.id === picked) ? picked : (day.pieces[0]?.id ?? COMBINED);

  const write = async (next: RaceDay) => {
    onChange(next); // optimistic — the coach is typing at the dock
    const ok = await saveRaceDay(next);
    setRefused(!ok);
  };

  const addPiece = () => {
    const piece = newPiece(day.pieces.length + 1, boats);
    write({ ...day, pieces: [...day.pieces, piece] });
    setTab(piece.id);
    setEditing(piece.id);
  };

  const piece = day.pieces.find((p) => p.id === tab) ?? null;
  const combined = useMemo(() => combinedBoards(day.pieces), [day.pieces]);

  return (
    <Sheet title="" onClose={onClose} full>
      {/* THE SESSION — the same white card the erg board opens on. */}
      <div className="rounded-2xl border border-border bg-surface px-4 py-3 shadow-card">
        <div className="text-[15px] font-semibold text-text">{title || "Race pieces"}</div>
        <div className="mt-0.5 text-[12px] text-muted">
          {dateLabel} · {day.pieces.length} {day.pieces.length === 1 ? "piece" : "pieces"}
        </div>
      </div>

      {/* PIECE 1 | PIECE 2 | COMBINED — and, for the coach, a + for the next one. */}
      <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
        {day.pieces.map((p) => (
          <TabButton key={p.id} on={tab === p.id} onClick={() => setTab(p.id)}>
            {p.name}
          </TabButton>
        ))}
        {day.pieces.length > 0 && (
          <TabButton on={tab === COMBINED} onClick={() => setTab(COMBINED)}>
            Combined
          </TabButton>
        )}
        {inConsole && (
          <button
            type="button"
            onClick={addPiece}
            aria-label="Add a piece"
            className="tap44 press-icon flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-muted"
          >
            <IconPlus size={14} />
          </button>
        )}
      </div>

      {refused && (
        <p className="mt-2 text-[12px] text-danger">That did not save — only a coach can write times.</p>
      )}

      {day.pieces.length === 0 && (
        <div className="mt-3 rounded-2xl border border-dashed border-border bg-surface-2 px-4 py-8 text-center text-[12px] text-muted">
          {inConsole ? "No pieces yet — tap + to add the first one." : "No pieces timed yet."}
        </div>
      )}

      {/* ONE PIECE: a table per class. */}
      {piece && (
        <div className="mt-3">
          {inConsole && (
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setEditing(piece.id)}
                className="tap44 flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-[12px] font-medium text-text"
              >
                <IconPencil size={13} /> Enter times
              </button>
            </div>
          )}
          {pieceBoards(piece).map((cb) => (
            <div key={cb.badge} className="mb-4">
              <div className="mb-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                {cb.title}
              </div>
              <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                <div className="grid grid-cols-[1.4rem_1fr_4.6rem_4rem_4rem] gap-1 border-b border-border px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">
                  <span />
                  <span>Crew</span>
                  <span className="text-right">Time</span>
                  <span className="text-right">To 1st</span>
                  <span className="text-right">To next</span>
                </div>
                {cb.rows.map((r) => (
                  <div
                    key={r.crew.boatId}
                    className="grid grid-cols-[1.4rem_1fr_4.6rem_4rem_4rem] items-center gap-1 border-b border-border px-3 py-2.5 text-[12px] last:border-b-0"
                  >
                    <span className={`font-mono text-[12px] ${r.rank === 1 ? "font-semibold text-text" : "text-muted"}`}>{r.rank}</span>
                    <span className="min-w-0">
                      <span className="block break-words font-medium leading-tight text-text">{r.crew.label}</span>
                      {r.crew.note && <span className="block truncate text-[11px] text-muted">{r.crew.note}</span>}
                    </span>
                    <span className="text-right font-mono tabular-nums text-text">{formatClock(r.time)}</span>
                    <span className="text-right font-mono tabular-nums text-muted">{formatMargin(r.toWinner)}</span>
                    <span className="text-right font-mono tabular-nums text-muted">
                      {r.toAhead == null ? "" : formatMargin(r.toAhead)}
                    </span>
                  </div>
                ))}
                {cb.pending.map((c) => (
                  <div
                    key={c.boatId}
                    className="grid grid-cols-[1.4rem_1fr_auto] items-center gap-1 border-b border-border px-3 py-2.5 text-[13px] last:border-b-0"
                  >
                    <span />
                    <span className="truncate text-muted">{c.label}</span>
                    <span className="text-[11px] text-muted">no time yet</span>
                  </div>
                ))}
                {cb.rows.length === 0 && cb.pending.length === 0 && (
                  <div className="px-3 py-4 text-center text-[12px] text-muted">No crews.</div>
                )}
              </div>
            </div>
          ))}
          {piece.crews.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-surface-2 px-4 py-8 text-center text-[12px] text-muted">
              No crews in this piece{inConsole ? " — add them with Enter times." : "."}
            </div>
          )}
        </div>
      )}

      {/* COMBINED: the day as the sum of margins, per class. */}
      {tab === COMBINED && day.pieces.length > 0 && (
        <div className="mt-3">
          <p className="mb-3 px-0.5 text-[12px] text-muted">
            The margins of each crew to the winner of its class, added up over the pieces. Smallest on top.
          </p>
          {combined.map((cb) => (
            <div key={cb.badge} className="mb-4">
              <div className="mb-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                {cb.title}
              </div>
              <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                <div className="grid grid-cols-[1.4rem_1fr_5.2rem] gap-1 border-b border-border px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">
                  <span />
                  <span>Crew</span>
                  <span className="text-right">Margins</span>
                </div>
                {cb.rows.map((r) => (
                  <div
                    key={r.boatId}
                    className="grid grid-cols-[1.4rem_1fr_5.2rem] items-center gap-1 border-b border-border px-3 py-2.5 text-[13px] last:border-b-0"
                  >
                    <span className={`font-mono text-[12px] ${r.rank === 1 && r.raced === day.pieces.length ? "font-semibold text-text" : "text-muted"}`}>
                      {r.rank}
                    </span>
                    <span className="min-w-0">
                      <span className="block break-words font-medium leading-tight text-text">{r.label}</span>
                      <span className="block truncate font-mono text-[11px] tabular-nums text-muted">
                        {r.perPiece.map((m) => (m == null ? "—" : formatMargin(m))).join(" · ")}
                        {r.raced < day.pieces.length ? `  · ${day.pieces.length - r.raced} not raced` : ""}
                      </span>
                    </span>
                    <span className="text-right font-mono tabular-nums text-text">
                      {r.raced ? formatMargin(r.margins) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* THE COACH'S WAY OUT OF A WRONG DAY. */}
      {inConsole && (
        <div className="mt-6 flex justify-center">
          {confirmDelete ? (
            <div className="flex items-center gap-2 text-[12px]">
              <span className="text-muted">Delete every piece of this session?</span>
              <button
                type="button"
                onClick={async () => {
                  if (await deleteRaceDay(day.dayKey)) onDeleted();
                  else setRefused(true);
                }}
                className="tap44 rounded-full border border-border bg-surface-2 px-3 py-1.5 font-medium text-danger"
              >
                Delete
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="tap44 px-2 py-1.5 text-muted">
                Keep
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="tap44 flex items-center gap-1.5 text-[12px] text-muted"
            >
              <IconTrash size={13} /> Delete these race pieces
            </button>
          )}
        </div>
      )}

      {editing && piece && editing === piece.id && (
        <PieceEditor
          piece={piece}
          boats={boats}
          onSave={(next) => {
            write({ ...day, pieces: day.pieces.map((p) => (p.id === next.id ? next : p)) });
            setEditing(null);
          }}
          onDelete={() => {
            write({ ...day, pieces: day.pieces.filter((p) => p.id !== piece.id).map((p, i) => ({ ...p, name: `Piece ${i + 1}` })) });
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </Sheet>
  );
}

function TabButton({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`flex-shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
        on ? "border-text bg-text text-background" : "border-border bg-surface text-muted"
      }`}
    >
      {children}
    </button>
  );
}

/* ── Typing the sheet ───────────────────────────────────────────────────── */

type Draft = RaceCrew & { startText: string; finishText: string; totalText: string };

const toDraft = (c: RaceCrew): Draft => ({
  ...c,
  startText: c.start == null ? "" : formatClock(c.start),
  finishText: c.finish == null ? "" : formatClock(c.finish),
  totalText: c.total == null ? "" : formatClock(c.total),
});

function PieceEditor({
  piece,
  boats,
  onSave,
  onDelete,
  onClose,
}: {
  piece: RacePiece;
  boats: Boat[];
  onSave: (piece: RacePiece) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(piece.name);
  const [crews, setCrews] = useState<Draft[]>(() => piece.crews.map(toDraft));
  const [adding, setAdding] = useState(false);

  const notIn = boats.filter((b) => !crews.some((c) => c.boatId === b.id));

  const update = (i: number, patch: Partial<Draft>) =>
    setCrews((cs) => cs.map((c, k) => (k === i ? { ...c, ...patch } : c)));

  const save = () => {
    onSave({
      id: piece.id,
      name: name.trim() || piece.name,
      crews: crews.map(({ startText, finishText, totalText, ...c }) => ({
        ...c,
        start: parseClock(startText),
        finish: parseClock(finishText),
        total: parseClock(totalText),
        note: c.note.trim(),
      })),
    });
  };

  const field = "w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-base text-text outline-none placeholder:text-muted";

  return (
    <Sheet title={piece.name} onClose={onClose} full>
      <label className="block">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Piece</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className={`${field} mt-1`} />
      </label>

      <p className="mt-4 text-[12px] text-muted">
        Start and finish off the running watch, as on the sheet — 25:14.48. The overall time works itself out.
        No watch reading? Type the overall time instead.
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {crews.map((c, i) => {
          const time = crewTime({ ...c, start: parseClock(c.startText), finish: parseClock(c.finishText), total: parseClock(c.totalText) });
          return (
            <div key={c.boatId} className="rounded-2xl border border-border bg-surface-2 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-text">{c.label}</div>
                  <div className="text-[11px] text-muted">{c.badge}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[13px] tabular-nums text-text">{formatClock(time)}</span>
                  <button
                    type="button"
                    onClick={() => setCrews((cs) => cs.filter((_, k) => k !== i))}
                    aria-label={`Take ${c.label} out of this piece`}
                    className="tap44 press-icon flex h-7 w-7 items-center justify-center rounded-full text-muted"
                  >
                    <IconX size={13} />
                  </button>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <label className="block">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">Start</span>
                  <input inputMode="decimal" placeholder="mm:ss.hh" value={c.startText} onChange={(e) => update(i, { startText: e.target.value })} className={`${field} mt-0.5 font-mono`} />
                </label>
                <label className="block">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">Finish</span>
                  <input inputMode="decimal" placeholder="mm:ss.hh" value={c.finishText} onChange={(e) => update(i, { finishText: e.target.value })} className={`${field} mt-0.5 font-mono`} />
                </label>
                <label className="block">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">Overall</span>
                  <input inputMode="decimal" placeholder="mm:ss.hh" value={c.totalText} onChange={(e) => update(i, { totalText: e.target.value })} className={`${field} mt-0.5 font-mono`} />
                </label>
              </div>
              <input
                placeholder="Note — Bridge, crab…"
                value={c.note}
                onChange={(e) => update(i, { note: e.target.value })}
                className={`${field} mt-2`}
              />
            </div>
          );
        })}
      </div>

      {/* A crew that is in the lineup but not (yet) in this piece. */}
      {notIn.length > 0 && (
        <div className="mt-3">
          {adding ? (
            <div className="flex flex-wrap gap-1.5">
              {notIn.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setCrews((cs) => [...cs, toDraft(crewFromBoat(b))]);
                    setAdding(false);
                  }}
                  className="tap44 rounded-full border border-border bg-surface px-3 py-1.5 text-[12px] font-medium text-text"
                >
                  {crewFromBoat(b).label} · {b.badge}
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="tap44 flex items-center gap-1.5 text-[12px] font-medium text-text"
            >
              <IconPlus size={13} /> Add a crew from the lineup
            </button>
          )}
        </div>
      )}
      {boats.length === 0 && crews.length === 0 && (
        <p className="mt-3 text-[12px] text-muted">
          This session has no published lineup, so there are no crews to time. Publish the boats first.
        </p>
      )}

      <div className="mt-6 flex items-center justify-between">
        <button type="button" onClick={onDelete} className="tap44 flex items-center gap-1.5 text-[12px] text-muted">
          <IconTrash size={13} /> Delete this piece
        </button>
        <button
          type="button"
          onClick={save}
          className="tap44 rounded-full bg-primary px-5 py-2.5 text-[13px] font-semibold text-primary-contrast"
        >
          Save times
        </button>
      </div>
    </Sheet>
  );
}

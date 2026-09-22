"use client";

/*
  THE WATER LEADERBOARD — one session's race pieces, as a board.
  ---------------------------------------------------------------------------
  Opened from a row on the Water side of Workouts. What the erg side does for
  a 2k, this does for the timing sheet (owner, 2026-09-21: "we want
  leaderboards for the water workout as well… who on which piece number wins,
  but by margins as well"), and it is DRAWN the erg board's way: the same
  card at the top with the day on the right, a numbered place, a bold name
  and a bold time on every row. The first version was a bare white table;
  the owner did not like the look of it. No medals: on a class of three
  crews every one of them would wear one (owner: "just do 1, 2, 3").

  Across the top: one tab per piece, and COMBINED. On a piece, every class of
  boat is its own list, headed by the rigging's symbol — 4+, 2− — with the
  crews in finishing order, their TIME and their gap TO FIRST. Nothing else:
  the gap to the boat just ahead is still worked out (racePieces.ts) but the
  owner had it taken off the board. A crew is drawn as its BOAT: the cox as
  the name (that is how the sheet calls a coxed four), then every rower in a
  bordered chip, STACKED in a narrow column like the seats of the lineup
  card, so no name is ever cut off and the row stays narrow. On Combined the
  margins are COLUMNS — Piece 1, Piece 2, Total — smallest total on top; a
  piece the crew did not race is a dash, and nothing is written about it.

  IN THE COACH CONSOLE the board is also where the sheet is typed: Enter
  times opens the piece's crews with a Start and a Finish field each (the
  running watch, "25:14.48"), an overall time when there is no watch reading,
  and a note ("Bridge"). Crews are the session's lineup boats; one that did
  not race the piece is simply removed from it, and can be put back. New
  pieces come from the + at the end of the tabs. A rower sees the board,
  never the fields.

  Times are typed at 16px (the phone-zoom rule). All colours are theme
  tokens, except the cox's yellow, which is the same per-role identity colour
  the lineup card uses (COX_COLOR, from data — the documented rule-1
  exception).
*/
import { useMemo, useState } from "react";
import Sheet from "@/components/varsity/Sheet";
import { IconPencil, IconPlus, IconTrash, IconX } from "@/components/icons";
import { COX_COLOR, COX_INK, COX_LABEL, type Boat } from "@/lib/varsity/coachLineup";
import {
  classTitle,
  combinedBoards,
  crewFromBoat,
  crewMembers,
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

/* The header row of a list. */
const TH = "text-[9px] font-semibold uppercase tracking-[0.1em] text-muted";

/** The place, as a plain number. No medals here (owner, 2026-09-21: "there's
    no point, just do 1, 2, 3") — a class of three would hand out three. */
function Rank({ rank, faint = false }: { rank: number; faint?: boolean }) {
  return (
    <span className={`w-5 flex-shrink-0 text-center text-[12px] font-semibold ${faint || rank > 3 ? "text-muted" : "text-text"}`}>
      {rank}
    </span>
  );
}

/*
  THE CREW, DRAWN AS ITS BOAT. The names are STACKED, one on top of the
  other in a narrow column, the way the lineup card seats a crew — not spread
  across the row, which the owner found "super wide". A coxed boat is named
  by its cox, the sheet's way, with the cox's yellow tag; under it every
  rower in a bordered chip, stroke first, each on its own line so no name is
  ever cut off ("Now I can't even see the whole names"). A pair has no cox
  and no title: it IS its two chips. The note ("Bridge") is the last chip,
  dashed, so a remark never looks like a rower.
*/
function CrewBoat({ crew, dim = false }: { crew: RaceCrew; dim?: boolean }) {
  const { cox, rowers } = crewMembers(crew);
  const chip = `flex h-[22px] max-w-full items-center self-start rounded-[6px] border px-[7px] text-[12px] ${
    dim ? "border-border text-muted" : "border-border bg-surface-2 font-medium text-text"
  }`;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      {cox && (
        <div className="flex items-center gap-1.5">
          <span className={`truncate text-[13px] font-semibold ${dim ? "text-muted" : "text-text"}`}>{cox}</span>
          <span
            className="flex h-[16px] flex-shrink-0 items-center rounded-[4px] px-[5px] font-mono text-[9px] font-semibold tracking-[0.06em]"
            style={{ background: COX_COLOR, color: COX_INK }}
          >
            {COX_LABEL}
          </span>
        </div>
      )}
      {rowers.map((n, i) => (
        <span key={i} className={chip}>
          <span className="truncate">{n}</span>
        </span>
      ))}
      {crew.note && (
        <span className="flex h-[22px] max-w-full items-center self-start rounded-[6px] border border-dashed border-border px-[7px] text-[11px] text-muted">
          <span className="truncate">{crew.note}</span>
        </span>
      )}
      {!cox && rowers.length === 0 && (
        <span className={`text-[13px] font-semibold ${dim ? "text-muted" : "text-text"}`}>{crew.label}</span>
      )}
    </div>
  );
}

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
  /** The plan's words for the session — "2×2k open rate, small boats". */
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

  /*
    Combined's columns: the crew (its names stacked), one column per piece,
    and Total — one line per crew, as on a piece. With the names in a column
    the crew needs little width; past two pieces the list scrolls sideways
    under the thumb rather than squeezing the names to nothing.
  */
  const n = day.pieces.length;
  const combinedCols = `1.25rem minmax(0,1fr) repeat(${n}, 3.6rem) 3.9rem`;
  const combinedMin = `${1.25 + 5.5 + n * 3.6 + 3.9 + (n + 2) * 0.375 + 1.25}rem`;

  return (
    <Sheet title="" onClose={onClose} full>
      {/* THE SESSION — the same white card the erg board opens on: the day's
          dot and the plan's words on the left, the date top right. The piece
          count that used to sit under it is gone; the tabs already say it. */}
      <div className="rounded-2xl border border-border bg-surface px-3.5 py-3 shadow-card">
        <div className="flex items-start gap-2">
          <span className="mt-[5px] h-2.5 w-2.5 flex-shrink-0 rounded-full bg-accent" />
          <span className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-text">
            {title || "Race pieces"}
          </span>
          <span className="flex-shrink-0 pt-px text-[11px] text-muted">{dateLabel}</span>
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

      {/* ONE PIECE: a list per class — 4+, then 2−. */}
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
              <div className="mb-1.5 px-0.5 font-mono text-[13px] font-semibold text-text">{cb.title}</div>
              <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                <div className={`grid grid-cols-[1.25rem_minmax(0,1fr)_4.4rem_3.9rem] gap-1.5 border-b border-border px-2.5 py-2 ${TH}`}>
                  <span />
                  <span>Crew</span>
                  <span className="text-right">Time</span>
                  <span className="text-right">To 1st</span>
                </div>
                {cb.rows.map((r, i) => (
                  <div
                    key={r.crew.boatId}
                    className={`grid grid-cols-[1.25rem_minmax(0,1fr)_4.4rem_3.9rem] items-center gap-1.5 px-2.5 py-2.5 ${
                      i > 0 ? "border-t border-border" : ""
                    }`}
                  >
                    <Rank rank={r.rank} />
                    <CrewBoat crew={r.crew} />
                    <span className="text-right text-[13px] font-semibold tabular-nums text-text">{formatClock(r.time)}</span>
                    <span className="text-right text-[12px] tabular-nums text-muted">{formatMargin(r.toWinner)}</span>
                  </div>
                ))}
                {cb.pending.map((c, i) => (
                  <div
                    key={c.boatId}
                    className={`grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-1.5 px-2.5 py-2.5 ${
                      i > 0 || cb.rows.length > 0 ? "border-t border-border" : ""
                    }`}
                  >
                    <span />
                    <CrewBoat crew={c} dim />
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

      {/* COMBINED: the margins as columns, a total at the end, per class. */}
      {tab === COMBINED && day.pieces.length > 0 && (
        <div className="mt-3">
          {combined.map((cb) => (
            <div key={cb.badge} className="mb-4">
              <div className="mb-1.5 px-0.5 font-mono text-[13px] font-semibold text-text">{cb.title}</div>
              <div className="overflow-x-auto overscroll-x-contain rounded-2xl border border-border bg-surface">
                <div style={{ minWidth: combinedMin }}>
                  <div
                    className={`grid gap-1.5 border-b border-border px-2.5 py-2 ${TH}`}
                    style={{ gridTemplateColumns: combinedCols }}
                  >
                    <span />
                    <span>Crew</span>
                    {day.pieces.map((p) => (
                      <span key={p.id} className="truncate text-right">
                        {p.name}
                      </span>
                    ))}
                    <span className="text-right">Total</span>
                  </div>
                  {cb.rows.map((r, i) => {
                    const whole = r.raced === day.pieces.length;
                    return (
                      <div
                        key={r.boatId}
                        className={`grid items-center gap-1.5 px-2.5 py-2.5 ${i > 0 ? "border-t border-border" : ""}`}
                        style={{ gridTemplateColumns: combinedCols }}
                      >
                        <Rank rank={r.rank} faint={!whole} />
                        <CrewBoat crew={crewOf(day, r.boatId)} dim={r.raced === 0} />
                        {r.perPiece.map((m, k) => (
                          <span key={k} className="text-right text-[12px] tabular-nums text-muted">
                            {m == null ? "—" : formatMargin(m)}
                          </span>
                        ))}
                        <span
                          className={`text-right text-[13px] font-semibold tabular-nums ${whole ? "text-text" : "text-muted"}`}
                        >
                          {r.raced ? formatMargin(r.margins) : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
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
            write({
              ...day,
              pieces: day.pieces.filter((p) => p.id !== piece.id).map((p, i) => ({ ...p, name: `Piece ${i + 1}` })),
            });
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </Sheet>
  );
}

/* The crew as last written down in any piece — Combined has only the id.
   The latest piece wins, so a crew re-drawn during the day shows its newest
   seats. A piece's remark ("Bridge") is not the day's, so it is left off. */
function crewOf(day: RaceDay, boatId: string): RaceCrew {
  for (let i = day.pieces.length - 1; i >= 0; i--) {
    const c = day.pieces[i].crews.find((x) => x.boatId === boatId);
    if (c) return { ...c, note: "" };
  }
  return { boatId, label: boatId, badge: "", start: null, finish: null, total: null, note: "" };
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

  const field =
    "w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-base text-text outline-none placeholder:text-muted";

  return (
    <Sheet title={piece.name} onClose={onClose} full>
      <label className="block">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Piece</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className={`${field} mt-1`} />
      </label>

      <p className="mt-4 text-[12px] text-muted">
        Start and finish off the running watch, as on the sheet — 25:14.48. The overall time works itself out. No
        watch reading? Type the overall time instead.
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {crews.map((c, i) => {
          const time = crewTime({
            ...c,
            start: parseClock(c.startText),
            finish: parseClock(c.finishText),
            total: parseClock(c.totalText),
          });
          return (
            <div key={c.boatId} className="rounded-2xl border border-border bg-surface-2 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-text">{c.label}</div>
                  <div className="font-mono text-[11px] text-muted">{classTitle(c.badge)}</div>
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
                  <input
                    inputMode="decimal"
                    placeholder="mm:ss.hh"
                    value={c.startText}
                    onChange={(e) => update(i, { startText: e.target.value })}
                    className={`${field} mt-0.5 font-mono`}
                  />
                </label>
                <label className="block">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">Finish</span>
                  <input
                    inputMode="decimal"
                    placeholder="mm:ss.hh"
                    value={c.finishText}
                    onChange={(e) => update(i, { finishText: e.target.value })}
                    className={`${field} mt-0.5 font-mono`}
                  />
                </label>
                <label className="block">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">Overall</span>
                  <input
                    inputMode="decimal"
                    placeholder="mm:ss.hh"
                    value={c.totalText}
                    onChange={(e) => update(i, { totalText: e.target.value })}
                    className={`${field} mt-0.5 font-mono`}
                  />
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
                  {crewFromBoat(b).label} · {classTitle(b.badge)}
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

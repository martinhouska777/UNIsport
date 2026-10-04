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
  bordered chip, laid ACROSS the row and wrapping onto a second line when
  they run out of width (owner, 2026-09-21: "you can write it horizontally…
  it would be so much better because there is so much empty space. Maybe in
  height there won't be enough space, so then two lines"). On Combined the
  margins are COLUMNS — Piece 1, Piece 2, Total — smallest total on top; a
  piece the crew did not race is a dash, and nothing is written about it.
  There used to be an ATHLETES tab too — the same day read by person, each
  rower's average margin. It was removed (owner, 2026-10-01: "it will be in
  rankings for the workout anyway and in boats ranking"): the coach's
  Ranking reads the water by person across the month or semester, and the
  Switches tab says who beat whom.

  SEAT RACING LIVES HERE TOO (owner, 2026-10-01: "build the swap into
  workouts and remove seat races"). From the second piece on, the coach's
  Switch button lets two rowers of boats of the same class change places
  (SwitchSheet.tsx, raceSwitch.ts); the change carries into the pieces after
  it, whoever sits in a different boat than in the piece before is drawn red,
  and the switch itself is a red chip under its crew — read out of the crews,
  not typed. A Switches tab says who beat whom and by how much, worked out
  from the times: the coach's alone, like the rankings.

  IN THE COACH CONSOLE the board is also where the sheet is typed: Enter
  times opens the piece's crews with a Start and a Finish field each (the
  running watch, "25:14.48") — the time is worked out from them — and a note
  ("Bridge"). Crews are the session's lineup boats; one that did
  not race the piece is simply removed from it, and can be put back. New
  pieces come from the + at the end of the tabs, and start with the crews that
  rowed the last one. A rower sees the board, never the fields.

  THE CONSOLE WALK TIMES ONE FOR PRACTICE (lib/varsity/coachTour.ts). Its
  board is `practice`: everything works on screen — the tabs, Enter times,
  the wheels, Switch — and nothing is written, so the walk can open a real
  session's pieces and leave no race day behind (TeamWorkouts keeps it).

  Times are typed at 16px (the phone-zoom rule). All colours are theme
  tokens, except the cox's yellow, which is the same per-role identity colour
  the lineup card uses (COX_COLOR, from data — the documented rule-1
  exception).
*/
import { useEffect, useMemo, useRef, useState } from "react";
import Sheet from "@/components/varsity/Sheet";
import { IconPencil, IconPlus, IconSwap, IconTrash, IconX } from "@/components/icons";
import { rosterById, type Boat } from "@/lib/varsity/coachLineup";
import {
  classTitle,
  combinedBoards,
  crewFromBoat,
  crewsInClassOrder,
  crewTime,
  formatClock,
  formatMargin,
  formatWatch,
  freshCrew,
  newPiece,
  pieceAfter,
  pieceBoards,
  piecesStartAround,
  wheelStart,
  type RaceCrew,
  type RaceDay,
  type RacePiece,
  type WatchField,
} from "@/lib/varsity/racePieces";
import {
  folkNames,
  nameKey,
  secs,
  switchedIn,
  switchesOf,
  type BoatOf,
  type Switch,
} from "@/lib/varsity/raceSwitch";
import SwitchSheet from "@/components/varsity/team/SwitchSheet";
import SwitchResults from "@/components/varsity/team/SwitchResults";
import CrewBoat, { type SwitchChip } from "@/components/varsity/team/CrewBoat";
import { removeRaceDay, writeRaceDay } from "@/lib/varsity/raceStore";
import { saveFailureDetail, type SaveFailure } from "@/lib/saveFailure";
import SaveState from "@/components/varsity/coach/SaveState";
import RankBadge from "@/components/varsity/team/RankBadge";
import TimeSheet from "@/components/varsity/team/TimeSheet";
import ExampleTag from "@/components/varsity/ExampleTag";

const COMBINED = "combined";
const SWITCHES = "switches";

/* The header row of a list. */
const TH = "text-[9px] font-semibold uppercase tracking-[0.1em] text-muted";

/*
  THE BOARD IN INK, NOT IN THE SCHOOL'S COLOUR (owner, 2026-09-27: it was
  "just white"; then, of the two dressed-up looks, the table one — "all grey /
  black", because "just the swaps will be red"). So the session header is a
  black band, the class a black pill, the places round badges with the winner's
  in black (RankBadge.tsx, shared with the coach's rankings), and the winning
  row a light grey. The switches are the only red on the screen, which is what
  makes them read.
*/
function ClassTitle({ title, withButton }: { title: string; withButton?: boolean }) {
  return (
    <div className={withButton ? "mb-1.5 flex min-h-8 items-center" : "mb-1.5"}>
      <span className="inline-flex rounded-md bg-text px-2 py-0.5 font-mono text-[12px] font-semibold text-background">{title}</span>
    </div>
  );
}

/*
  THE SWITCHES THAT FOLLOW A PIECE, AS CHIPS UNDER ITS CREWS. Each switch hangs
  under ONE of its two crews — whichever the board lists first — so it is
  written once, with its answer after it for the coach: "HK 1.1 s faster".
  Returns the chips by boat, and every name they mention (for `covered`).
*/
function switchChips(
  after: Switch[],
  order: Map<string, number>,
  showResult: boolean,
  fullName: (id: string) => string | undefined,
): { byBoat: Map<string, SwitchChip[]>; covered: Set<string> } {
  const byBoat = new Map<string, SwitchChip[]>();
  const covered = new Set<string>();
  for (const s of after) {
    for (const f of [...s.moved[0], ...s.moved[1]]) covered.add(nameKey(f.name));
    const said =
      showResult && s.result.kind === "won"
        ? `${folkNames(s.result.winners, s.result.losers, fullName)} ${secs(s.result.by)} s faster`
        : showResult && s.result.kind === "level"
          ? "level"
          : undefined;
    const carrier =
      (order.get(s.boats[0]) ?? 0) <= (order.get(s.boats[1]) ?? 0) ? s.boats[0] : s.boats[1];
    const list = byBoat.get(carrier) ?? [];
    list.push({
      left: folkNames(s.moved[0], s.moved[1], fullName),
      right: folkNames(s.moved[1], s.moved[0], fullName),
      said,
    });
    byBoat.set(carrier, list);
  }
  return { byBoat, covered };
}

export default function RaceBoard({
  day,
  dateLabel,
  title,
  sessionTime,
  boats,
  inConsole = false,
  openOnSwitches = false,
  focus,
  practice = false,
  example = false,
  onChange,
  onDeleted,
  onClose,
}: {
  day: RaceDay;
  /** "Tue 15 Sep · AM" */
  dateLabel: string;
  /** The plan's words for the session — "2×2k open rate, small boats". */
  title: string;
  /** When the session starts ("7:00 AM"), so the first time on the wheel is
      about when the pieces do. */
  sessionTime?: string;
  /** The session's lineup boats, so a crew can be added to a piece. */
  boats: Boat[];
  inConsole?: boolean;
  /** Open on the Switches tab — the board was opened from the coach's list
      of seat races (TeamRanking), so it starts where that list left off. */
  openOnSwitches?: boolean;
  /** The seat race that was tapped there, by its place in switchesOf: it is
      outlined on the Switches tab. */
  focus?: number;
  /** The console walk's run: on screen only, never saved (see the note up top). */
  practice?: boolean;
  /** The walk's made-up race, for a squad with nothing to time: it says so. */
  example?: boolean;
  /** The day as saved, so the list behind stays current. */
  onChange: (day: RaceDay) => void;
  onDeleted: () => void;
  onClose: () => void;
}) {
  const [picked, setTab] = useState<string>(openOnSwitches ? SWITCHES : (day.pieces[0]?.id ?? COMBINED));
  /* Opened on Switches, the tab row starts scrolled to its end, so the tab
     that is lit is in sight — on a phone it is past the edge otherwise. */
  const tabRow = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = tabRow.current;
    if (openOnSwitches && row) row.scrollLeft = row.scrollWidth;
  }, [openOnSwitches]);
  const [editing, setEditing] = useState<string | null>(null);
  /* The piece whose crews are being switched about (SwitchSheet). */
  const [switching, setSwitching] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  /*
    A WRITE THAT DID NOT LAND (audit, 2026-09-27). The times went on screen at
    once and stayed there when the save failed, under a line blaming
    permissions — even when it was one bar of signal at the dock. Now:
      • the entry stays on screen, marked Not saved with the real reason
        (lib/saveFailure.ts) and a Retry, so nothing typed is thrown away;
      • closing the board while it is unsaved puts the list behind back to
        what the database actually holds, so nothing looks saved that is not.
    `savedDay` is that last confirmed copy; `writes` numbers the requests, so
    an older one landing late never overrules a newer one.
  */
  const [failure, setFailure] = useState<{ kind: SaveFailure; day: RaceDay } | null>(null);
  const [deleteFailed, setDeleteFailed] = useState<SaveFailure | null>(null);
  const savedDay = useRef(day);
  const writes = useRef(0);
  const closed = useRef(false);

  const write = async (next: RaceDay) => {
    onChange(next); // on screen at once — the coach is typing at the dock
    if (practice) return; // the walk's board keeps nothing
    const mine = ++writes.current;
    const why = await writeRaceDay(next);
    if (mine !== writes.current) return; // a newer write has the last word
    if (!why) {
      savedDay.current = next;
      setFailure(null);
      return;
    }
    // Already closed while this was in the air: put the list back.
    if (closed.current) onChange(savedDay.current);
    else setFailure({ kind: why, day: next });
  };

  const close = () => {
    closed.current = true;
    if (failure) onChange(savedDay.current);
    onClose();
  };
  const deleteWhy = deleteFailed ? saveFailureDetail(deleteFailed, "only a coach can delete") : null;

  const addPiece = () => {
    /* The next piece starts with the crews that rowed the last one, so a
       switch made earlier is not quietly undone; the lineup is the start
       only when there is nothing before it. */
    const last = day.pieces[day.pieces.length - 1];
    const piece =
      last && last.crews.length > 0 ? pieceAfter(last, day.pieces.length + 1) : newPiece(day.pieces.length + 1, boats);
    write({ ...day, pieces: [...day.pieces, piece] });
    setTab(piece.id);
    setEditing(piece.id);
  };

  /*
    ONE BOAT IS NOT A RACE (owner, 2026-09-27: "if there is just one boat,
    then you don't need to do a leaderboard there"). A class with a single
    crew — the eight, most mornings — is left off Combined, where it could
    only ever be "1st, 0.00"; on a piece it is the crew and its time. A day
    with no class of two or more has no Combined at all.
  */
  const allCombined = useMemo(() => combinedBoards(day.pieces), [day.pieces]);
  const raced = new Set(allCombined.filter((cb) => cb.rows.length > 1).map((cb) => cb.badge));
  const combined = allCombined.filter((cb) => raced.has(cb.badge));
  const ranked = raced.size > 0;

  /* THE SWITCHES of the day, read out of the crews (raceSwitch.ts). Who a
     rower is comes from the session's lineup boat where there is one. */
  const boatOf = useMemo<BoatOf>(() => (crew) => boats.find((b) => b.id === crew.boatId), [boats]);
  const switches = useMemo(() => switchesOf(day, boatOf), [day, boatOf]);
  /* Their results are the coach's, like the rankings: a rower sees the red
     names and chips but never a tab that says who beat whom. */
  const showSwitches = inConsole && switches.length > 0;

  // A piece deleted from under the open tab — or Combined on a day that no
  // longer has one: the first piece left is shown.
  const tab =
    (picked === COMBINED && ranked) ||
    (picked === SWITCHES && showSwitches) ||
    day.pieces.some((p) => p.id === picked)
      ? picked
      : (day.pieces[0]?.id ?? COMBINED);
  const piece = day.pieces.find((p) => p.id === tab) ?? null;
  /* This piece's place in the day: what it follows, the red names, and the
     chips of the switches that come after it. */
  const pi = piece ? day.pieces.findIndex((p) => p.id === piece.id) : -1;
  const boards = piece ? pieceBoards(piece) : [];
  const red = piece ? switchedIn(day, pi, boatOf) : undefined;
  const order = new Map<string, number>();
  for (const cb of boards) for (const c of [...cb.rows.map((r) => r.crew), ...cb.pending]) order.set(c.boatId, order.size);
  const { byBoat, covered } = switchChips(
    switches.filter((s) => s.piece === pi),
    order,
    inConsole,
    (id) => rosterById[id]?.name,
  );

  /*
    Combined's columns: the crew, one column per piece, and Total — one line
    per crew, as on a piece. The crew is given room for a couple of names
    side by side before the list starts scrolling sideways under the thumb;
    past that the names wrap, rather than being squeezed to nothing.
  */
  const n = day.pieces.length;
  const combinedCols = `1.25rem minmax(0,1fr) repeat(${n}, 3.6rem) 3.9rem`;
  const combinedMin = `${1.25 + 9 + n * 3.6 + 3.9 + (n + 2) * 0.375 + 1.25}rem`;

  return (
    <Sheet title="" onClose={close} full backTour="coach-race-back">
      {/* The walk points at Switch, which only a second piece has. */}
      {practice && day.pieces.length < 2 && <span hidden data-tour-absent="coach-race-switch" />}
      {/* THE SESSION — a black band: the date over the plan's words (see THE
          BOARD IN INK). The piece count that used to sit under it is gone;
          the tabs already say it. */}
      <div className="rounded-2xl bg-text px-4 py-3.5 text-background shadow-card">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-70">{dateLabel}</div>
          {example && <ExampleTag />}
        </div>
        <div className="mt-0.5 text-[16px] font-semibold leading-snug">{title || "Race pieces"}</div>
      </div>

      {/* PIECE 1 | PIECE 2 | COMBINED — and, for the coach, a + for the next one.
          A plain row of tabs that swipes sideways when it runs out of room,
          with no scroll bar under it (owner, 2026-10-01: "just a tab bar",
          not a website's scroll bar with arrows). It moves sideways only:
          the buttons' 44px touch area poked 2px out of the bottom of the row,
          which let it be nudged up and down, so the row is 2px taller (pb-1.5)
          and its vertical overflow is shut. */}
      <div ref={tabRow} data-tour="coach-race-tabs" className="chip-row mt-3 flex items-center gap-1.5 overflow-x-auto overflow-y-hidden pb-1.5">
        {day.pieces.map((p, k) => (
          <TabButton key={p.id} on={tab === p.id} onClick={() => setTab(p.id)} tour={k === 1 ? "coach-race-tab-2" : undefined}>
            {p.name}
          </TabButton>
        ))}
        {day.pieces.length > 0 && ranked && (
          <TabButton on={tab === COMBINED} onClick={() => setTab(COMBINED)}>
            Combined
          </TabButton>
        )}
        {showSwitches && (
          <TabButton on={tab === SWITCHES} onClick={() => setTab(SWITCHES)}>
            Switches
          </TabButton>
        )}
        {/* The coach's + is filled in the school's colour (owner, 2026-10-01:
            "make the + red in the water part") — the board's one button
            in colour besides the red of the switches. */}
        {inConsole && (
          <button
            type="button"
            onClick={addPiece}
            aria-label="Add a piece"
            className="tap44 press-icon flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-contrast"
          >
            <IconPlus size={14} />
          </button>
        )}
      </div>

      {failure && (
        <div className="mt-2">
          <SaveState
            status="error"
            detail={saveFailureDetail(failure.kind, "only a coach can write times")}
            onRetry={() => void write(failure.day)}
          />
        </div>
      )}

      {day.pieces.length === 0 && (
        <div className="mt-3 rounded-2xl border border-dashed border-border bg-surface px-4 py-8 text-center text-[12px] text-muted">
          {inConsole ? "No pieces yet — tap + to add the first one." : "No pieces timed yet."}
        </div>
      )}

      {/* ONE PIECE: a list per class — 4+, then 2−. */}
      {piece && (
        <div className="relative mt-3">
          {inConsole && (
            <div className="absolute right-0 top-0 flex items-center gap-1.5">
              {/* A switch is made BETWEEN pieces, so there is nothing to
                  switch from in the first one. */}
              {pi > 0 && (
                <button
                  type="button"
                  onClick={() => setSwitching(piece.id)}
                  data-tour="coach-race-switch"
                  className="tap44 flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[12px] font-medium text-text"
                >
                  <IconSwap size={13} /> Switch
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditing(piece.id)}
                data-tour="coach-race-enter-times"
                className="tap44 flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[12px] font-medium text-text"
              >
                <IconPencil size={13} /> Enter times
              </button>
            </div>
          )}
          {boards.map((cb, bi) =>
            cb.rows.length + cb.pending.length === 1 ? (
              /* The only boat in its class: the crew and its time, with no
                 place and no gap to a winner (see ONE BOAT above). */
              <div key={cb.badge} data-tour={bi === 0 ? "coach-race-first-class" : undefined} className="mb-4">
                <ClassTitle title={cb.title} withButton={inConsole && bi === 0} />
                <div className={`flex items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-3 shadow-card`}>
                  <div className="min-w-0 flex-1">
                    <CrewBoat crew={cb.rows[0]?.crew ?? cb.pending[0]} dim={!cb.rows[0]} red={red} covered={covered} />
                  </div>
                  {cb.rows[0] ? (
                    <span className="flex-shrink-0 text-[13px] font-semibold tabular-nums text-text">
                      {formatClock(cb.rows[0].time)}
                    </span>
                  ) : (
                    <span className="flex-shrink-0 text-[11px] text-muted">no time yet</span>
                  )}
                </div>
              </div>
            ) : (
            <div key={cb.badge} data-tour={bi === 0 ? "coach-race-first-class" : undefined} className="mb-4">
              <ClassTitle title={cb.title} withButton={inConsole && bi === 0} />
              <div className={`overflow-hidden rounded-2xl border border-border bg-surface shadow-card`}>
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
                    } ${r.rank === 1 ? "bg-surface-2" : ""}`}
                  >
                    <RankBadge rank={r.rank} />
                    <CrewBoat crew={r.crew} red={red} chips={byBoat.get(r.crew.boatId)} covered={covered} />
                    <span className={`text-right text-[13px] font-semibold tabular-nums text-text`}>{formatClock(r.time)}</span>
                    <span className="text-right text-[12px] tabular-nums text-muted">{r.rank === 1 ? "" : formatMargin(r.toWinner)}</span>
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
                    <CrewBoat crew={c} dim red={red} chips={byBoat.get(c.boatId)} covered={covered} />
                    <span className="text-[11px] text-muted">no time yet</span>
                  </div>
                ))}
                {cb.rows.length === 0 && cb.pending.length === 0 && (
                  <div className="px-3 py-4 text-center text-[12px] text-muted">No crews.</div>
                )}
              </div>
            </div>
            ),
          )}
          {piece.crews.length === 0 && (
            <div className={`rounded-2xl border border-dashed border-border bg-surface px-4 py-8 text-center text-[12px] text-muted ${inConsole ? "mt-10" : ""}`}>
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
              <ClassTitle title={cb.title} />
              <div className={`overflow-x-auto overscroll-x-contain rounded-2xl border border-border bg-surface shadow-card`}>
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
                        key={r.key}
                        className={`grid items-center gap-1.5 px-2.5 py-2.5 ${i > 0 ? "border-t border-border" : ""} ${r.rank === 1 && whole ? "bg-surface-2" : ""}`}
                        style={{ gridTemplateColumns: combinedCols }}
                      >
                        <RankBadge rank={r.rank} faint={!whole} />
                        <CrewBoat crew={r.crew} dim={r.raced === 0} />
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

      {/* SWITCHES: who beat whom, from the times. The coach's alone. */}
      {tab === SWITCHES && showSwitches && <SwitchResults switches={switches} pieces={day.pieces} focus={focus} />}

      {/* THE COACH'S WAY OUT OF A WRONG DAY. (The walk's has nothing to delete.) */}
      {inConsole && !practice && (
        <div className="mt-6 flex justify-center">
          {confirmDelete ? (
            <div className="flex flex-wrap items-center justify-center gap-2 text-[12px]">
              {deleteFailed ? (
                <span className="font-semibold text-danger" role="alert">
                  {deleteWhy ? `Not deleted · ${deleteWhy}` : "Not deleted"}
                </span>
              ) : (
                <span className="text-muted">Delete every piece of this session?</span>
              )}
              <button
                type="button"
                onClick={async () => {
                  const why = await removeRaceDay(day.dayKey);
                  if (!why) onDeleted();
                  else setDeleteFailed(why);
                }}
                className="tap44 rounded-full border border-border bg-surface-2 px-3 py-1.5 font-medium text-danger"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmDelete(false);
                  setDeleteFailed(null);
                }}
                className="tap44 px-2 py-1.5 text-muted"
              >
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

      {switching && day.pieces.some((p) => p.id === switching) && (
        <SwitchSheet
          day={day}
          k={day.pieces.findIndex((p) => p.id === switching)}
          boatOf={boatOf}
          onChange={(next) => void write(next)}
          onClose={() => setSwitching(null)}
        />
      )}

      {editing && piece && editing === piece.id && (
        <PieceEditor
          piece={piece}
          earlier={day.pieces[day.pieces.findIndex((p) => p.id === piece.id) - 1] ?? null}
          around={piecesStartAround(sessionTime)}
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

function TabButton({
  on,
  onClick,
  tour,
  children,
}: {
  on: boolean;
  onClick: () => void;
  tour?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-tour={tour}
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

/*
  THE SHEET OF TIMES (owner, 2026-09-28: "make the note optional, the note
  takes up so much space… cut that small part on the top, the text, and make
  the UI a little better so it's not just white things").

  A crew is drawn as its BOAT under its class's black pill, the board's own
  look, with two tiles to fill — START and FINISH off the watch — and the TIME
  they make beside them, which fills itself in, in black, once both are there,
  so a glance down the sheet says which boats are done. The Time is never
  typed (owner, 2026-09-29: "I just want start and finish and the time will
  come from it"); it used to be a third tile a coach could tap to write an
  overall time straight in, and that is gone. An empty tile is dashed. A tap
  on Start or Finish opens TimeSheet, the wheels and the digits, and its Next
  walks the sheet in the order it is drawn: a boat's start, its finish, the
  next boat's start.

  The note is a small "+ Note" until it is wanted; a note already written
  stays open. The paragraph that sat on top ("Start and finish off the
  running watch, as on the sheet…") is gone, and the piece's name is the
  heading itself, typed into in place. Save rides at the bottom of the screen
  all the way down, so a coach who has just typed a whole piece does not have
  to go looking for it.
*/
type Picking = { boatId: string; field: WatchField };
const FIELD_WORD: Record<WatchField, string> = { start: "Start", finish: "Finish" };

/* One of a crew's times: dashed while empty, grey once written, black when it
   is the time the watch readings make; red when the finish is not after the
   start. */
function TimeTile({
  word,
  value,
  on = false,
  result = false,
  wrong = false,
  tour,
  onTap,
}: {
  word: string;
  value: number | null;
  on?: boolean;
  result?: boolean;
  wrong?: boolean;
  tour?: string;
  onTap?: () => void;
}) {
  const look = result
    ? "bg-text text-background"
    : wrong
      ? "border border-dashed border-danger text-danger"
      : value == null
        ? "border border-dashed border-faint/50 text-muted"
        : "bg-surface-2 text-text";
  const cls = `mt-1 flex h-10 w-full items-center justify-center rounded-xl px-1 font-mono text-[14px] font-semibold tabular-nums ${look} ${
    on ? "ring-2 ring-text ring-offset-2 ring-offset-surface" : ""
  }`;
  const shown = value == null ? "–:––.–" : formatWatch(value);
  return (
    <div className="min-w-0">
      <div className={`pl-0.5 ${TH}`}>{word}</div>
      {onTap ? (
        <button type="button" onClick={onTap} data-tour={tour} aria-label={`${word}: ${value == null ? "empty" : shown}`} className={cls}>
          {shown}
        </button>
      ) : (
        <div className={cls}>{shown}</div>
      )}
    </div>
  );
}

function PieceEditor({
  piece,
  earlier,
  around,
  boats,
  onSave,
  onDelete,
  onClose,
}: {
  piece: RacePiece;
  /** The piece before this one, where the next start is looked for. */
  earlier: RacePiece | null;
  /** The session's time plus the warm-up, where the first start is looked for. */
  around: number | null;
  boats: Boat[];
  onSave: (piece: RacePiece) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(piece.name);
  const [crews, setCrews] = useState<RaceCrew[]>(piece.crews);
  const [adding, setAdding] = useState(false);
  /*
    DELETING A PIECE ASKS FIRST (owner, 2026-09-22: "accidentally deleted the
    piece"). It used to go on one tap, and it takes every time typed into it
    with it: the day is one JSON blob with no history, so there is nothing to
    undo it from. Deleting the whole SESSION already armed like this — the one
    that destroys less was the one that did not.
  */
  const [armed, setArmed] = useState(false);
  /* The crews whose note is open: every one that has a note, and one the
     coach has just asked for (that one takes the keyboard straight away). */
  const [noted, setNoted] = useState<Set<string>>(
    () => new Set(piece.crews.filter((c) => c.note.trim()).map((c) => c.boatId)),
  );
  const [asked, setAsked] = useState<string | null>(null);
  const [picking, setPicking] = useState<Picking | null>(null);

  const notIn = boats.filter((b) => !crews.some((c) => c.boatId === b.id));
  const listed = crewsInClassOrder(crews);

  const update = (boatId: string, patch: Partial<RaceCrew>) =>
    setCrews((cs) => cs.map((c) => (c.boatId === boatId ? { ...c, ...patch } : c)));

  /* What Next goes to: a start's finish, then the next boat's start. */
  const after = (p: Picking): Picking | null => {
    if (p.field === "start") return { boatId: p.boatId, field: "finish" };
    const next = listed[listed.findIndex((c) => c.boatId === p.boatId) + 1];
    return next ? { boatId: next.boatId, field: "start" } : null;
  };

  const save = () => {
    onSave({
      id: piece.id,
      name: name.trim() || piece.name,
      crews: crews.map((c) => ({ ...c, note: c.note.trim() })),
    });
  };

  /* Class by class, as the board draws them. */
  const groups: { badge: string; crews: RaceCrew[] }[] = [];
  for (const c of listed) {
    const g = groups[groups.length - 1];
    if (g && g.badge === c.badge) g.crews.push(c);
    else groups.push({ badge: c.badge, crews: [c] });
  }

  const picked = picking ? (crews.find((c) => c.boatId === picking.boatId) ?? null) : null;
  const isOn = (c: RaceCrew, field: WatchField) => picking?.boatId === c.boatId && picking.field === field;

  return (
    <Sheet title="" onClose={onClose} full backTour="coach-race-editor-back">
      {/* The piece's name IS the heading, typed into where it stands. */}
      <label className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Piece name"
          className="min-w-0 flex-1 bg-transparent text-[20px] font-bold text-text outline-none"
        />
        <span className="flex-shrink-0 text-muted">
          <IconPencil size={14} />
        </span>
      </label>

      {groups.map((g, gi) => (
        <div key={g.badge} className="mt-4">
          <ClassTitle title={classTitle(g.badge)} />
          <div className="flex flex-col gap-2">
            {g.crews.map((c, ci) => {
              const watched = c.start != null && c.finish != null;
              // The console walk lights the first crew and presses its Start.
              const first = gi === 0 && ci === 0;
              return (
                <div
                  key={c.boatId}
                  data-tour={first ? "coach-race-first-crew" : undefined}
                  className="rounded-2xl border border-border bg-surface p-3 shadow-card"
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      {/* The note is typed below, so it is not drawn here too. */}
                      <CrewBoat crew={{ ...c, note: "" }} />
                    </div>
                    <button
                      type="button"
                      onClick={() => setCrews((cs) => cs.filter((x) => x.boatId !== c.boatId))}
                      aria-label={`Take ${c.label} out of this piece`}
                      className="tap44 press-icon -mr-1 -mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-muted"
                    >
                      <IconX size={13} />
                    </button>
                  </div>
                  <div className="mt-2.5 grid grid-cols-3 gap-2">
                    <TimeTile
                      word="Start"
                      value={c.start}
                      on={isOn(c, "start")}
                      tour={first ? "coach-race-start-first" : undefined}
                      onTap={() => setPicking({ boatId: c.boatId, field: "start" })}
                    />
                    <TimeTile
                      word="Finish"
                      value={c.finish}
                      wrong={watched && c.finish! <= c.start!}
                      on={isOn(c, "finish")}
                      onTap={() => setPicking({ boatId: c.boatId, field: "finish" })}
                    />
                    {/* Worked out, never typed: black once there is a time, a
                        plain dash before that (not a box, so it does not read
                        as a third thing to fill in). */}
                    {crewTime(c) != null ? (
                      <TimeTile word="Time" value={crewTime(c)} result={watched} />
                    ) : (
                      <div className="min-w-0">
                        <div className={`pl-0.5 ${TH}`}>Time</div>
                        <div className="mt-1 flex h-10 items-center justify-center font-mono text-[14px] text-muted">–:––.–</div>
                      </div>
                    )}
                  </div>
                  {noted.has(c.boatId) ? (
                    <input
                      value={c.note}
                      onChange={(e) => update(c.boatId, { note: e.target.value })}
                      autoFocus={asked === c.boatId}
                      placeholder="Note"
                      className="mt-2.5 block w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-base text-text outline-none placeholder:text-faint"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setNoted((s) => new Set(s).add(c.boatId));
                        setAsked(c.boatId);
                      }}
                      className="tap44 mt-2.5 inline-flex h-7 items-center gap-1 rounded-lg border border-dashed border-faint/50 px-2.5 text-[12px] font-medium text-muted"
                    >
                      <IconPlus size={12} /> Note
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* A crew that is in the lineup but not (yet) in this piece. */}
      {notIn.length > 0 && (
        <div className="mt-4">
          {adding ? (
            <div className="flex flex-wrap gap-1.5">
              {notIn.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    /* Back in with the people it had in the piece before —
                       the lineup's seats are where the day began. */
                    const carried = earlier?.crews.find((c) => c.boatId === b.id);
                    setCrews((cs) => [...cs, carried ? freshCrew(carried) : crewFromBoat(b)]);
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

      {/* -bottom-8 is the full sheet's own bottom padding (pb-8): a sticky
          bar stops that far short of the edge otherwise, with the list
          showing through underneath it. */}
      <div className="sticky -bottom-8 -mx-4 mt-6 flex items-center justify-between gap-3 border-t border-border bg-background px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        {armed ? (
          <div className="flex min-w-0 items-center gap-2 text-[12px]">
            {/* It names the piece, and says what goes with it: the times are
                the work, and they are what a coach would not expect a tap on
                a grey word to throw away. */}
            <span className="min-w-0 text-muted">Delete {piece.name} and its times?</span>
            <button
              type="button"
              onClick={onDelete}
              className="tap44 flex-shrink-0 rounded-full border border-border bg-surface-2 px-3 py-1.5 font-medium text-danger"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setArmed(false)}
              className="tap44 flex-shrink-0 px-2 py-1.5 text-muted"
            >
              Keep
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setArmed(true)}
            className="tap44 flex items-center gap-1.5 text-[12px] text-muted"
          >
            <IconTrash size={13} /> Delete this piece
          </button>
        )}
        <button
          type="button"
          onClick={save}
          className="tap44 flex-shrink-0 rounded-full bg-primary px-5 py-2.5 text-[13px] font-semibold text-primary-contrast"
        >
          Save times
        </button>
      </div>

      {picking && picked && (
        <TimeSheet
          fieldKey={`${picking.boatId}:${picking.field}`}
          who={picked.label}
          badge={picked.badge}
          what={FIELD_WORD[picking.field]}
          value={picked[picking.field]}
          from={wheelStart(
            listed,
            listed.findIndex((c) => c.boatId === picked.boatId),
            picking.field,
            earlier,
            around,
          )}
          last={after(picking) === null}
          onSet={(v, then) => {
            update(picked.boatId, { [picking.field]: v });
            if (then === "next") setPicking(after(picking));
            else if (then === "done") setPicking(null);
          }}
          onClose={() => setPicking(null)}
        />
      )}
    </Sheet>
  );
}

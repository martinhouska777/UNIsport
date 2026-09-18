"use client";

/*
  SEAT RACES — the second half of the console's Team tab (owner, 2026-09-18),
  in the app's own boat style for every school: a practice's lineup, then
  Piece 1, 2, 3 … each with every boat's time and crew, the switches made
  after it, and the rowers who just switched shown in red.
  Boats come ONLY from that day's lineup — nothing is made up here.
  Data and the maths: lib/varsity/seatRace.ts. All colours are theme tokens.
*/
import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Sheet from "@/components/varsity/Sheet";
import {
  IconChevronDown,
  IconChevronUp,
  IconPlus,
  IconSwap,
  IconX,
} from "@/components/icons";
import {
  COX_COLOR,
  defaultBoatName,
  type Boat,
} from "@/lib/varsity/coachLineup";
import { sessionKey } from "@/lib/varsity/coachPlan";
import { fetchLineup } from "@/lib/varsity/lineupStore";
import {
  boatAt,
  crewsAt,
  deleteSeatRace,
  formatTime,
  lead,
  loadSeatRaces,
  nameOf,
  parseTime,
  placesAt,
  saveSeatRace,
  standings,
  surname,
  swappedInto,
  swapResults,
  type RaceBoat,
  type SeatRace,
  type SwapPair,
} from "@/lib/varsity/seatRace";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const dayLabel = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
const secs = (n: number) => `${n.toFixed(1)} s`;

/* What the sheet calls a boat: the coach's name for it, else the cox, else the stroke. */
const fromLineup = (b: Boat): RaceBoat => {
  const seats = b.seats.map((s) => s.athleteId);
  const coxId = b.hasCox ? b.coxId : null;
  const named = b.name && b.name !== defaultBoatName(b.badge) ? b.name : "";
  const stroke = [...seats].reverse().find(Boolean) ?? null;
  return {
    name:
      named || (coxId ? surname(coxId) : stroke ? surname(stroke) : b.badge),
    badge: b.badge,
    seats,
    coxId,
  };
};

const blankPiece = (boats: number) => ({
  times: Array<number | null>(boats).fill(null),
  swaps: [] as SwapPair[],
});

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
      {children}
    </div>
  );
}

/* ─────────────────────────  list  ───────────────────────── */

export default function SeatRacesScreen() {
  // Lazy read is safe: this only mounts after the membership has loaded, in the browser.
  const [races, setRaces] = useState<SeatRace[]>(loadSeatRaces);
  const [editing, setEditing] = useState<SeatRace | null>(null);
  const [who, setWho] = useState<string | null>(null);

  const table = useMemo(() => standings(races), [races]);
  // One line per switch, newest race first.
  const rows = races
    .flatMap((r) => swapResults(r).map((res) => ({ r, res })))
    .filter((x) => !who || x.res.pair.includes(who));

  const newRace = (): SeatRace => ({
    id: `sr-${Date.now()}`,
    date: today(),
    period: "AM",
    piece: "",
    boats: [],
    pieces: [],
  });

  return (
    <div className="mx-auto w-full max-w-screen-sm px-4 pb-10 pt-4">
      <Button full onClick={() => setEditing(newRace())}>
        New seat race
      </Button>

      {table.length > 0 && (
        <div className="mt-6">
          <Label>Rowers</Label>
          <div className="flex flex-col gap-1.5">
            {table.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setWho(who === t.id ? null : t.id)}
                className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left ${
                  who === t.id
                    ? "border-primary-line bg-primary-tint"
                    : "border-border bg-surface"
                }`}
              >
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text">
                  {nameOf(t.id)}
                </span>
                <span className="text-[13px] tabular-nums text-success">
                  {t.won} W
                </span>
                <span className="w-9 text-right text-[13px] tabular-nums text-danger">
                  {t.lost} L
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-6">
          <Label>{who ? nameOf(who) : "Races"}</Label>
          <div className="flex flex-col gap-1.5">
            {rows.map(({ r, res }, n) => {
              const mine =
                who && res.winner ? (res.winner === who ? "W" : "L") : null;
              const badge = r.boats[boatAt(r, res.piece, res.pair[0])]?.badge;
              return (
                <button
                  key={`${r.id}-${n}`}
                  type="button"
                  onClick={() => setEditing(r)}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-left"
                >
                  {mine && (
                    <span
                      className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                        mine === "W"
                          ? "bg-success-tint text-success"
                          : "bg-danger-tint text-danger"
                      }`}
                    >
                      {mine}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-text">
                      {res.winner
                        ? `${nameOf(res.winner)} beat ${nameOf(res.loser)}`
                        : `${nameOf(res.pair[0])} vs ${nameOf(res.pair[1])}`}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted">
                      {[dayLabel(r.date), r.period, badge, r.piece]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="flex-shrink-0 text-[13px] tabular-nums text-muted">
                    {res.by == null
                      ? "—"
                      : res.winner
                        ? `+${secs(res.by)}`
                        : "Level"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {editing && (
        <SeatRaceEditor
          initial={editing}
          isNew={!races.some((r) => r.id === editing.id)}
          onClose={() => setEditing(null)}
          onSave={(r) => {
            setRaces(saveSeatRace(r));
            setEditing(null);
          }}
          onDelete={(id) => {
            setRaces(deleteSeatRace(id));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

/* ─────────────────────────  editor  ───────────────────────── */

function SeatRaceEditor({
  initial,
  isNew,
  onClose,
  onSave,
  onDelete,
}: {
  initial: SeatRace;
  isNew: boolean;
  onClose: () => void;
  onSave: (r: SeatRace) => void;
  onDelete: (id: string) => void;
}) {
  const [r, setR] = useState<SeatRace>(initial);
  // What the coach typed, per piece per boat — kept as text so "4:2" can be half-typed.
  const [texts, setTexts] = useState<string[][]>(() =>
    initial.pieces.map((p) =>
      p.times.map((t) => (t == null ? "" : formatTime(t))),
    ),
  );
  const [switching, setSwitching] = useState<number | null>(null); // piece whose switches are being picked
  // Boats folded to one line of names — the same boats in every piece.
  const [folded, setFolded] = useState<Set<number>>(() => new Set());
  const toggleFold = (bi: number) =>
    setFolded((prev) => {
      const next = new Set(prev);
      if (next.has(bi)) next.delete(bi);
      else next.add(bi);
      return next;
    });
  const [first, setFirst] = useState<string | null>(null); // first rower tapped
  const [noLineup, setNoLineup] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // That day's lineups — the only place boats come from.
  const [lineups, setLineups] = useState<Partial<
    Record<"AM" | "PM", Boat[]>
  > | null>(null);

  useEffect(() => {
    let active = true;
    const d = new Date(`${r.date}T12:00:00`);
    Promise.all([
      fetchLineup(sessionKey(d, "AM")),
      fetchLineup(sessionKey(d, "PM")),
    ]).then(([am, pm]) => {
      if (!active) return;
      const out: Partial<Record<"AM" | "PM", Boat[]>> = {};
      if (am?.boats.length) out.AM = am.boats;
      if (pm?.boats.length) out.PM = pm.boats;
      setLineups(out);
    });
    return () => {
      active = false;
    };
  }, [r.date]);

  const pickLineup = (period: "AM" | "PM") => {
    const boats = (lineups?.[period] ?? []).map(fromLineup);
    setR({ ...r, period, boats, pieces: [blankPiece(boats.length)] });
    setTexts([boats.map(() => "")]);
    setSwitching(null);
    setFirst(null);
    setNoLineup(false);
    setFolded(new Set());
  };

  const addPiece = () => {
    setR({ ...r, pieces: [...r.pieces, blankPiece(r.boats.length)] });
    setTexts([...texts, r.boats.map(() => "")]);
  };

  const removeLastPiece = () => {
    setR({ ...r, pieces: r.pieces.slice(0, -1) });
    setTexts(texts.slice(0, -1));
    if (switching != null && switching >= r.pieces.length - 1)
      setSwitching(null);
  };

  const setTime = (k: number, b: number, s: string) => {
    setTexts(
      texts.map((row, i) =>
        i === k ? row.map((v, j) => (j === b ? s : v)) : row,
      ),
    );
    setR({
      ...r,
      pieces: r.pieces.map((p, i) =>
        i === k
          ? { ...p, times: p.times.map((v, j) => (j === b ? parseTime(s) : v)) }
          : p,
      ),
    });
  };

  const setSwaps = (k: number, swaps: SwapPair[]) =>
    setR({
      ...r,
      pieces: r.pieces.map((p, i) => (i === k ? { ...p, swaps } : p)),
    });

  /* Picking a switch after piece k: tap one rower, then one in another boat. */
  const tapRower = (k: number, id: string) => {
    if (switching !== k) return;
    const swaps = r.pieces[k].swaps;
    if (swaps.some((p) => p.includes(id))) return;
    if (first === id) return setFirst(null);
    if (first && boatAt(r, k, first) !== boatAt(r, k, id)) {
      setSwaps(k, [...swaps, [first, id]]);
      setFirst(null);
      return;
    }
    setFirst(id);
  };

  const results = swapResults(r);
  const lineupChips = (["AM", "PM"] as const).filter((p) => lineups?.[p]);

  return (
    <Sheet full title={isNew ? "New seat race" : "Seat race"} onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          value={r.date}
          onChange={(e) => setR({ ...r, date: e.target.value || r.date })}
          aria-label="Date"
          className="min-w-0 rounded-xl border border-border bg-surface px-3 py-2 text-base text-text"
        />
        <input
          value={r.piece}
          onChange={(e) => setR({ ...r, piece: e.target.value })}
          placeholder="1500 m"
          aria-label="Piece"
          className="min-w-0 rounded-xl border border-border bg-surface px-3 py-2 text-base text-text placeholder:text-muted"
        />
      </div>

      {/* Which lineup */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {lineupChips.map((p) => {
          const on = r.boats.length > 0 && r.period === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => pickLineup(p)}
              className={`h-9 rounded-full border px-4 text-[13px] font-semibold ${
                on
                  ? "border-text bg-text text-background"
                  : "border-border bg-surface text-text"
              }`}
            >
              {p} lineup
            </button>
          );
        })}
        {lineups && lineupChips.length === 0 && (
          <span className="px-1 text-[13px] text-muted">
            No lineup on this day
          </span>
        )}
      </div>

      {/* Pieces */}
      {r.pieces.map((pc, k) => {
        const crews = crewsAt(r, k);
        const places = placesAt(r, k);
        const red = swappedInto(r, k);
        // The boats being compared: any pair that switched just before or just after this piece.
        const pairs = [...(r.pieces[k - 1]?.swaps ?? []), ...pc.swaps]
          .map(
            ([a, b]) =>
              [boatAt(r, k, a), boatAt(r, k, b)].sort((x, y) => x - y) as [
                number,
                number,
              ],
          )
          .filter(
            ([i, j], n, all) =>
              i >= 0 &&
              j >= 0 &&
              all.findIndex(([x, y]) => x === i && y === j) === n,
          );
        return (
          <div key={k} className="mt-6">
            <div className="mb-2 flex items-center justify-between px-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Piece {k + 1}
              </span>
              {k === r.pieces.length - 1 && k > 0 && (
                <button
                  type="button"
                  onClick={removeLastPiece}
                  aria-label={`Remove piece ${k + 1}`}
                  className="tap44 flex h-6 w-6 items-center justify-center text-muted"
                >
                  <IconX size={13} />
                </button>
              )}
            </div>

            {/* Each boat as the app draws it everywhere: the hull, seats bow → stroke, cox at the stern. */}
            <div className="grid grid-flow-row-dense grid-cols-2 gap-x-2 gap-y-3">
              {r.boats.map((b, bi) => (
                <div
                  key={bi}
                  className={`min-w-0 ${folded.has(bi) ? "col-span-2" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleFold(bi)}
                    aria-expanded={!folded.has(bi)}
                    className="mb-1.5 flex w-full items-center gap-1.5 pl-1 text-left"
                  >
                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-text">
                      {b.name}{" "}
                      <span className="text-[12px] font-medium text-muted">
                        {b.badge}
                      </span>
                    </span>
                    {places[bi] &&
                      (places[bi]!.place === 1 ? (
                        <span className="flex-shrink-0 rounded-full bg-success-tint px-2 py-0.5 text-[11px] font-semibold text-success">
                          1st
                        </span>
                      ) : (
                        <span className="flex-shrink-0 text-[12px] font-medium tabular-nums text-muted">
                          +{places[bi]!.behind.toFixed(1)} s
                        </span>
                      ))}
                    <span className="flex-shrink-0 pr-1 text-muted">
                      {folded.has(bi) ? (
                        <IconChevronDown size={15} />
                      ) : (
                        <IconChevronUp size={15} />
                      )}
                    </span>
                  </button>
                  {folded.has(bi) ? (
                    /* Folded: the crew on one line — "1 Marchetti  2 Andersen …" — time beside it. */
                    <div className="flex items-start gap-2">
                      <div className="flex min-w-0 flex-1 flex-wrap gap-x-2.5 gap-y-1 rounded-2xl border-2 border-primary-line bg-surface-2 px-3 py-2">
                        {crews[bi].map((id, si) =>
                          id ? (
                            <button
                              key={si}
                              type="button"
                              onClick={() => tapRower(k, id)}
                              disabled={switching !== k}
                              className={`flex items-baseline gap-1 rounded-md px-0.5 text-[13px] disabled:cursor-default ${
                                first === id && switching === k
                                  ? "bg-danger text-primary-contrast"
                                  : red.has(id)
                                    ? "font-semibold text-danger"
                                    : "font-medium text-text"
                              }`}
                            >
                              <span className="font-mono text-[11px] opacity-60">
                                {si + 1}
                              </span>
                              {surname(id)}
                            </button>
                          ) : null,
                        )}
                        {b.coxId && (
                          <span className="flex items-baseline gap-1 text-[13px] font-medium text-text">
                            <span className="font-mono text-[11px] opacity-60">
                              C
                            </span>
                            {surname(b.coxId)}
                          </span>
                        )}
                      </div>
                      <input
                        value={texts[k]?.[bi] ?? ""}
                        onChange={(e) => setTime(k, bi, e.target.value)}
                        inputMode="decimal"
                        placeholder="4:23.6"
                        aria-label={`Piece ${k + 1}, ${b.name} time`}
                        className={`w-24 flex-shrink-0 rounded-xl border bg-surface px-2 py-2 text-center font-mono text-base text-text placeholder:text-muted ${
                          texts[k]?.[bi] && pc.times[bi] == null
                            ? "border-danger"
                            : "border-border"
                        }`}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="rounded-[28px] border-2 border-primary-line bg-surface-2 px-2 py-3">
                        <div className="flex flex-col gap-1">
                          {crews[bi].map((id, si) => (
                            <button
                              key={si}
                              type="button"
                              onClick={() => id && tapRower(k, id)}
                              disabled={switching !== k || !id}
                              className={`flex h-9 items-center gap-1.5 rounded-[10px] border pl-1.5 pr-2 text-left disabled:cursor-default ${
                                id && first === id && switching === k
                                  ? "border-danger bg-danger text-primary-contrast"
                                  : id && red.has(id)
                                    ? "border-danger-line bg-danger-tint text-danger"
                                    : switching === k && id
                                      ? "border-border-strong bg-surface text-text"
                                      : "border-border bg-surface text-text"
                              }`}
                            >
                              <span className="w-4 flex-shrink-0 text-center font-mono text-[11px] opacity-70">
                                {si + 1}
                              </span>
                              <span
                                className={`min-w-0 flex-1 truncate text-[13px] ${
                                  id && red.has(id)
                                    ? "font-semibold"
                                    : "font-medium"
                                } ${id ? "" : "text-muted"}`}
                              >
                                {id ? surname(id) : "—"}
                              </span>
                            </button>
                          ))}
                        </div>
                        {b.coxId && (
                          <>
                            <div className="mx-1.5 my-1.5 h-[1.5px] rounded-[1px] bg-muted" />
                            <div
                              className="flex h-9 items-center gap-1.5 rounded-[10px] border bg-surface pl-1.5 pr-2"
                              style={{ borderColor: COX_COLOR }}
                            >
                              <span className="w-4 flex-shrink-0 text-center font-mono text-[11px] text-muted">
                                C
                              </span>
                              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text">
                                {surname(b.coxId)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                      <input
                        value={texts[k]?.[bi] ?? ""}
                        onChange={(e) => setTime(k, bi, e.target.value)}
                        inputMode="decimal"
                        placeholder="4:23.6"
                        aria-label={`Piece ${k + 1}, ${b.name} time`}
                        className={`mt-1.5 w-full rounded-xl border bg-surface px-3 py-2 text-center font-mono text-base text-text placeholder:text-muted ${
                          texts[k]?.[bi] && pc.times[bi] == null
                            ? "border-danger"
                            : "border-border"
                        }`}
                      />
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* The comparison the sheet writes: "Nat > Abbi, 2.6 s" */}
            {pairs.map(([i, j]) => {
              const m = lead(r, k, i, j);
              if (m == null) return null;
              const [w, l] = m >= 0 ? [i, j] : [j, i];
              return (
                <div
                  key={`${i}-${j}`}
                  className="mt-1.5 px-0.5 text-[13px] text-text"
                >
                  {m === 0
                    ? `${r.boats[i].name} = ${r.boats[j].name}`
                    : `${r.boats[w].name} > ${r.boats[l].name} · ${secs(Math.abs(m))}`}
                </div>
              );
            })}

            {/* Switches made after this piece */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {pc.swaps.map((s, n) => (
                <span
                  key={n}
                  className="flex items-center gap-1.5 rounded-full bg-danger-tint py-1 pl-3 pr-1 text-[12px] font-semibold text-danger"
                >
                  <IconSwap size={13} />
                  {surname(s[0])} / {surname(s[1])}
                  <button
                    type="button"
                    onClick={() =>
                      setSwaps(
                        k,
                        pc.swaps.filter((_, i) => i !== n),
                      )
                    }
                    aria-label={`Undo switch ${surname(s[0])} / ${surname(s[1])}`}
                    className="tap44 flex h-5 w-5 items-center justify-center"
                  >
                    <IconX size={11} />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => {
                  setFirst(null);
                  setSwitching(switching === k ? null : k);
                }}
                className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold ${
                  switching === k
                    ? "border-text bg-text text-background"
                    : "border-border bg-surface text-text"
                }`}
              >
                {switching === k ? (
                  "Done"
                ) : (
                  <>
                    <IconSwap size={13} /> Switch
                  </>
                )}
              </button>
            </div>
          </div>
        );
      })}

      {r.pieces.length > 0 && (
        <button
          type="button"
          onClick={addPiece}
          className="mt-4 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border-strong text-[13px] font-semibold text-text"
        >
          <IconPlus size={14} /> Piece {r.pieces.length + 1}
        </button>
      )}

      {/* Results — one per switch */}
      {results.some((x) => x.by != null) && (
        <div className="mt-6">
          <Label>Results</Label>
          <div className="flex flex-col gap-1.5">
            {results.map((res, n) =>
              res.by == null ? null : (
                <div
                  key={n}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-3"
                >
                  <span className="min-w-0 flex-1 truncate text-[14px] text-text">
                    {res.winner ? (
                      <>
                        <span className="font-semibold">
                          {nameOf(res.winner)}
                        </span>
                        <span className="text-muted"> beat </span>
                        {nameOf(res.loser)}
                      </>
                    ) : (
                      `${nameOf(res.pair[0])} = ${nameOf(res.pair[1])}`
                    )}
                  </span>
                  <span className="flex-shrink-0 font-semibold tabular-nums text-text">
                    {res.winner ? secs(res.by) : "Level"}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2">
        <Button
          full
          onClick={() => (r.boats.length ? onSave(r) : setNoLineup(true))}
        >
          Save
        </Button>
        {noLineup && (
          <p className="text-center text-[13px] text-danger">Pick a lineup</p>
        )}
        {!isNew &&
          (confirmDelete ? (
            <Button full variant="danger" onClick={() => onDelete(r.id)}>
              Delete seat race
            </Button>
          ) : (
            <Button
              full
              variant="dangerSoft"
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
          ))}
      </div>
    </Sheet>
  );
}

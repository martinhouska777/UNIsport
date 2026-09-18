"use client";

/*
  SEAT RACES — the second half of the console's Team tab (owner, 2026-09-18).
  A list of the races and who won, and one editor that sets a race up (two
  crews, the swap) and takes the four times. Coach only.
  Data and the maths: lib/varsity/seatRace.ts. All colours are theme tokens.
*/
import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Sheet from "@/components/varsity/Sheet";
import { IconSwap } from "@/components/icons";
import { roster, type BoatKind } from "@/lib/varsity/coachLineup";
import { fetchTrainingConfig } from "@/lib/varsity/configStore";
import {
  deleteSeatRace,
  formatTime,
  loadSeatRaces,
  margin,
  nameOf,
  parseTime,
  raceResult,
  saveSeatRace,
  standings,
  type RaceBoat,
  type SeatRace,
} from "@/lib/varsity/seatRace";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const dayLabel = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const secs = (n: number) => `${n.toFixed(1)} s`;

const emptyBoat = (k: BoatKind): RaceBoat => ({ seats: Array(k.rowers).fill(null), coxId: null });

function newRace(k: BoatKind): SeatRace {
  return {
    id: `sr-${Date.now()}`,
    date: today(),
    badge: k.key,
    piece: "",
    boats: [emptyBoat(k), emptyBoat(k)],
    swap: ["", ""],
    times: [
      [null, null],
      [null, null],
    ],
  };
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
      {children}
    </div>
  );
}

/* ─────────────────────────  list  ───────────────────────── */

export default function SeatRacesScreen({ teamId }: { teamId: string | null }) {
  // Lazy read is safe: this only mounts after the membership has loaded, in the browser.
  const [races, setRaces] = useState<SeatRace[]>(loadSeatRaces);
  const [kinds, setKinds] = useState<BoatKind[]>([]);
  const [editing, setEditing] = useState<SeatRace | null>(null);
  const [who, setWho] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchTrainingConfig(teamId).then((c) => active && setKinds(c.boats));
    return () => {
      active = false;
    };
  }, [teamId]);

  const table = useMemo(() => standings(races), [races]);
  const shown = who ? races.filter((r) => r.swap.includes(who)) : races;

  return (
    <div className="mx-auto w-full max-w-screen-sm px-4 pb-10 pt-4">
      <Button full disabled={kinds.length === 0} onClick={() => setEditing(newRace(kinds[0]))}>
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
                  who === t.id ? "border-primary-line bg-primary-tint" : "border-border bg-surface"
                }`}
              >
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text">{nameOf(t.id)}</span>
                <span className="text-[13px] tabular-nums text-success">{t.won} W</span>
                <span className="w-9 text-right text-[13px] tabular-nums text-danger">{t.lost} L</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {shown.length > 0 && (
        <div className="mt-6">
          <Label>{who ? nameOf(who) : "Races"}</Label>
          <div className="flex flex-col gap-1.5">
            {shown.map((r) => {
              const res = raceResult(r);
              const mine = who && res?.winner ? (res.winner === who ? "W" : "L") : null;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setEditing(r)}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-left"
                >
                  {mine && (
                    <span
                      className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                        mine === "W" ? "bg-success-tint text-success" : "bg-danger-tint text-danger"
                      }`}
                    >
                      {mine}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-text">
                      {res?.winner
                        ? `${nameOf(res.winner)} beat ${nameOf(res.loser)}`
                        : `${nameOf(r.swap[0])} vs ${nameOf(r.swap[1])}`}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted">
                      {[dayLabel(r.date), r.badge, r.piece].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="flex-shrink-0 text-[13px] tabular-nums text-muted">
                    {res ? (res.winner ? `+${secs(res.by)}` : "Level") : "—"}
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
          kinds={kinds}
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

type SeatRef = { boat: 0 | 1; seat: number | "cox" };

function SeatRaceEditor({
  initial,
  kinds,
  isNew,
  onClose,
  onSave,
  onDelete,
}: {
  initial: SeatRace;
  kinds: BoatKind[];
  isNew: boolean;
  onClose: () => void;
  onSave: (r: SeatRace) => void;
  onDelete: (id: string) => void;
}) {
  const [r, setR] = useState<SeatRace>(initial);
  const [picking, setPicking] = useState<SeatRef | null>(null);
  const [texts, setTexts] = useState<string[][]>(() =>
    initial.times.map((p) => p.map((t) => (t == null ? "" : formatTime(t)))),
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const kind = kinds.find((k) => k.key === r.badge);
  const hasCox = kind?.cox ?? r.boats[0].coxId != null;
  const used = new Set(r.boats.flatMap((b) => [...b.seats, b.coxId]).filter(Boolean) as string[]);
  const ready = !!r.swap[0] && !!r.swap[1];
  const res = raceResult(r);

  const pickKind = (k: BoatKind) => {
    if (k.key === r.badge) return;
    setR({ ...r, badge: k.key, boats: [emptyBoat(k), emptyBoat(k)], swap: ["", ""] });
  };

  const place = (ref: SeatRef, id: string | null) => {
    const boats = r.boats.map((b) => ({ ...b, seats: [...b.seats] })) as [RaceBoat, RaceBoat];
    const b = boats[ref.boat];
    const was = ref.seat === "cox" ? b.coxId : b.seats[ref.seat];
    if (ref.seat === "cox") b.coxId = id;
    else b.seats[ref.seat] = id;
    const swap = [...r.swap] as [string, string];
    if (was && swap[ref.boat] === was) swap[ref.boat] = "";
    setR({ ...r, boats, swap });
    setPicking(null);
  };

  const toggleSwap = (boat: 0 | 1, id: string) => {
    const swap = [...r.swap] as [string, string];
    swap[boat] = swap[boat] === id ? "" : id;
    setR({ ...r, swap });
  };

  const setTime = (p: 0 | 1, b: 0 | 1, s: string) => {
    const nextTexts = texts.map((row) => [...row]);
    nextTexts[p][b] = s;
    setTexts(nextTexts);
    const times = r.times.map((row) => [...row]) as SeatRace["times"];
    times[p][b] = parseTime(s);
    setR({ ...r, times });
  };

  const pickList = picking
    ? roster
        .filter((a) => (picking.seat === "cox" ? a.cox : !a.cox))
        .filter((a) => !used.has(a.id))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  return (
    <Sheet full title={isNew ? "New seat race" : "Seat race"} onClose={onClose}>
      {/* Boat */}
      <div className="flex flex-wrap gap-1.5">
        {kinds.map((k) => (
          <button
            key={k.key}
            type="button"
            onClick={() => pickKind(k)}
            className={`h-9 min-w-[48px] rounded-full border px-3.5 text-[13px] font-semibold ${
              k.key === r.badge ? "border-text bg-text text-background" : "border-border bg-surface text-text"
            }`}
          >
            {k.symbol}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
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

      {/* The two crews */}
      <div className="mt-5 grid grid-cols-2 gap-2">
        {([0, 1] as const).map((bi) => {
          const b = r.boats[bi];
          return (
            <div key={bi}>
              <div className="mb-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Boat {bi === 0 ? "A" : "B"}
              </div>
              <div className="rounded-[28px] border-2 border-primary-line bg-surface-2 px-2 py-3">
                {b.seats.map((id, si) => (
                  <SeatRow
                    key={si}
                    num={String(si + 1)}
                    id={id}
                    swapped={!!id && r.swap[bi] === id}
                    onPick={() => setPicking({ boat: bi, seat: si })}
                    onSwap={id ? () => toggleSwap(bi, id) : undefined}
                  />
                ))}
                {hasCox && (
                  <>
                    <div className="mx-1.5 my-1 h-[1.5px] rounded-[1px] bg-muted" />
                    <SeatRow num="C" id={b.coxId} onPick={() => setPicking({ boat: bi, seat: "cox" })} />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Times */}
      {ready && (
        <div className="mt-6">
          {([0, 1] as const).map((p) => {
            const m = margin(r.times[p]);
            return (
              <div key={p} className={p === 1 ? "mt-4" : ""}>
                {p === 1 && (
                  <div className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-primary-tint px-3 py-2.5 text-[13px] font-medium text-primary">
                    <IconSwap size={15} />
                    <span className="truncate">
                      {nameOf(r.swap[0])} ↔ {nameOf(r.swap[1])}
                    </span>
                  </div>
                )}
                <Label>Piece {p + 1}</Label>
                <div className="flex flex-col gap-1.5">
                  {([0, 1] as const).map((b) => (
                    <label
                      key={b}
                      className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-1.5"
                    >
                      <span className="flex-1 text-[13px] font-medium text-text">Boat {b === 0 ? "A" : "B"}</span>
                      <input
                        value={texts[p][b]}
                        onChange={(e) => setTime(p, b, e.target.value)}
                        inputMode="decimal"
                        placeholder="5:12.4"
                        aria-label={`Piece ${p + 1}, boat ${b === 0 ? "A" : "B"} time`}
                        className={`w-24 rounded-lg border bg-surface-2 px-2.5 py-1.5 text-center font-mono text-base text-text placeholder:text-muted ${
                          texts[p][b] && r.times[p][b] == null ? "border-danger" : "border-border"
                        }`}
                      />
                    </label>
                  ))}
                </div>
                {m != null && (
                  <div className="mt-1.5 px-0.5 text-[12px] text-muted">
                    {m === 0 ? "Level" : `${m > 0 ? "A" : "B"} by ${secs(Math.abs(m))}`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Result */}
      {res && (
        <div className="mt-6 rounded-2xl border border-border bg-surface px-4 py-5 text-center">
          {res.winner ? (
            <>
              <div className="text-[22px] font-semibold text-text">{nameOf(res.winner)}</div>
              <div className="mt-1 text-[13px] text-muted">
                beat {nameOf(res.loser)} by <span className="font-semibold text-text">{secs(res.by)}</span>
              </div>
            </>
          ) : (
            <div className="text-[18px] font-semibold text-text">Dead heat</div>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2">
        <Button full disabled={!ready} onClick={() => onSave(r)}>
          Save
        </Button>
        {!isNew &&
          (confirmDelete ? (
            <Button full variant="danger" onClick={() => onDelete(r.id)}>
              Delete seat race
            </Button>
          ) : (
            <Button full variant="dangerSoft" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          ))}
      </div>

      {picking && (
        <Sheet title={picking.seat === "cox" ? "Cox" : `Seat ${picking.seat + 1}`} onClose={() => setPicking(null)}>
          <div className="flex flex-col gap-1.5 pb-4">
            <button
              type="button"
              onClick={() => place(picking, null)}
              className="rounded-xl border border-border bg-surface px-3.5 py-2.5 text-left text-[13px] text-muted"
            >
              Empty
            </button>
            {pickList.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => place(picking, a.id)}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-left"
              >
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text">{a.name}</span>
                {!a.cox && <span className="text-[12px] font-semibold text-muted">{a.side}</span>}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </Sheet>
  );
}

function SeatRow({
  num,
  id,
  swapped = false,
  onPick,
  onSwap,
}: {
  num: string;
  id: string | null;
  swapped?: boolean;
  onPick: () => void;
  onSwap?: () => void;
}) {
  return (
    <div
      className={`flex min-h-[36px] items-center gap-1 rounded-lg pl-1.5 ${swapped ? "bg-primary-tint" : ""}`}
    >
      <span className="w-4 flex-shrink-0 text-center font-mono text-[11px] text-muted">{num}</span>
      <button
        type="button"
        onClick={onPick}
        className={`min-w-0 flex-1 truncate py-2 text-left text-[13px] ${
          id ? (swapped ? "font-semibold text-primary" : "font-medium text-text") : "text-muted"
        }`}
      >
        {id ? nameOf(id) : "+"}
      </button>
      {onSwap && (
        <button
          type="button"
          onClick={onSwap}
          aria-label={swapped ? `Don't swap ${nameOf(id)}` : `Swap ${nameOf(id)}`}
          aria-pressed={swapped}
          className={`tap44 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
            swapped ? "text-primary" : "text-text-3"
          }`}
        >
          <IconSwap size={14} />
        </button>
      )}
    </div>
  );
}

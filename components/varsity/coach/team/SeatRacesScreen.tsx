"use client";

/*
  SEAT RACES — the second half of the console's Team tab (owner, 2026-09-18).
  A list of the races and who won, and one editor: boats (imported from that
  day's lineup or added by hand, as many as went out), the swap pairs, and
  every boat's time in both pieces. Coach only.
  Data and the maths: lib/varsity/seatRace.ts. All colours are theme tokens.
*/
import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Sheet from "@/components/varsity/Sheet";
import { IconPlus, IconSwap, IconX } from "@/components/icons";
import { defaultBoatName, roster, type Boat, type BoatKind } from "@/lib/varsity/coachLineup";
import { sessionKey } from "@/lib/varsity/coachPlan";
import { fetchTrainingConfig } from "@/lib/varsity/configStore";
import { fetchLineup } from "@/lib/varsity/lineupStore";
import {
  boatLetter,
  boatOf,
  deleteSeatRace,
  formatTime,
  loadSeatRaces,
  nameOf,
  pairResult,
  parseTime,
  saveSeatRace,
  standings,
  type RaceBoat,
  type SeatRace,
  type SwapPair,
} from "@/lib/varsity/seatRace";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const dayLabel = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const secs = (n: number) => `${n.toFixed(1)} s`;

const emptyBoat = (k: BoatKind): RaceBoat => ({
  name: "",
  badge: k.key,
  seats: Array(k.rowers).fill(null),
  coxId: null,
  hasCox: k.cox,
});

const fromLineup = (b: Boat): RaceBoat => ({
  name: b.name === defaultBoatName(b.badge) ? "" : b.name,
  badge: b.badge,
  seats: b.seats.map((s) => s.athleteId),
  coxId: b.hasCox ? b.coxId : null,
  hasCox: b.hasCox,
});

const newRace = (): SeatRace => ({
  id: `sr-${Date.now()}`,
  date: today(),
  piece: "",
  boats: [],
  swaps: [],
  times: [[], []],
});

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
  // One line per swap pair, newest race first.
  const rows = races
    .flatMap((r) => r.swaps.map((p) => ({ r, p, res: pairResult(r, p) })))
    .filter((x) => !who || x.p.includes(who));

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

      {rows.length > 0 && (
        <div className="mt-6">
          <Label>{who ? nameOf(who) : "Races"}</Label>
          <div className="flex flex-col gap-1.5">
            {rows.map(({ r, p, res }) => {
              const mine = who && res?.winner ? (res.winner === who ? "W" : "L") : null;
              return (
                <button
                  key={`${r.id}-${p.join("-")}`}
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
                        : `${nameOf(p[0])} vs ${nameOf(p[1])}`}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted">
                      {[dayLabel(r.date), r.boats[boatOf(r, p[0])]?.badge, r.piece].filter(Boolean).join(" · ")}
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

type SeatRef = { boat: number; seat: number | "cox" };

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
  const [texts, setTexts] = useState<string[][]>(() =>
    [0, 1].map((p) =>
      initial.boats.map((_, b) => {
        const t = initial.times[p]?.[b];
        return t == null ? "" : formatTime(t);
      }),
    ),
  );
  const [picking, setPicking] = useState<SeatRef | null>(null);
  const [pending, setPending] = useState<string | null>(null); // first half of a swap pair
  const [noSwap, setNoSwap] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // That day's lineups, to import from.
  const [lineups, setLineups] = useState<{ period: "AM" | "PM"; boats: Boat[] }[]>([]);

  useEffect(() => {
    let active = true;
    const d = new Date(`${r.date}T12:00:00`);
    Promise.all((["AM", "PM"] as const).map((p) => fetchLineup(sessionKey(d, p)))).then(([am, pm]) => {
      if (!active) return;
      setLineups(
        [
          { period: "AM" as const, boats: am?.boats ?? [] },
          { period: "PM" as const, boats: pm?.boats ?? [] },
        ].filter((l) => l.boats.length > 0),
      );
    });
    return () => {
      active = false;
    };
  }, [r.date]);

  const used = new Set(r.boats.flatMap((b) => [...b.seats, b.coxId]).filter(Boolean) as string[]);
  const pairOf = (id: string) => r.swaps.findIndex((p) => p.includes(id));
  const results = r.swaps.map((p) => pairResult(r, p));

  /* Replace every boat at once (an import) — swaps and times start again. */
  const setBoats = (boats: RaceBoat[]) => {
    setR({ ...r, boats, swaps: [], times: [boats.map(() => null), boats.map(() => null)] });
    setTexts([boats.map(() => ""), boats.map(() => "")]);
    setPending(null);
  };

  const addBoat = (k: BoatKind) => {
    setR({ ...r, boats: [...r.boats, emptyBoat(k)], times: r.times.map((t) => [...t, null]) });
    setTexts(texts.map((t) => [...t, ""]));
  };

  const removeBoat = (i: number) => {
    const gone = new Set([...r.boats[i].seats, r.boats[i].coxId]);
    setR({
      ...r,
      boats: r.boats.filter((_, b) => b !== i),
      swaps: r.swaps.filter((p) => !p.some((id) => gone.has(id))),
      times: r.times.map((t) => t.filter((_, b) => b !== i)),
    });
    setTexts(texts.map((t) => t.filter((_, b) => b !== i)));
    if (pending && gone.has(pending)) setPending(null);
  };

  const place = (ref: SeatRef, id: string | null) => {
    const boats = r.boats.map((b) => ({ ...b, seats: [...b.seats] }));
    const b = boats[ref.boat];
    const was = ref.seat === "cox" ? b.coxId : b.seats[ref.seat];
    if (ref.seat === "cox") b.coxId = id;
    else b.seats[ref.seat] = id;
    setR({ ...r, boats, swaps: r.swaps.filter((p) => !was || !p.includes(was)) });
    if (was && pending === was) setPending(null);
    setPicking(null);
  };

  /* ⇄ — the first tap marks a rower, a tap in another boat pairs them; tapping a paired rower undoes the pair. */
  const tapSwap = (id: string, boat: number) => {
    setNoSwap(false);
    const k = pairOf(id);
    if (k >= 0) return setR({ ...r, swaps: r.swaps.filter((_, i) => i !== k) });
    if (pending === id) return setPending(null);
    if (pending && boatOf(r, pending) !== boat) {
      setR({ ...r, swaps: [...r.swaps, [pending, id] as SwapPair] });
      return setPending(null);
    }
    setPending(id);
  };

  const setTime = (p: number, b: number, s: string) => {
    setTexts(texts.map((row, i) => (i === p ? row.map((v, j) => (j === b ? s : v)) : row)));
    setR({ ...r, times: r.times.map((row, i) => (i === p ? row.map((v, j) => (j === b ? parseTime(s) : v)) : row)) });
  };

  const pickList = picking
    ? roster
        .filter((a) => (picking.seat === "cox" ? a.cox : !a.cox))
        .filter((a) => !used.has(a.id))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  const boatTitle = (i: number) => [boatLetter(i), r.boats[i].name].filter(Boolean).join(" · ");

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

      {/* Boats: import a practice's lineup, or add one by rigging */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {lineups.map((l) => (
          <button
            key={l.period}
            type="button"
            onClick={() => setBoats(l.boats.map(fromLineup))}
            className="h-9 rounded-full border border-primary-line bg-primary-tint px-3.5 text-[13px] font-semibold text-primary"
          >
            {l.period} lineup
          </button>
        ))}
        {kinds.map((k) => (
          <button
            key={k.key}
            type="button"
            onClick={() => addBoat(k)}
            className="flex h-9 items-center gap-1 rounded-full border border-border bg-surface px-3 text-[13px] font-semibold text-text"
          >
            <IconPlus size={13} />
            {k.symbol}
          </button>
        ))}
      </div>

      {r.boats.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-x-2 gap-y-4">
          {r.boats.map((b, bi) => (
            <div key={bi}>
              <div className="mb-1.5 flex items-center gap-1 pl-1">
                <span className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  {boatTitle(bi)} <span className="normal-case tracking-normal">{b.badge}</span>
                </span>
                <button
                  type="button"
                  onClick={() => removeBoat(bi)}
                  aria-label={`Remove boat ${boatLetter(bi)}`}
                  className="tap44 flex h-6 w-6 flex-shrink-0 items-center justify-center text-muted"
                >
                  <IconX size={13} />
                </button>
              </div>
              <div className="rounded-[28px] border-2 border-primary-line bg-surface-2 px-2 py-3">
                {b.seats.map((id, si) => {
                  const k = id ? pairOf(id) : -1;
                  return (
                    <SeatRow
                      key={si}
                      num={String(si + 1)}
                      id={id}
                      pair={k >= 0 ? k + 1 : null}
                      pending={!!id && pending === id}
                      onPick={() => setPicking({ boat: bi, seat: si })}
                      onSwap={id ? () => tapSwap(id, bi) : undefined}
                    />
                  );
                })}
                {b.hasCox && (
                  <>
                    <div className="mx-1.5 my-1 h-[1.5px] rounded-[1px] bg-muted" />
                    <SeatRow num="C" id={b.coxId} onPick={() => setPicking({ boat: bi, seat: "cox" })} />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Times */}
      {r.swaps.length > 0 && (
        <div className="mt-6">
          {[0, 1].map((p) => (
            <div key={p} className={p === 1 ? "mt-4" : ""}>
              {p === 1 && (
                <div className="mb-4 flex flex-col gap-1 rounded-xl bg-primary-tint px-3 py-2.5 text-[13px] font-medium text-primary">
                  {r.swaps.map((s, i) => (
                    <div key={i} className="flex items-center justify-center gap-2">
                      <IconSwap size={15} />
                      <span className="truncate">
                        {nameOf(s[0])} ↔ {nameOf(s[1])}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <Label>Piece {p + 1}</Label>
              <div className="flex flex-col gap-1.5">
                {r.boats.map((_, b) => (
                  <label
                    key={b}
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-1.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text">{boatTitle(b)}</span>
                    <input
                      value={texts[p][b] ?? ""}
                      onChange={(e) => setTime(p, b, e.target.value)}
                      inputMode="decimal"
                      placeholder="5:12.4"
                      aria-label={`Piece ${p + 1}, boat ${boatLetter(b)} time`}
                      className={`w-24 rounded-lg border bg-surface-2 px-2.5 py-1.5 text-center font-mono text-base text-text placeholder:text-muted ${
                        texts[p][b] && r.times[p][b] == null ? "border-danger" : "border-border"
                      }`}
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Result — one per swap pair */}
      {results.some(Boolean) && (
        <div className="mt-6 flex flex-col gap-2">
          {results.map((res, i) =>
            res ? (
              <div key={i} className="rounded-2xl border border-border bg-surface px-4 py-4 text-center">
                {res.winner ? (
                  <>
                    <div className="text-[20px] font-semibold text-text">{nameOf(res.winner)}</div>
                    <div className="mt-1 text-[13px] text-muted">
                      beat {nameOf(res.loser)} by <span className="font-semibold text-text">{secs(res.by)}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-[15px] font-semibold text-text">
                    {nameOf(res.pair[0])} and {nameOf(res.pair[1])} · dead heat
                  </div>
                )}
              </div>
            ) : null,
          )}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2">
        <Button full onClick={() => (r.swaps.length ? onSave(r) : setNoSwap(true))}>
          Save
        </Button>
        {noSwap && (
          <p className="flex items-center justify-center gap-1.5 text-[13px] text-danger">
            Mark who swaps with <IconSwap size={14} />
          </p>
        )}
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
  pair = null,
  pending = false,
  onPick,
  onSwap,
}: {
  num: string;
  id: string | null;
  pair?: number | null; // which swap pair (1, 2 …) this rower is in
  pending?: boolean; // marked, waiting for a partner in another boat
  onPick: () => void;
  onSwap?: () => void;
}) {
  const on = pair != null || pending;
  return (
    <div className={`flex min-h-[36px] items-center gap-1 rounded-lg pl-1.5 ${on ? "bg-primary-tint" : ""}`}>
      <span className="w-4 flex-shrink-0 text-center font-mono text-[11px] text-muted">{num}</span>
      <button
        type="button"
        onClick={onPick}
        className={`min-w-0 flex-1 truncate py-2 text-left text-[13px] ${
          id ? (on ? "font-semibold text-primary" : "font-medium text-text") : "text-muted"
        }`}
      >
        {id ? nameOf(id) : "+"}
      </button>
      {onSwap && (
        <button
          type="button"
          onClick={onSwap}
          aria-label={on ? `Don't swap ${nameOf(id)}` : `Swap ${nameOf(id)}`}
          aria-pressed={on}
          className={`tap44 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
            pair != null
              ? "bg-primary text-[11px] font-semibold text-primary-contrast"
              : on
                ? "text-primary"
                : "text-text-3"
          }`}
        >
          {pair != null ? pair : <IconSwap size={14} />}
        </button>
      )}
    </div>
  );
}

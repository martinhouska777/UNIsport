"use client";

/*
  REPEAT A LINEUP — WHICH DAY, AND WHICH BOATS (owner, 2026-10-11: "When you
  repeat the lineups, you can click it, and you can click which day you want to
  repeat and which boat you want to repeat. The boats don't need to repeat").

  The Repeat chip on an empty practice used to seat the last published crew,
  every boat of it, in one tap. It now opens this sheet: the lineups the squad
  was given before this practice, newest first (the newest is picked, so the
  old one-tap case is still a tap away), and under the picked day its boats,
  all ticked. Untick a boat and it stays behind. Only PUBLISHED lineups are
  offered — a draft is a thought half-way through (lineupStore.ts).

  The sheet only chooses. Seating them, and leaving out anybody who is out on
  this practice's day, is the builder's job (LineupBuilderScreen: repeatFrom).
  Colours are theme tokens only.
*/
import { useEffect, useMemo, useState } from "react";
import Sheet from "@/components/varsity/Sheet";
import Button from "@/components/ui/Button";
import { IconCheck } from "@/components/icons";
import { dayKeyLabel, parseSessionKey } from "@/lib/varsity/coachPlan";
import type { Boat } from "@/lib/varsity/coachLineup";
import { fetchLineupStatuses, fetchLineupsFor } from "@/lib/varsity/lineupStore";

// How many earlier lineups the sheet lists: the last couple of weeks of water.
const MAX_DAYS = 8;

const order = (key: string) => {
  const p = parseSessionKey(key);
  return p ? p.date.getTime() * 2 + (p.period === "PM" ? 1 : 0) : -1;
};

export default function RepeatSheet({
  dayKey,
  onRepeat,
  onClose,
}: {
  /** The practice being built: only lineups before it are offered. */
  dayKey: string;
  onRepeat: (from: string, boats: Boat[]) => void;
  onClose: () => void;
}) {
  const [days, setDays] = useState<{ key: string; boats: Boat[] }[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  // Boats LEFT OUT of the picked day (empty = every boat repeats).
  const [left, setLeft] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let active = true;
    (async () => {
      const statuses = await fetchLineupStatuses();
      const cutoff = order(dayKey);
      const keys = Object.entries(statuses)
        .filter(([key, status]) => status === "published" && order(key) >= 0 && order(key) < cutoff)
        .map(([key]) => key)
        .sort((a, b) => order(b) - order(a))
        .slice(0, MAX_DAYS);
      const boatsByDay = await fetchLineupsFor(keys);
      if (!active) return;
      const found = keys
        .map((key) => ({ key, boats: boatsByDay[key] ?? [] }))
        .filter((d) => d.boats.length > 0);
      setDays(found);
      setPicked(found[0]?.key ?? null);
    })();
    return () => {
      active = false;
    };
  }, [dayKey]);

  const day = useMemo(() => days?.find((d) => d.key === picked) ?? null, [days, picked]);
  const chosen = day ? day.boats.filter((b) => !left.has(b.id)) : [];

  const pickDay = (key: string) => {
    setPicked(key);
    setLeft(new Set());
  };
  const toggleBoat = (id: string) =>
    setLeft((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const sectionCls = "mb-1.5 mt-4 px-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted";

  return (
    <Sheet title="Repeat a lineup" onClose={onClose}>
      {days === null ? (
        <div className="py-8 text-center text-[13px] text-muted">Loading lineups…</div>
      ) : days.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-muted">No earlier lineups.</div>
      ) : (
        <>
          <div className={`${sectionCls} mt-0`}>Day</div>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {days.map((d, i) => {
              const on = d.key === picked;
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => pickDay(d.key)}
                  aria-pressed={on}
                  className={`flex w-full items-center gap-3 px-3.5 py-3 text-left ${
                    i > 0 ? "border-t border-border" : ""
                  } ${on ? "bg-primary-tint" : "active:bg-surface-2"}`}
                >
                  <Tick on={on} round />
                  <span className="min-w-0 flex-1 text-[14px] font-semibold text-text">{dayKeyLabel(d.key)}</span>
                  <span className="flex-shrink-0 font-mono text-[12px] font-semibold text-text">
                    {parseSessionKey(d.key)?.period}
                  </span>
                </button>
              );
            })}
          </div>

          {day && (
            <>
              <div className={sectionCls}>Boats</div>
              <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                {day.boats.map((b, i) => {
                  const on = !left.has(b.id);
                  const seated = b.seats.filter((s) => s.athleteId).length + (b.coxId ? 1 : 0);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => toggleBoat(b.id)}
                      aria-pressed={on}
                      className={`flex w-full items-center gap-3 px-3.5 py-3 text-left ${
                        i > 0 ? "border-t border-border" : ""
                      } active:bg-surface-2`}
                    >
                      <Tick on={on} />
                      <span className="flex-shrink-0 rounded-md border border-primary-line bg-primary-tint px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                        {b.badge}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-text">{b.name}</span>
                      <span className="flex-shrink-0 text-[12px] tabular-nums text-muted">
                        {seated}/{b.seats.length + (b.hasCox ? 1 : 0)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <Button
            size="lg"
            full
            disabled={!day || chosen.length === 0}
            onClick={() => day && onRepeat(day.key, chosen)}
            className="mt-4"
          >
            {chosen.length === 1 ? "Repeat 1 boat" : `Repeat ${chosen.length} boats`}
          </Button>
        </>
      )}
    </Sheet>
  );
}

/* Picked or not: a filled school-colour circle (a day) or square (a boat)
   with a tick, else an empty outline. */
function Tick({ on, round = false }: { on: boolean; round?: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center border-2 ${
        round ? "rounded-full" : "rounded-md"
      } ${on ? "border-primary bg-primary-live text-primary-contrast" : "border-border bg-surface"}`}
    >
      {on && <IconCheck size={12} />}
    </span>
  );
}

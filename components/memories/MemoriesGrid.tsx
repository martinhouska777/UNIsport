"use client";

import {
  groupByDay,
  groupByMonth,
  type Memory,
} from "@/lib/memories";

/*
  The photo wall. Two ways to look at the same photos:

    "All"     one dense grid of everything, newest first, with a quiet month
              divider — for scrolling back through the whole year.
    "By day"  each training day gets its own headed block ("Today", "Yesterday",
              "Monday 4 August") and its photos sit under it — for finding one
              particular session.

  Only the grouping changes between them, so both modes share one tile.
  Colors are theme tokens (rule 1).
*/

function Tile({
  memory,
  onOpen,
}: {
  memory: Memory;
  onOpen: (memory: Memory) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(memory)}
      aria-label={`Memory from ${memory.date}${memory.gym ? ` at ${memory.gym}` : ""}`}
      className="relative aspect-square overflow-hidden rounded-md border border-border bg-surface-2 press-icon"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={memory.photo} alt="" className="h-full w-full object-cover" />
      {/* The first body part, so a wall of photos still tells you what each one
          was — the whole reason this isn't just a camera roll. A gradient rather
          than a solid bar, so it reads on a bright photo and a dark one. */}
      {memory.trained[0] && (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/85 to-transparent px-1.5 pb-1 pt-4">
          <span className="block truncate text-left text-[11px] font-medium text-text">
            {memory.trained[0]}
          </span>
        </span>
      )}
    </button>
  );
}

export default function MemoriesGrid({
  memories,
  mode,
  onOpen,
}: {
  memories: Memory[];
  mode: "all" | "days";
  onOpen: (memory: Memory) => void;
}) {
  if (mode === "days") {
    return (
      <div className="flex flex-col gap-5 px-3.5 pb-8 pt-3">
        {groupByDay(memories).map((day) => (
          <section key={day.date}>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-[13px] font-semibold text-text">{day.label}</h2>
              <span className="text-[11px] text-muted">
                {/* Whatever was trained that day, deduped across its sessions. */}
                {[...new Set(day.items.flatMap((m) => m.trained))].slice(0, 3).join(" · ")}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {day.items.map((m) => (
                <Tile key={m.id} memory={m} onOpen={onOpen} />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-3.5 pb-8 pt-3">
      {groupByMonth(memories).map((month) => (
        <section key={month.key}>
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            {month.label}
          </h2>
          <div className="grid grid-cols-3 gap-1.5">
            {month.items.map((m) => (
              <Tile key={m.id} memory={m} onOpen={onOpen} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

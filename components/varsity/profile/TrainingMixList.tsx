"use client";

/*
  THE TRAINING MIX — one block, used in both places it appears.
  ---------------------------------------------------------------------------
  The graph says how much you trained. This says what OF: a bar per kind of
  training, biggest first.

  THE WINDOW BELONGS TO WHATEVER IS ABOVE IT.
  On the STATISTICS FULL SCREEN there is a graph right above this block, with
  its dates and its range on it — so the mix simply reads the same window, and
  carries no pill of its own (owner, 2026-09-22: picking three months up top
  has to land on these bars too; a second window here was one window too many).
  In the SHEET off the profile card there is no graph, so nothing else says
  what stretch of days is being read — there the pill stays, and the block
  keeps its own window. Pass rangeKey/onRange to get the pill; leave them out
  and the block is simply whatever rows it was handed.

  NO FIGURES UNDER THE BARS (same day). "42.0 km · 3h 30m · 4 sessions" in grey
  under every bar was more small text than the block could carry; the line
  above the bars says how big the whole thing is, and the calendar says what
  each session was.

  Colours are the calendar's own (lib/varsity/home → kindColor), applied inline
  — per-entity content colour from a data file, the documented exception to
  rule 1.
*/
import { useState } from "react";
import Dropdown from "@/components/varsity/profile/Dropdown";
import { statRanges } from "@/lib/varsity/athleteStats";
import { formatDuration } from "@/lib/varsity/units";
import type { MixRow } from "@/lib/varsity/trainingMix";

export default function TrainingMixList({
  rows,
  rangeKey,
  onRange,
  heading,
}: {
  rows: MixRow[];
  /*
    Which of the ready-made windows the mix is reading, and the pill to change
    it. BOTH OPTIONAL: left out, there is no pill, because something above the
    block (the graph) already says what window this is.
  */
  rangeKey?: string;
  onRange?: (key: string) => void;
  /** The small uppercase label above it. The sheet has a title already. */
  heading?: string;
}) {
  const [open, setOpen] = useState(false);
  const sessions = rows.reduce((s, r) => s + r.sessions, 0);
  const minutes = rows.reduce((s, r) => s + r.minutes, 0);
  const label = statRanges.find((r) => r.key === rangeKey)?.label ?? "2 weeks";
  const ownWindow = rangeKey !== undefined && onRange !== undefined;

  return (
    <div>
      {/* WHAT IT IS, and — only where nothing else says it — OVER WHAT. */}
      <div className="flex items-center justify-between gap-2 pb-2">
        <span className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          {heading ?? "Over"}
        </span>
        {ownWindow && (
          <Dropdown
            label={label}
            align="right"
            options={statRanges.map((r) => ({ key: r.key, label: r.label }))}
            value={rangeKey}
            open={open}
            onOpen={setOpen}
            onPick={onRange}
          />
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface-2 px-4 py-6 text-center text-[12px] text-muted">
          Nothing logged in this window yet.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-surface px-3.5 py-3.5">
          {/* The one line that says how big the whole thing is, so every bar
              below has something to be a share OF. */}
          <div className="text-[11px] text-muted">
            {sessions} session{sessions === 1 ? "" : "s"}
            {minutes > 0 && <> · {formatDuration(Math.round(minutes))}</>}
          </div>

          {rows.map((r) => (
            <div key={r.key}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ background: r.color }}
                  />
                  <span className="truncate text-[13px] font-medium text-text">{r.label}</span>
                </span>
                <span className="flex-shrink-0 text-[12px] font-semibold text-text">
                  {r.share}%
                </span>
              </div>
              {/* A share of 0% still draws a sliver, so a kind you did once
                  doesn't look like a kind you never did. */}
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(2, r.share)}%`, background: r.color }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

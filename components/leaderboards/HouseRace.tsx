"use client";

/*
  THE INTERHOUSE RACE — this month's house event, at the top of the Houses board.
  ---------------------------------------------------------------------------
  The one place a minimum still gates anything. A house needs
  HOUSE_RACE_MIN_ACTIVE people who have trained this month to be IN the race;
  the ones that are, are ranked by how far along the event they are. The ones
  that aren't do not disappear: each reads "Adams needs 2 more active people
  to enter", because a door with a number on it is a reason to drag a friend
  in, and a house that vanished is not.

  Which event is running is decided by the month number (lib/events.ts), the
  counting is db/events.sql, and this only holds the two up against each other.
  Colours are theme tokens; a house's own colour is data from lib/gyms.ts,
  applied inline (rule 1's exception).
*/
import { useEffect, useState, type ReactNode } from "react";
import { HouseShield, IconFlag } from "@/components/icons";
import { houses } from "@/lib/onboarding";
import { groupLabel, houseCrest } from "@/lib/leaderboards";
import {
  houseEventNow,
  houseCanEnter,
  entryLine,
  eventProgress,
  eventDone,
  monthStartIso,
  monthEndsLabel,
  HOUSE_RACE_MIN_ACTIVE,
} from "@/lib/events";
import { fetchHouseEventCounts, type HouseCounts } from "@/lib/supabase/events";

export default function HouseRace({
  /** Renders a Share control for a house that is not in yet (Slice 7 makes it real). */
  renderShare,
}: {
  renderShare?: (houseKey: string) => ReactNode;
}) {
  const event = houseEventNow();
  const [rows, setRows] = useState<HouseCounts[] | null>(null);

  useEffect(() => {
    let active = true;
    fetchHouseEventCounts(monthStartIso(), houses)
      .then((r) => active && setRows(r))
      .catch(() => active && setRows([]));
    return () => {
      active = false;
    };
  }, []);

  // Every house, whether the database knew it or not — a house nobody has
  // joined is a house with zero actives, not a house that isn't there.
  const byKey = new Map((rows ?? []).map((r) => [r.key, r]));
  const all = houses.map(
    (key) =>
      byKey.get(key) ?? {
        key,
        members: 0,
        actives: 0,
        counts: {},
        isMine: false,
      },
  );
  const racing = all
    .filter((h) => houseCanEnter(h.actives))
    .map((h) => ({ ...h, progress: eventProgress(event, h.counts, h.members), done: eventDone(event, h.counts, h.members) }))
    .sort((a, b) => b.progress - a.progress || a.key.localeCompare(b.key));
  const waiting = all
    .filter((h) => !houseCanEnter(h.actives))
    // Closest to the door first — your own house pulled to the top.
    .sort((a, b) => Number(b.isMine) - Number(a.isMine) || b.actives - a.actives || a.key.localeCompare(b.key));

  return (
    <div className="rounded-2xl border border-border bg-surface-2 px-3.5 py-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent-tint text-accent">
          <IconFlag size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Interhouse race · {monthEndsLabel()}
          </div>
          <div className="truncate text-[13px] font-semibold text-text">{event.title}</div>
        </div>
        <div className="flex-shrink-0 text-right text-[11px] text-muted">+{event.points} pts</div>
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
        {event.blurb} A house is in once {HOUSE_RACE_MIN_ACTIVE} of its people have trained this month.
      </p>

      {rows === null ? (
        <div className="py-4 text-center text-[12px] text-muted">Counting…</div>
      ) : (
        <>
          {racing.length > 0 && (
            <div className="mt-2.5 flex flex-col gap-1.5">
              {racing.map((h, i) => {
                const crest = houseCrest(h.key);
                return (
                  <div
                    key={h.key}
                    className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${
                      h.isMine ? "border-primary bg-primary-tint" : "border-border bg-surface"
                    }`}
                    style={crest && !h.isMine ? { borderColor: `${crest.primary}66` } : undefined}
                  >
                    <span className="w-4 text-[11px] font-semibold tabular-nums text-muted">{i + 1}</span>
                    {crest && <HouseShield primary={crest.primary} secondary={crest.secondary} size={24} />}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-text">
                        {groupLabel("house", h.key)}
                        {h.isMine && <span className="ml-1.5 text-[11px] text-primary">Yours</span>}
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-sm bg-border">
                        <span
                          className={`block h-full rounded-sm ${h.done ? "bg-success" : "bg-accent"}`}
                          style={{ width: `${Math.round(h.progress * 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="flex-shrink-0 text-[11px] tabular-nums text-muted">
                      {h.done ? "Done" : `${h.actives}/${h.members} in`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {waiting.length > 0 && (
            <div className="mt-2.5">
              <div className="mb-1 text-[11px] text-muted">
                {racing.length === 0 ? "Nobody is in yet." : "Not in yet"}
              </div>
              <ul className="flex flex-col divide-y divide-border">
                {waiting.map((h) => (
                  <li key={h.key} className="flex items-center gap-2 py-1.5">
                    <span
                      className={`min-w-0 flex-1 truncate text-[12px] ${h.isMine ? "font-medium text-text" : "text-muted"}`}
                    >
                      {entryLine(groupLabel("house", h.key), h.actives)}
                    </span>
                    {renderShare?.(h.key)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

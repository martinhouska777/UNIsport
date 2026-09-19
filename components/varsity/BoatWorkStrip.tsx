"use client";

/*
  WHAT THIS BOAT DID — the strip under the video, on the same card.
  ---------------------------------------------------------------------------
  Two numbers, filled in after the outing: how far this crew went and how long
  they worked. They belong to the BOAT, because the plan is written for the
  squad and the water is not — the eight turns at the bridge and does 14k while
  the four carries on and does 17 — and they count for every person seated in
  it (lib/varsity/boatWork.ts).

  It is built like the video strip directly above it, on purpose: a header row
  that says what is inside and opens on a tap. Shut, it still reads "16 km ·
  1h 30m", because a number you have to open a drawer to see is a number nobody
  checks.

  WHO MAY WRITE IN IT: the coach, from the Lineup Builder, and anybody sitting
  in that boat, from their own Home screen (owner, 2026-09-19). Everyone else
  reads it. The two callers save differently and that is the only fork in here:
  the builder holds the boats in memory and autosaves them itself, so it passes
  `onChange` and this never touches the database; the athlete's card passes no
  `onChange`, and Save writes the one boat through lineupStore → saveBoatWork.

  Colors: theme tokens only.
*/
import { useState } from "react";
import { useUnits } from "@/components/useUnits";
import { IconActivity, IconChevronDown, IconChevronUp } from "@/components/icons";
import {
  boatWorkSummary,
  distanceFieldValue,
  minutesFieldValue,
  parseDistanceField,
  parseMinutesField,
} from "@/lib/varsity/boatWork";
import type { Boat } from "@/lib/varsity/coachLineup";
import { saveBoatWork } from "@/lib/varsity/lineupStore";
import { distanceOptions } from "@/lib/varsity/units";

export type BoatWork = { metres: number | null; minutes: number | null };

/* One typed number. Big enough to hit with a thumb, `text-base` so a phone does
   not zoom the page in when it takes focus (rule 7). */
function WorkField({
  label,
  hint,
  value,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="font-mono text-[10px] font-medium tracking-[0.12em] text-muted">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        inputMode="decimal"
        placeholder={hint}
        className="w-full rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-base text-[14px] font-medium text-text outline-none placeholder:font-normal placeholder:italic placeholder:text-text-3 focus:border-primary-line disabled:opacity-60"
      />
    </label>
  );
}

export default function BoatWorkStrip({
  dayKey,
  boat,
  canEdit = false,
  onChange,
}: {
  dayKey: string;
  boat: Boat;
  /* The coach, or somebody in this crew. Everybody else sees the numbers and
     no fields at all — an outing has one distance, not one per reader. */
  canEdit?: boolean;
  /* Passed by the Lineup Builder, which owns the boats and saves them itself.
     Absent on the athlete's card, where this strip saves the boat on its own. */
  onChange?: (work: BoatWork) => void;
}) {
  const { units } = useUnits();
  const unitLabel = distanceOptions.find((o) => o.key === units.distance)?.short ?? "km";

  const [open, setOpen] = useState(false);
  /* What is in the two fields, as typed. Seeded from the boat and re-seeded
     whenever the saved figures change underneath — a coach editing the same
     practice, or this card's own save coming back. */
  const [dist, setDist] = useState(() => distanceFieldValue(boat.metres, units.distance));
  const [time, setTime] = useState(() => minutesFieldValue(boat.minutes));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* WHAT IS IN THE DATABASE, as far as this strip knows. It starts as the boat
     it was handed and moves on when a save comes back — the `boat` prop is a
     copy taken when the screen loaded and never hears about our own write, so
     comparing against it alone would leave Save lit for ever. */
  const [stored, setStored] = useState<BoatWork>({
    metres: boat.metres ?? null,
    minutes: boat.minutes ?? null,
  });

  /*
    RE-SEEDING THE FIELDS when the figures underneath change — the practice
    finished loading, the coach's builder replaced the boats, or the reader
    switched to miles in Settings. Done DURING the render rather than in an
    effect: an effect here would render once with the stale number and then
    again with the right one, which is both a flicker and the thing
    `react-hooks/set-state-in-effect` exists to stop. This is React's own
    "adjust state when a prop changes" shape — `was` is the last input we
    seeded from, and setting state while rendering simply restarts this render
    before anything reaches the screen.
  */
  const input = {
    metres: boat.metres ?? null,
    minutes: boat.minutes ?? null,
    unit: units.distance,
  };
  const [was, setWas] = useState(input);
  if (was.metres !== input.metres || was.minutes !== input.minutes || was.unit !== input.unit) {
    setWas(input);
    setStored({ metres: input.metres, minutes: input.minutes });
    setDist(distanceFieldValue(input.metres, input.unit));
    setTime(minutesFieldValue(input.minutes));
  }

  const typed: BoatWork = {
    metres: parseDistanceField(dist, units.distance),
    minutes: parseMinutesField(time),
  };
  /* Is what is on screen different from what is stored? Compared on the PARSED
     numbers, so "16" and "16k" are not two different answers and Save does not
     light up because somebody typed a space. */
  const dirty = typed.metres !== stored.metres || typed.minutes !== stored.minutes;

  // The builder autosaves the whole lineup, so there it is enough to report up.
  const edit = (next: { dist?: string; time?: string }) => {
    const d = next.dist ?? dist;
    const t = next.time ?? time;
    if (next.dist !== undefined) setDist(next.dist);
    if (next.time !== undefined) setTime(next.time);
    setError(null);
    if (!onChange) return;
    const work: BoatWork = {
      metres: parseDistanceField(d, units.distance),
      minutes: parseMinutesField(t),
    };
    /* Remember what we just handed up, or the boat coming back down with that
       very number in it would read as a change from outside and re-seed the
       field mid-word — a half-typed "14." parses as nothing, and the field
       would empty itself under the coach's thumb. */
    setWas({ ...work, unit: units.distance });
    setStored(work);
    onChange(work);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    const { error: err } = await saveBoatWork(dayKey, boat.id, typed);
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    setStored(typed);
  };

  const summary = boatWorkSummary(
    { ...boat, metres: typed.metres, minutes: typed.minutes },
    units,
  );

  return (
    <div className="border-t border-border px-3.5 py-2.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-muted"
      >
        <IconActivity size={14} />
        <span className="flex-1 text-left text-[11px] font-semibold uppercase tracking-[0.12em]">
          Distance
        </span>
        {/* SHUT, IT STILL SAYS THE NUMBER. The header is where this is read
            from nine times out of ten; the fields below are for the one person
            who is writing it. */}
        {summary && (
          <span className="flex-shrink-0 font-mono text-[12px] font-medium text-text-2">
            {summary}
          </span>
        )}
        {open ? <IconChevronUp size={13} /> : <IconChevronDown size={13} />}
      </button>

      {open && (
        <div className="mt-2">
          {canEdit ? (
            <>
              <div className="flex items-end gap-2">
                <WorkField
                  label={unitLabel.toUpperCase()}
                  hint="16"
                  value={dist}
                  disabled={saving}
                  onChange={(v) => edit({ dist: v })}
                />
                <WorkField
                  label="TIME"
                  hint="1:30"
                  value={time}
                  disabled={saving}
                  onChange={(v) => edit({ time: v })}
                />
              </div>
              {/* The builder has its own saving indicator and writes on its own;
                  on an athlete's card nothing leaves the phone until this. It
                  appears only when there is something to save — a button that
                  is there for ever, greyed out and saying "Saved", is a bar of
                  colour under every boat saying nothing. */}
              {!onChange && (dirty || saving) && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void save()}
                  className="tap44 mt-2 w-full rounded-lg bg-primary px-2.5 py-2 text-[12px] font-semibold text-primary-contrast disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              )}
              <div className="mt-1.5 text-[11px] italic text-muted">
                What this boat actually did — it counts for everyone in it.
              </div>
            </>
          ) : (
            /* Not your boat: the numbers, or the honest absence of them. */
            <div className="text-[12px] text-muted">
              {summary ?? "Nobody has said how far this boat went yet."}
            </div>
          )}
          {error && <div className="mt-1.5 text-[11px] text-danger">{error}</div>}
        </div>
      )}
    </div>
  );
}

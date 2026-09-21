"use client";

/*
  NOT IN A BOAT — the other side of the coach's lineup sheet.
  ---------------------------------------------------------------------------
  A squad's sheet for a morning has the boats down one side and, down the
  other, everybody who is training somewhere else: a rehab programme, the
  ergs, on their own, or driving the launch. Reading only the boats leaves a
  third of the squad unaccounted for — "am I out or did the coach forget me"
  is exactly the question the group chat exists to ask.

  So All boats ends with one more card, in the same shape as a crew: shut it
  says how many, open it says who and why. It is NOT a boat and is drawn
  nothing like one — a hull with a rehab group in it would read as a crew
  going out.

  Who is out on a day lives in lib/varsity/availabilityStore; the words and
  how loudly to say them are data in lib/varsity/coachLineup (outMeta,
  outTone).
*/
import { useState } from "react";
import { IconChevronDown } from "@/components/icons";
import { outMeta, outTone, rosterById, type OutReason } from "@/lib/varsity/coachLineup";

export type OutPerson = { id: string; name: string; reason: OutReason };

/*
  The day's out list, as people, sorted the way the sheet groups them: the
  spells that run on (injured, sick, Rx) first, then this morning's groups,
  and each group alphabetical. An id with nobody behind it is dropped rather
  than printed raw — a screen should never show a slug.
*/
const ORDER: OutReason[] = ["INJ", "SICK", "RX", "ERG", "OYO", "LAUNCH"];

export function outPeople(out: Record<string, OutReason>): OutPerson[] {
  return Object.entries(out)
    .map(([id, reason]) => ({ id, reason, name: rosterById[id]?.name ?? "" }))
    .filter((p) => p.name)
    .sort(
      (a, b) =>
        ORDER.indexOf(a.reason) - ORDER.indexOf(b.reason) || a.name.localeCompare(b.name),
    );
}

export default function OutOfBoatsCard({
  people,
  defaultOpen = false,
}: {
  people: OutPerson[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (people.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-text">Not in a boat</span>
          {/* Shut, the card says how many and what for, so the day can be
              counted without opening anything. */}
          <span className="block text-[11px] text-muted">
            {people.length} · {summary(people)}
          </span>
        </span>
        <span
          className={`flex-shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          <IconChevronDown size={14} />
        </span>
      </button>

      {open && (
        <ul className="border-t border-border px-2 py-2">
          {people.map((p) => (
            <li key={p.id} className="flex items-center gap-2 px-2 py-2">
              <span className="min-w-0 flex-1 truncate text-[14px] text-text">{p.name}</span>
              <span
                className={`flex-shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium ${
                  outTone[p.reason] === "warn" ? "text-warn" : "text-muted"
                }`}
              >
                {outMeta[p.reason]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* "3 Rx · 3 Erg · 3 OYO · 1 Launch" — the groups in the order above. */
function summary(people: OutPerson[]): string {
  return ORDER.filter((r) => people.some((p) => p.reason === r))
    .map((r) => `${people.filter((p) => p.reason === r).length} ${outMeta[r]}`)
    .join(" · ");
}

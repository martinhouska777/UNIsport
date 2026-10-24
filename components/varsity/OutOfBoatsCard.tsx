"use client";

/*
  NOT IN A BOAT — the other side of the coach's lineup sheet.
  ---------------------------------------------------------------------------
  A squad's sheet for a morning has the boats down one side and, down the
  other, everybody who is training somewhere else: a rehab programme, the
  ergs, on their own, or driving the launch. Reading only the boats leaves a
  third of the squad unaccounted for — "am I out or did the coach forget me"
  is exactly the question the group chat exists to ask.

  So All boats ends with one more card. It is NOT a boat and is drawn nothing
  like one — a hull with a rehab group in it would read as a crew going out.

  BY CATEGORY, LIKE THE SHEET (owner, 2026-10-24: "not in boat make it by
  categories", look C of four): always open, a row per group with the group on
  the left and its names on the right. It used to open from a count ("4 Rx,
  5 Erg") into a list with a tag beside every name.

  Who is out on a day lives in lib/varsity/availabilityStore; the words and
  how loudly to say them are data in lib/varsity/coachLineup (outMeta,
  outTone).
*/
import { outMeta, outTone, rosterById, type OutReason } from "@/lib/varsity/coachLineup";

export type OutPerson = { id: string; name: string; reason: OutReason };

/*
  The groups in the order the sheet has its columns: Launch, the erg, Rx, on
  your own. Injured and sick sit beside Rx, the other spells that keep someone
  off the water; away and missed come last. Each group is alphabetical. An id
  with nobody behind it is dropped rather than printed raw — a screen should
  never show a slug.
*/
const ORDER: OutReason[] = ["LAUNCH", "ERG", "RX", "INJ", "SICK", "OYO", "AWAY", "MISSED"];

export function outPeople(out: Record<string, OutReason>): OutPerson[] {
  return Object.entries(out)
    .map(([id, reason]) => ({ id, reason, name: rosterById[id]?.name ?? "" }))
    .filter((p) => p.name)
    .sort(
      (a, b) =>
        ORDER.indexOf(a.reason) - ORDER.indexOf(b.reason) || a.name.localeCompare(b.name),
    );
}

export default function OutOfBoatsCard({ people }: { people: OutPerson[] }) {
  if (people.length === 0) return null;
  const groups = ORDER.map((reason) => ({
    reason,
    names: people.filter((p) => p.reason === reason).map((p) => p.name),
  })).filter((g) => g.names.length > 0);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="px-4 pt-3 text-[15px] font-semibold text-text">Not in a boat</div>
      <div className="divide-y divide-border px-4 pb-1">
        {groups.map((g) => (
          <div key={g.reason} className="grid grid-cols-[72px_1fr] gap-2 py-2.5">
            <div
              className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${
                outTone[g.reason] === "warn" ? "text-warn" : "text-text"
              }`}
            >
              {outMeta[g.reason]}
            </div>
            <div className="text-[14px] leading-snug text-text">{g.names.join(", ")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

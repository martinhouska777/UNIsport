"use client";

/*
  THE DAY'S SWITCHES — who beat whom (coach console only).
  ---------------------------------------------------------------------------
  One card per switch, in the order they happened: the class and the two
  pieces it was made between, then the answer — "HK beat Dykema · 1.1 s" — and
  under it the numbers it was worked out from, so it can be checked against the
  board: "Grundy was 1.5 s down on Scott, then 2.6 s down."

  A switch the times cannot score says so in a word instead of guessing:
  waiting for a time, or other changes in the same boats (raceSwitch.ts).
  Results are the coach's: a rower never opens this tab. Theme tokens only.
*/
import { IconSwap } from "@/components/icons";
import { rosterById } from "@/lib/varsity/coachLineup";
import { classTitle, type RacePiece } from "@/lib/varsity/racePieces";
import { folkNames, secs, type Switch } from "@/lib/varsity/raceSwitch";

const fullName = (id: string) => rosterById[id]?.name;

/** "1.5 s up on Scott" / "2.6 s down on Scott" — the first boat's lead over the second. */
const leadWords = (lead: number) => (lead >= 0 ? `${secs(lead)} s up` : `${secs(lead)} s down`);

export default function SwitchResults({ switches, pieces }: { switches: Switch[]; pieces: RacePiece[] }) {
  return (
    <div className="mt-3 flex flex-col gap-2">
      {switches.map((s, n) => {
        const [x, y] = s.crews;
        const mine = folkNames(s.moved[0], s.moved[1], fullName);
        const theirs = folkNames(s.moved[1], s.moved[0], fullName);
        const r = s.result;
        return (
          <div key={n} className="rounded-2xl border border-border bg-surface px-3.5 py-3 shadow-card">
            <div className="flex items-center gap-2 text-[11px] text-muted">
              <span className="rounded-md bg-text px-1.5 py-0.5 font-mono text-[11px] font-semibold text-background">
                {classTitle(s.badge)}
              </span>
              <span className="min-w-0 truncate">
                {pieces[s.piece]?.name} → {pieces[s.piece + 1]?.name}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-3">
              <div className="min-w-0 flex-1 text-[14px] text-text">
                {r.kind === "won" ? (
                  <>
                    <span className="font-semibold">{folkNames(r.winners, r.losers, fullName)}</span>
                    <span className="text-muted"> beat </span>
                    {folkNames(r.losers, r.winners, fullName)}
                  </>
                ) : (
                  <span className="inline-flex flex-wrap items-center gap-x-1.5 font-semibold text-danger">
                    {mine}
                    <IconSwap size={13} />
                    {theirs}
                  </span>
                )}
              </div>
              <span className="flex-shrink-0 text-[14px] font-semibold tabular-nums text-text">
                {r.kind === "won" ? `${secs(r.by)} s` : r.kind === "level" ? "Level" : "—"}
              </span>
            </div>

            {(r.kind === "won" || r.kind === "level") && s.lead.before != null && s.lead.after != null && (
              <div className="mt-1 text-[12px] leading-snug text-muted">
                {x} was {leadWords(s.lead.before)} on {y}, then {leadWords(s.lead.after)}.
              </div>
            )}
            {r.kind === "pending" && (
              <div className="mt-1 text-[12px] leading-snug text-muted">Waiting for the times.</div>
            )}
            {r.kind === "mixed" && (
              <div className="mt-1 text-[12px] leading-snug text-muted">
                Other changes in these boats, so the times cannot say.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
